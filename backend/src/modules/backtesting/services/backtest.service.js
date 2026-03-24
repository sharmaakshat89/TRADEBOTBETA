import NodeCache from 'node-cache';
import {
    ALLOWED_INTERVALS,
    ALLOWED_SYMBOLS,
    BACKTEST_LOOKBACKS
} from '../../market/market.constants.js';
import { fetchMarketData } from '../../market/services/market.service.js';
import { runBacktest } from '../engine/backtest.engine.js';

const backtestCache = new NodeCache({ stdTTL: 3600 });
const MIN_CANDLES_REQUIRED = 151;

const LOOKBACK_MONTHS = {
    '3M': 3,
    '6M': 6,
    '12M': 12
};

const HOURS_PER_INTERVAL = {
    '1h': 1,
    '4h': 4,
    '1day': 24
};

const getOutputSizeForLookback = (interval, lookback) => {
    const months = LOOKBACK_MONTHS[lookback] ?? 6;
    const hoursPerBar = HOURS_PER_INTERVAL[interval] ?? 24;
    const estimatedCandles = Math.ceil((months * 30 * 24) / hoursPerBar);
    return Math.max(estimatedCandles + 50, MIN_CANDLES_REQUIRED);
};

export const runBacktestService = async (symbol, interval, lookback = '6M') => {
    try {
        if (!ALLOWED_SYMBOLS.includes(symbol)) {
            const error = new Error(`Invalid symbol: ${symbol}. Allowed: ${ALLOWED_SYMBOLS.join(', ')}`);
            error.statusCode = 400;
            throw error;
        }

        if (!ALLOWED_INTERVALS.includes(interval)) {
            const error = new Error(`Invalid interval: ${interval}. Allowed: ${ALLOWED_INTERVALS.join(', ')}`);
            error.statusCode = 400;
            throw error;
        }

        if (!BACKTEST_LOOKBACKS.includes(lookback)) {
            const error = new Error(`Invalid lookback: ${lookback}. Allowed: ${BACKTEST_LOOKBACKS.join(', ')}`);
            error.statusCode = 400;
            error.allowedLookbacks = BACKTEST_LOOKBACKS;
            throw error;
        }

        const cacheKey = `backtest_${symbol}_${interval}_${lookback}`;
        const cached = backtestCache.get(cacheKey);
        if (cached) {
            console.log(`[BacktestService] Cache HIT - ${cacheKey}`);
            return { success: true, data: cached, source: 'cache' };
        }

        const outputsize = getOutputSizeForLookback(interval, lookback);
        const marketResult = await fetchMarketData(symbol, interval, outputsize);
        if (!marketResult.success || !marketResult.data) {
            const error = new Error('Failed to fetch market data for backtesting');
            error.statusCode = 502;
            throw error;
        }

        const candles = marketResult.data;
        if (candles.length < MIN_CANDLES_REQUIRED) {
            const error = new Error(
                `Insufficient data: got ${candles.length}, need ${MIN_CANDLES_REQUIRED}+`
            );
            error.statusCode = 422;
            throw error;
        }

        const backtestResult = runBacktest(symbol, interval, candles);
        const enrichedResult = {
            ...backtestResult,
            symbol,
            interval,
            lookback,
            requestedCandles: outputsize,
            candlesAnalyzed: candles.length,
            dataFrom: new Date(candles[0].time * 1000).toISOString(),
            dataTo: new Date(candles[candles.length - 1].time * 1000).toISOString(),
            generatedAt: new Date().toISOString()
        };

        backtestCache.set(cacheKey, enrichedResult);
        return { success: true, data: enrichedResult, source: 'api' };
    } catch (error) {
        console.error(`[BacktestService] ERROR: ${error.message}`, {
            symbol,
            interval,
            statusCode: error.statusCode
        });
        if (!error.statusCode) error.statusCode = 500;
        throw error;
    }
};

export const invalidateBacktestCache = (symbol, interval) => {
    const key = `backtest_${symbol}_${interval}`;
    backtestCache.del(key);
};
