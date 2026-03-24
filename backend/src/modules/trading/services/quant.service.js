import { ADX, ATR, BollingerBands, EMA, RSI } from 'technicalindicators';
import NodeCache from 'node-cache';

const signalCache = new NodeCache({ stdTTL: 60 });
const MIN_WARMUP_CANDLES = 150;
const ADX_REGIME_THRESHOLD = 22;
const BUY_THRESHOLD = 0.5;
const SELL_THRESHOLD = -0.5;
const FUNDING_NORMALIZER = 0.01;

const roundNumber = (value, decimals = 4) => {
    if (!Number.isFinite(value)) return null;
    return Number(value.toFixed(decimals));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const safeSign = (value) => (value > 0 ? 1 : value < 0 ? -1 : 0);

const buildAlignedSeries = (length, offset, values, selector = (value) => value, fallback = null) => {
    const aligned = Array.from({ length }, () => fallback);
    values.forEach((value, index) => {
        const targetIndex = index + offset;
        if (targetIndex >= 0 && targetIndex < length) {
            aligned[targetIndex] = selector(value);
        }
    });
    return aligned;
};

const percentile = (values, q) => {
    const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!clean.length) return null;
    const index = Math.min(clean.length - 1, Math.max(0, Math.floor((clean.length - 1) * q)));
    return clean[index];
};

const computeStructure = (candles, index) => {
    if (index < 2) return 0;
    const first = candles[index - 2];
    const second = candles[index - 1];
    const third = candles[index];

    const higherHighs = second.high > first.high && third.high > second.high;
    const higherLows = second.low > first.low && third.low > second.low;
    if (higherHighs && higherLows) return 1;

    const lowerHighs = second.high < first.high && third.high < second.high;
    const lowerLows = second.low < first.low && third.low < second.low;
    if (lowerHighs && lowerLows) return -1;

    return 0;
};

export const getRegime = ({ adx, bbWidthSeries, index }) => {
    if (!Number.isFinite(adx) || adx <= ADX_REGIME_THRESHOLD) {
        return { regime: 'NO_TRADE', isTrend: false, squeezeCutoff: null, bbWidth: null };
    }

    const trailingWidths = bbWidthSeries.slice(Math.max(0, index - 99), index + 1);
    const squeezeCutoff = percentile(trailingWidths, 0.2);
    const bbWidth = bbWidthSeries[index];

    if (Number.isFinite(bbWidth) && Number.isFinite(squeezeCutoff) && bbWidth < squeezeCutoff) {
        return {
            regime: 'NO_TRADE',
            isTrend: false,
            squeezeCutoff: roundNumber(squeezeCutoff, 6),
            bbWidth: roundNumber(bbWidth, 6)
        };
    }

    return {
        regime: 'TREND',
        isTrend: true,
        squeezeCutoff: roundNumber(squeezeCutoff, 6),
        bbWidth: roundNumber(bbWidth, 6)
    };
};

export const getSignalScore = ({ price, ema50, rsi, adx, atr14, atr50, structure }) => {
    const trendInput = ema50 ? clamp((price - ema50) / ema50, -5, 5) : 0;
    const T_t = Math.tanh(trendInput);
    const M_t = clamp((safeNumber(rsi, 50) - 50) / 50, -1, 1);
    const S_t = clamp(safeNumber(structure, 0), -1, 1);
    const volatilityInput = atr50 > 0 ? (atr14 / atr50) - 1 : 0;
    const V_t = Math.tanh(clamp(volatilityInput, -5, 5));

    let TS_t = 0;
    if (adx > 30) TS_t = 1;
    else if (adx > 20) TS_t = (adx - 20) / 10;

    const score =
        (0.3 * T_t) +
        (0.25 * M_t) +
        (0.2 * S_t) +
        (0.15 * V_t) +
        (0.1 * TS_t);

    return {
        score,
        components: {
            trend: roundNumber(T_t, 4),
            momentum: roundNumber(M_t, 4),
            structure: roundNumber(S_t, 4),
            volatility: roundNumber(V_t, 4),
            trendStrength: roundNumber(TS_t, 4)
        }
    };
};

export const getContextFilter = ({ score, fundingRate }) => {
    const normalizedFunding = clamp(safeNumber(fundingRate, 0) / FUNDING_NORMALIZER, -1, 1);
    const phi = 1 - safeSign(score) * normalizedFunding;

    return {
        fundingRate: safeNumber(fundingRate, 0),
        normalizedFunding,
        phi
    };
};

export const getFinalSignal = ({ score, regime, phi }) => {
    if (regime !== 'TREND' || !Number.isFinite(phi) || phi <= 0) {
        return 'NO_TRADE';
    }

    if (score > BUY_THRESHOLD) return 'BUY';
    if (score < SELL_THRESHOLD) return 'SELL';
    return 'NO_TRADE';
};

