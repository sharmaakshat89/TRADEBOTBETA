import { runBacktestService } from '../services/backtest.service.js';
import {
    ALLOWED_INTERVALS,
    ALLOWED_SYMBOLS,
    getFeasibleBacktestLookbacks,
    validateBacktestLookback,
    validateSymbolAndInterval
} from '../../market/market.constants.js';

export const runBacktestController = async (req, res) => {
    const { symbol, interval, lookback, config, configurations, runBatchBacktest, maxConfigs } =
        req.body ?? {};

    try {
        const { symbol: cleanSymbol, interval: cleanInterval } = validateSymbolAndInterval(
            symbol,
            interval
        );
        const cleanLookback = validateBacktestLookback(lookback, cleanInterval);

        const result = await runBacktestService(cleanSymbol, cleanInterval, cleanLookback, {
            config,
            configurations,
            runBatchBacktest,
            maxConfigs
        });

        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || 'Backtest failed - please try again',
            allowedSymbols: err.allowedSymbols ?? ALLOWED_SYMBOLS,
            allowedIntervals: err.allowedIntervals ?? ALLOWED_INTERVALS,
            allowedLookbacks: err.allowedLookbacks ?? getFeasibleBacktestLookbacks(interval ?? '1h')
        });
    }
};
