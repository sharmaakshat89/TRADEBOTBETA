import NodeCache from 'node-cache';

const livePositionCache = new NodeCache({ stdTTL: 60 * 60 * 24 * 14, useClones: false });

const roundNumber = (value, decimals = 4) => {
	if (!Number.isFinite(value)) return null;
	return Number(value.toFixed(decimals));
};

const safeNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildExecutionSignal = (quantSignal, candles, indicators, key) => {
	const latestCandle = candles.at(-1);
	const latestPrice = safeNumber(latestCandle?.close, null);
	const latestHigh = safeNumber(latestCandle?.high, null);
	const latestLow = safeNumber(latestCandle?.low, null);
	const previousCandle = candles.at(-2);
	const previousClose = safeNumber(previousCandle?.close, null);
	const trend = safeNumber(quantSignal?.indicators?.trend, null);
	const fast = safeNumber(quantSignal?.indicators?.fast, null);
	const medium = safeNumber(quantSignal?.indicators?.medium, null);
	const atr14 = safeNumber(quantSignal?.indicators?.atr14, null);
	const openPosition = key ? livePositionCache.get(key) : null;

	let signal = quantSignal.signal;
	let score = quantSignal.score;
	let executionState = openPosition ? 'IN_POSITION' : 'FLAT';

	if (openPosition) {
		const bearishMomentum =
			Number.isFinite(latestPrice) &&
			Number.isFinite(previousClose) &&
			Number.isFinite(atr14) &&
			latestPrice < previousClose &&
			previousClose - latestPrice > 0.3 * atr14;

		const bearishStructure =
			Number.isFinite(latestPrice) &&
			Number.isFinite(trend) &&
			Number.isFinite(fast) &&
			Number.isFinite(medium) &&
			latestPrice < trend &&
			fast < medium;

		const hitStop =
			Number.isFinite(latestLow) &&
			Number.isFinite(openPosition.stopLoss) &&
			latestLow <= openPosition.stopLoss;

		const hitTakeProfit =
			Number.isFinite(latestHigh) &&
			Number.isFinite(openPosition.takeProfit) &&
			latestHigh >= openPosition.takeProfit;

		if (bearishMomentum && bearishStructure || hitStop || hitTakeProfit) {
			signal = 'SELL';
			score = -1;
			executionState = 'EXIT';
			livePositionCache.del(key);
		} else {
			signal = 'NO_TRADE';
			score = 0;
			executionState = 'IN_POSITION';
		}
	} else if (quantSignal.signal === 'BUY') {
		executionState = 'ENTRY';
		livePositionCache.set(key, {
			entryPrice: roundNumber(latestPrice),
			stopLoss: safeNumber(quantSignal?.risk?.stopLoss, null),
			takeProfit: safeNumber(quantSignal?.risk?.takeProfit, null),
			openedAt: latestCandle?.time ?? latestCandle?.closeTime ?? Date.now()
		});
	}

	return {
		...quantSignal,
		signal,
		score,
		context: {
			...(quantSignal.context ?? {}),
			executionState,
			hasOpenPosition: Boolean(livePositionCache.get(key))
		}
	};
};
