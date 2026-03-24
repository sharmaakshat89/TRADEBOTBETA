import { runBacktestService } from '../services/backtest.service.js';
import {
    ALLOWED_INTERVALS,
    ALLOWED_SYMBOLS,
    BACKTEST_LOOKBACKS,
    validateBacktestLookback,
    validateSymbolAndInterval
} from '../../market/market.constants.js';

export const runBacktestController = async (req, res) => {
    try {
        const { symbol, interval, lookback } = req.body;
        const { symbol: cleanSymbol, interval: cleanInterval } = validateSymbolAndInterval(
            symbol,
            interval
        );
        const cleanLookback = validateBacktestLookback(lookback);

        const result = await runBacktestService(cleanSymbol, cleanInterval, cleanLookback);

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
            allowedLookbacks: err.allowedLookbacks ?? BACKTEST_LOOKBACKS
        });
    }
};