const buildIndicatorSeries = (candles) => {
    const close = candles.map((candle) => safeNumber(candle.close));
    const high = candles.map((candle) => safeNumber(candle.high));
    const low = candles.map((candle) => safeNumber(candle.low));

    const ema50Values = EMA.calculate({ period: 50, values: close });
    const rsiValues = RSI.calculate({ period: 14, values: close });
    const atr14Values = ATR.calculate({ period: 14, high, low, close });
    const atr50Values = ATR.calculate({ period: 50, high, low, close });
    const adxValues = ADX.calculate({ period: 14, high, low, close });
    const bbValues = BollingerBands.calculate({ period: 20, values: close, stdDev: 2 });

    const ema50 = buildAlignedSeries(candles.length, 49, ema50Values);
    const rsi14 = buildAlignedSeries(candles.length, 14, rsiValues);
    const atr14 = buildAlignedSeries(candles.length, 14, atr14Values);
    const atr50 = buildAlignedSeries(candles.length, 50, atr50Values);
    const adx14 = buildAlignedSeries(candles.length, 27, adxValues, (value) => safeNumber(value?.adx));
    const bbWidth = buildAlignedSeries(
        candles.length,
        19,
        bbValues,
        (value) => {
            const middle = safeNumber(value?.middle);
            if (!middle) return null;
            return (safeNumber(value?.upper) - safeNumber(value?.lower)) / middle;
        }
    );
    const structure = candles.map((_, index) => computeStructure(candles, index));
    const funding = candles.map((candle) => safeNumber(candle.fundingRate, 0));

    return { ema50, rsi14, atr14, atr50, adx14, bbWidth, structure, funding };
};

export const getUnifiedSignal = (symbol, interval, candles) => {
    if (!Array.isArray(candles) || candles.length < MIN_WARMUP_CANDLES) {
        return {
            success: false,
            error: `Insufficient data for warm-up (Need ${MIN_WARMUP_CANDLES}+)`
        };
    }

    const latestTime = candles.at(-1)?.time;
    const cacheKey = `sig_v2_${symbol}_${interval}_${latestTime}_${candles.length}`;
    const cached = signalCache.get(cacheKey);
    if (cached) return cached;

    try {
        const series = buildIndicatorSeries(candles);
        const index = candles.length - 1;
        const latestCandle = candles[index];
        const ema50 = safeNumber(series.ema50[index], latestCandle.close);
        const rsi = safeNumber(series.rsi14[index], 50);
        const adx = safeNumber(series.adx14[index], 0);
        const atr14 = safeNumber(series.atr14[index], 0);
        const atr50 = safeNumber(series.atr50[index], atr14 || 1);
        const structure = safeNumber(series.structure[index], 0);
        const fundingRate = safeNumber(series.funding[index], 0);

        const regimeState = getRegime({
            adx,
            bbWidthSeries: series.bbWidth,
            index
        });
        const scoreState = getSignalScore({
            price: safeNumber(latestCandle.close),
            ema50,
            rsi,
            adx,
            atr14,
            atr50,
            structure
        });
        const contextState = getContextFilter({
            score: scoreState.score,
            fundingRate
        });
        const signal = getFinalSignal({
            score: scoreState.score,
            regime: regimeState.regime,
            phi: contextState.phi
        });

        const direction = signal === 'SELL' ? -1 : 1;
        const stopLoss = atr14 > 0 ? safeNumber(latestCandle.close) - direction * (1.8 * atr14) : null;
        const takeProfit = atr14 > 0 ? safeNumber(latestCandle.close) + direction * (2.5 * atr14) : null;

        const result = {
            success: true,
            signal,
            score: roundNumber(scoreState.score, 4),
            regime: regimeState.regime,
            context: {
                phi: roundNumber(contextState.phi, 4),
                normalizedFunding: roundNumber(contextState.normalizedFunding, 4),
                squeezeCutoff: regimeState.squeezeCutoff,
                bbWidth: regimeState.bbWidth
            },
            risk: {
                stopLoss: roundNumber(stopLoss, 4),
                takeProfit: roundNumber(takeProfit, 4),
                timeStopCandles: 8,
                triggerFraction: 0.5
            },
            indicators: {
                ema50: roundNumber(ema50, 4),
                rsi: roundNumber(rsi, 2),
                adx: roundNumber(adx, 2),
                atr14: roundNumber(atr14, 4),
                atr50: roundNumber(atr50, 4),
                structure,
                fundingRate: roundNumber(fundingRate, 6)
            },
            components: scoreState.components,
            indicatorSeries: {
                ema50: series.ema50.map((value) => roundNumber(value, 4))
            },
            timestamp: Date.now()
        };

        signalCache.set(cacheKey, result);
        return result;
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Signal computation failed'
        };
    }
};
