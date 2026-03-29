import NodeCache from 'node-cache';
import { ADX, ATR, EMA } from 'technicalindicators';

export const MIN_WARMUP_CANDLES = 150;

const ALMA_OFFSET = 0.85;
const ALMA_SIGMA = 6;
const livePositionCache = new NodeCache({ stdTTL: 60 * 60 * 24 * 14, useClones: false });

const roundNumber = (value, decimals = 4) => {
	if (!Number.isFinite(value)) return null;
	return Number(value.toFixed(decimals));
};

const safeNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const padAlignedSeries = (values, targetLength) => {
	const padding = Math.max(0, targetLength - values.length);
	return Array(padding)
		.fill(null)
		.concat(values.map((value) => safeNumber(value, null)));
};

const calculateWmaSeries = (values, period) => {
	const result = Array(values.length).fill(null);
	const denominator = (period * (period + 1)) / 2;

	for (let i = period - 1; i < values.length; i += 1) {
		let weightedSum = 0;
		let valid = true;

		for (let j = 0; j < period; j += 1) {
			const currentValue = values[i - period + 1 + j];
			if (!Number.isFinite(currentValue)) {
				valid = false;
				break;
			}

			weightedSum += currentValue * (j + 1);
		}

		if (valid) {
			result[i] = weightedSum / denominator;
		}
	}

	return result;
};

const calculateHmaSeries = (values, period) => {
	const halfPeriod = Math.max(1, Math.floor(period / 2));
	const sqrtPeriod = Math.max(1, Math.round(Math.sqrt(period)));

	const halfWma = calculateWmaSeries(values, halfPeriod);
	const fullWma = calculateWmaSeries(values, period);
	const diffSeries = values.map((_, index) => {
		if (!Number.isFinite(halfWma[index]) || !Number.isFinite(fullWma[index])) {
			return null;
		}

		return 2 * halfWma[index] - fullWma[index];
	});

	return calculateWmaSeries(diffSeries, sqrtPeriod);
};

const calculateAlmaSeries = (values, period, offset = ALMA_OFFSET, sigma = ALMA_SIGMA) => {
	const result = Array(values.length).fill(null);
	const m = offset * (period - 1);
	const s = period / sigma;

	const weights = [];
	let totalWeight = 0;

	for (let i = 0; i < period; i += 1) {
		const weight = Math.exp(-((i - m) ** 2) / (2 * s * s));
		weights.push(weight);
		totalWeight += weight;
	}

	for (let i = period - 1; i < values.length; i += 1) {
		let weightedSum = 0;
		let valid = true;

		for (let j = 0; j < period; j += 1) {
			const currentValue = values[i - period + 1 + j];
			if (!Number.isFinite(currentValue)) {
				valid = false;
				break;
			}

			weightedSum += currentValue * weights[j];
		}

		if (valid) {
			result[i] = weightedSum / totalWeight;
		}
	}

	return result;
};

const getIndicatorSet = (indicators, indicatorMode = 'EMA') =>
	indicators.modes[indicatorMode] ?? indicators.modes.EMA;

const calculateRollingMedian = (values, period) => {
	const result = Array(values.length).fill(null);

	for (let i = period - 1; i < values.length; i += 1) {
		const window = values.slice(i - period + 1, i + 1).filter((value) => Number.isFinite(value));
		if (!window.length) continue;

		const sorted = [...window].sort((left, right) => left - right);
		const mid = Math.floor(sorted.length / 2);
		result[i] =
			sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	}

	return result;
};

export const buildLadderIndicators = (candles) => {
	const close = candles.map((candle) => safeNumber(candle.close));
	const high = candles.map((candle) => safeNumber(candle.high));
	const low = candles.map((candle) => safeNumber(candle.low));

	const atr14 = padAlignedSeries(ATR.calculate({ period: 14, high, low, close }), candles.length);

	return {
		adx: padAlignedSeries(
			ADX.calculate({ period: 14, high, low, close }).map((value) => value.adx),
			candles.length
		),
		atr14,
		atr14Median: calculateRollingMedian(atr14, 20),
		modes: {
			EMA: {
				fast: padAlignedSeries(EMA.calculate({ period: 9, values: close }), candles.length),
				medium: padAlignedSeries(EMA.calculate({ period: 11, values: close }), candles.length),
				trend: padAlignedSeries(EMA.calculate({ period: 45, values: close }), candles.length)
			},
			HMA_ALMA: {
				fast: calculateHmaSeries(close, 9),
				medium: calculateHmaSeries(close, 11),
				trend: calculateAlmaSeries(close, 45)
			}
		}
	};
};

const getRegimeState = (trendSeries, adxSeries, atr14MedianSeries, i, regimeFilter, regimeK = 0.1) => {
	if (!regimeFilter) {
		return true;
	}

	const trendValue = trendSeries[i];
	const previousTrendValue = i >= 46 ? trendSeries[i - 46] : null;
	const adx = adxSeries[i];
	const atrMedian = atr14MedianSeries[i];

	if (
		!Number.isFinite(trendValue) ||
		!Number.isFinite(previousTrendValue) ||
		!Number.isFinite(adx) ||
		!Number.isFinite(atrMedian)
	) {
		return false;
	}

	const emaSlope = trendValue - previousTrendValue;
	return adx > 23 && Math.abs(emaSlope) > regimeK * atrMedian;
};

