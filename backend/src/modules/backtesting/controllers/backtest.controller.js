import { runBacktestService } from '../services/backtest.service.js';
import {
    ALLOWED_INTERVALS,
    ALLOWED_SYMBOLS,
    BACKTEST_LOOKBACKS,
    BACKTEST_MODES,
    validateBacktestMode,
    validateBacktestLookback,
    validateSymbolAndInterval
} from '../../market/market.constants.js';

export const runBacktestController = async (req, res) => {
    try {
        const { symbol, interval, lookback, mode } = req.body;
        const { symbol: cleanSymbol, interval: cleanInterval } = validateSymbolAndInterval(
            symbol,
            interval
        );
        const cleanLookback = validateBacktestLookback(lookback);
        const cleanMode = validateBacktestMode(mode);

        console.log(
            `[BacktestController] Request - symbol: ${cleanSymbol}, interval: ${cleanInterval}, lookback: ${cleanLookback}, mode: ${cleanMode}, user: ${req.user?.email ?? 'unknown'}`
        );

        const result = await runBacktestService(cleanSymbol, cleanInterval, cleanLookback, cleanMode);

        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (err) {
        console.error(`[BacktestController] ERROR - ${err.message}`, {
            statusCode: err.statusCode,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });

        return res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || 'Backtest failed - please try again',
            allowedSymbols: err.allowedSymbols ?? ALLOWED_SYMBOLS,
            allowedIntervals: err.allowedIntervals ?? ALLOWED_INTERVALS,
            allowedLookbacks: err.allowedLookbacks ?? BACKTEST_LOOKBACKS,
            allowedModes: err.allowedModes ?? BACKTEST_MODES
        });
    }
};
