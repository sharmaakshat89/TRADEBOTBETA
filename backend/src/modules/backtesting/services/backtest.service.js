import fs from 'fs/promises';
import path from 'path';
import NodeCache from 'node-cache';
import {
    ALLOWED_INTERVALS,
    ALLOWED_SYMBOLS,
    getEstimatedCandleCount,
    getFeasibleBacktestLookbacks
} from '../../market/market.constants.js';
import { fetchMarketData } from '../../market/services/market.service.js';
import { runBacktest } from '../engine/backtest.engine.js';

const backtestCache = new NodeCache({ stdTTL: 3600 });
const MIN_CANDLES_REQUIRED = 151;
const DEFAULT_MAX_CONFIGS = 25;
const RESULTS_FILE = path.resolve(process.cwd(), 'backtest_results.json');

const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeConfig = (config = {}) => ({
    scoreThreshold: safeNumber(config.scoreThreshold, 0.5),
    stopLossAtrMultiplier: safeNumber(config.stopLossAtrMultiplier, 1.8),
    takeProfitAtrMultiplier: safeNumber(config.takeProfitAtrMultiplier, 2.5),
    timeStopCandles: Math.max(1, Math.round(safeNumber(config.timeStopCandles, 8))),
    triggerFraction: Math.max(0, safeNumber(config.triggerFraction, 0.5))
});

const sanitizeRunForExport = (run) => ({
    config: run.config,
    metrics: run.metrics
});

const writeResultsFile = async ({ symbol, interval, lookback, runs }) => {
    const payload = {
        symbol,
        interval,
        lookback,
        generatedAt: new Date().toISOString(),
        runs: runs.map(sanitizeRunForExport)
    };

    await fs.writeFile(RESULTS_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    return RESULTS_FILE;
};

const getOutputSizeForLookback = (interval, lookback) => {
    const estimatedCandles = getEstimatedCandleCount(interval, lookback);
    return Math.max(estimatedCandles + 50, MIN_CANDLES_REQUIRED);
};

const buildRunList = (options = {}) => {
    const defaultConfig = sanitizeConfig(options.config);
    const requestedConfigs = Array.isArray(options.configurations)
        ? options.configurations.map(sanitizeConfig)
        : [];

    if (!options.runBatchBacktest || !requestedConfigs.length) {
        return [defaultConfig];
    }

    const maxConfigs = Math.max(1, Math.min(DEFAULT_MAX_CONFIGS, Math.round(safeNumber(options.maxConfigs, DEFAULT_MAX_CONFIGS))));
    return requestedConfigs.slice(0, maxConfigs);
};

export const runBacktestService = async (symbol, interval, lookback = '6M', options = {}) => {
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

        const feasibleLookbacks = getFeasibleBacktestLookbacks(interval);
        if (!feasibleLookbacks.includes(lookback)) {
            const error = new Error(`Invalid lookback: ${lookback}. Allowed: ${feasibleLookbacks.join(', ')}`);
            error.statusCode = 400;
            error.allowedLookbacks = feasibleLookbacks;
            throw error;
        }

        const runConfigs = buildRunList(options);
        const cacheKey = `backtest_${symbol}_${interval}_${lookback}_${JSON.stringify(runConfigs)}`;
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

        const runs = runConfigs.map((config) => runBacktest(symbol, interval, candles, config));
        const primaryRun = runs[0];
        const exportedTo = await writeResultsFile({ symbol, interval, lookback, runs });

        const enrichedResult = {
            ...primaryRun,
            symbol,
            interval,
            lookback,
            requestedCandles: outputsize,
            candlesAnalyzed: candles.length,
            dataFrom: new Date(candles[0].time * 1000).toISOString(),
            dataTo: new Date(candles[candles.length - 1].time * 1000).toISOString(),
            generatedAt: new Date().toISOString(),
            parameterRuns: runs.map(sanitizeRunForExport),
            batch: {
                runBatchBacktest: Boolean(options.runBatchBacktest),
                totalRuns: runs.length,
                maxConfigs: options.maxConfigs ?? null
            },
            export: {
                format: 'json',
                file: exportedTo
            }
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