export const getSignal = (candles, indicators, i, config = {}) => {
	if (i < MIN_WARMUP_CANDLES) {
		return { success: false };
	}

	try {
		const indicatorMode = config.indicatorMode ?? 'EMA';
		const regimeFilter = config.regimeFilter ?? true;
		const regimeK = config.regimeK ?? 0.1;
		const slMultiplier = config.slMultiplier ?? 1.0;
		const positionKey = config.positionKey ?? null;
		const indicatorSet = getIndicatorSet(indicators, indicatorMode);

		const price = safeNumber(candles[i]?.close, null);
		const prevClose = safeNumber(candles[i - 1]?.close, null);
		const prevHigh = safeNumber(candles[i - 1]?.high, null);
		const prevLow = safeNumber(candles[i - 1]?.low, null);

		const trend = indicatorSet.trend[i];
		const fast = indicatorSet.fast[i];
		const medium = indicatorSet.medium[i];
		const adx = indicators.adx[i];
		const atr14 = indicators.atr14[i];

		if (
			!Number.isFinite(price) ||
			!Number.isFinite(prevClose) ||
			!Number.isFinite(prevHigh) ||
			!Number.isFinite(prevLow) ||
			!Number.isFinite(trend) ||
			!Number.isFinite(fast) ||
			!Number.isFinite(medium) ||
			!Number.isFinite(adx) ||
			!Number.isFinite(atr14)
		) {
			return { success: false };
		}

		const isTrend = getRegimeState(
			indicatorSet.trend,
			indicators.adx,
			indicators.atr14Median,
			i,
			regimeFilter,
			regimeK
		);

		const momentumUp = price > prevClose && price - prevClose > 0.3 * atr14;
		const momentumDown = price < prevClose && prevClose - price > 0.3 * atr14;
		const breakoutUp = price > prevHigh;
		const breakdownDown = price < prevLow;

		const buffer = 0.4 * atr14;
		const useLadder = adx > 26;
		const tpMultiplier = adx > 30 ? 4 : 3;
		const defaultStopLoss = trend - slMultiplier * atr14;
		const defaultTakeProfit = price + tpMultiplier * atr14;

		const openPosition = positionKey ? livePositionCache.get(positionKey) : null;
		let signal = 'NO_TRADE';
		let direction = 0;
		let stopLoss = defaultStopLoss;
		let takeProfit = defaultTakeProfit;

		if (openPosition) {
			stopLoss = safeNumber(openPosition.stopLoss, defaultStopLoss);
			takeProfit = safeNumber(openPosition.takeProfit, defaultTakeProfit);

			const shouldSell =
				breakdownDown ||
				(price < trend && fast < medium && momentumDown) ||
				price <= stopLoss ||
				price >= takeProfit;

			if (shouldSell) {
				signal = 'SELL';
				direction = -1;
				livePositionCache.del(positionKey);
			}
		} else if (isTrend) {
			const isBull = (price > trend && fast > medium && momentumUp) || breakoutUp;
			if (isBull) {
				signal = 'BUY';
				direction = 1;
				stopLoss = defaultStopLoss;
				takeProfit = defaultTakeProfit;

				if (positionKey) {
					livePositionCache.set(positionKey, {
						entryPrice: roundNumber(price),
						stopLoss: roundNumber(stopLoss),
						takeProfit: roundNumber(takeProfit),
						openedAt: candles[i]?.time ?? candles[i]?.closeTime ?? Date.now()
					});
				}
			}
		}

		const limitPrice = price - direction * buffer;
		const tp1 =
			direction === 0 ? null : roundNumber(price + direction * 2 * atr14);

		const entries =
			signal === 'BUY'
				? useLadder
					? [
							{ type: 'MARKET', price: roundNumber(price), qtyPct: 0.7 },
							{ type: 'LIMIT', price: roundNumber(limitPrice), qtyPct: 0.2 },
							{ type: 'LIMIT', price: roundNumber(price - direction * 0.5 * atr14), qtyPct: 0.1 }
						]
					: [{ type: 'MARKET', price: roundNumber(price), qtyPct: 1.0 }]
				: signal === 'SELL'
					? [{ type: 'MARKET', price: roundNumber(price), qtyPct: 1.0 }]
					: [];

		return {
			success: true,
			signal,
			score: signal === 'BUY' ? 1 : signal === 'SELL' ? -1 : 0,
			regime: isTrend ? 'TREND' : 'NO_TRADE',
			context: {
				phi: signal !== 'NO_TRADE' ? 1 : 0,
				hasOpenPosition: Boolean(positionKey ? livePositionCache.get(positionKey) : openPosition)
			},
			risk: {
				stopLoss: roundNumber(stopLoss),
				takeProfit: roundNumber(takeProfit),
				tp1,
				timeStopCandles: 9,
				triggerFraction: 0.5
			},
			indicators: {
				adx: roundNumber(adx),
				atr14: roundNumber(atr14),
				trend: roundNumber(trend),
				fast: roundNumber(fast),
				medium: roundNumber(medium)
			},
			timestamp: candles[i]?.time ?? candles[i]?.closeTime ?? i,
			entries
		};
	} catch {
		return { success: false };
	}
};
