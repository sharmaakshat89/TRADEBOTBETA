import { getUnifiedSignal } from '../../trading/services/quant.service.js';

const INITIAL_BALANCE = 10000;
const WARMUP_PERIOD = 150;
const RISK_PER_TRADE_PCT = 0.01;
const TIME_STOP_CANDLES = 8;
const TP_PROGRESS_FRACTION = 0.5;

const DEFAULT_BACKTEST_CONFIG = {
    scoreThreshold: 0.5,
    stopLossAtrMultiplier: 1.8,
    takeProfitAtrMultiplier: 2.5,
    timeStopCandles: TIME_STOP_CANDLES,
    triggerFraction: TP_PROGRESS_FRACTION
};

const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const safeDivide = (numerator, denominator, fallback = 0) => {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
        return fallback;
    }
    return numerator / denominator;
};

const roundNumber = (value, decimals = 2) => {
    if (!Number.isFinite(value)) return 0;
    return Number(value.toFixed(decimals));
};

const normalizeConfig = (config = {}) => ({
    scoreThreshold: safeNumber(config.scoreThreshold, DEFAULT_BACKTEST_CONFIG.scoreThreshold),
    stopLossAtrMultiplier: safeNumber(
        config.stopLossAtrMultiplier,
        DEFAULT_BACKTEST_CONFIG.stopLossAtrMultiplier
    ),
    takeProfitAtrMultiplier: safeNumber(
        config.takeProfitAtrMultiplier,
        DEFAULT_BACKTEST_CONFIG.takeProfitAtrMultiplier
    ),
    timeStopCandles: Math.max(
        1,
        Math.round(safeNumber(config.timeStopCandles, DEFAULT_BACKTEST_CONFIG.timeStopCandles))
    ),
    triggerFraction: Math.max(
        0,
        safeNumber(config.triggerFraction, DEFAULT_BACKTEST_CONFIG.triggerFraction)
    )
});

const calculateMaxDrawdown = (equityCurve) => {
    if (!equityCurve || equityCurve.length < 2) return 0;

    let peak = equityCurve[0].balance;
    let maxDrawdown = 0;

    for (const point of equityCurve) {
        if (point.balance > peak) peak = point.balance;
        const drawdown = safeDivide(peak - point.balance, peak, 0);
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return roundNumber(maxDrawdown * 100);
};

const buildMetrics = (trades, equityCurve, finalBalance) => {
    const winningTrades = trades.filter((trade) => trade.pnl > 0);
    const losingTrades = trades.filter((trade) => trade.pnl < 0);
    const totalTrades = trades.length;
    const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLoss = losingTrades.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0);
    const avgWin = safeDivide(totalProfit, winningTrades.length, 0);
    const avgLoss = safeDivide(totalLoss, losingTrades.length, 0);
    const winRateRatio = safeDivide(winningTrades.length, totalTrades, 0);

    return {
        totalTrades,
        winRate: roundNumber(winRateRatio, 4),
        avgWin: roundNumber(avgWin),
        avgLoss: roundNumber(avgLoss),
        riskRewardRatio: roundNumber(safeDivide(avgWin, avgLoss, 0), 4),
        profitFactor: roundNumber(safeDivide(totalProfit, totalLoss, 0), 4),
        expectancy: roundNumber((winRateRatio * avgWin) - ((1 - winRateRatio) * avgLoss), 4),
        maxDrawdown: calculateMaxDrawdown(equityCurve),
        totalProfit: roundNumber(totalProfit),
        totalLoss: roundNumber(totalLoss),
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        finalBalance: roundNumber(finalBalance),
        netPnL: roundNumber(finalBalance - INITIAL_BALANCE),
        netPnLPercent: roundNumber(safeDivide(finalBalance - INITIAL_BALANCE, INITIAL_BALANCE, 0) * 100),
        winRatePercent: roundNumber(winRateRatio * 100, 2)
    };
};

const buildSummary = (metrics) => ({
    totalTrades: metrics.totalTrades,
    winningTrades: metrics.winningTrades,
    losingTrades: metrics.losingTrades,
    winRate: metrics.winRatePercent,
    winRateRatio: metrics.winRate,
    avgWin: metrics.avgWin,
    avgLoss: metrics.avgLoss,
    netPnL: metrics.netPnL,
    netPnLPercent: metrics.netPnLPercent,
    totalProfit: metrics.totalProfit,
    totalLoss: metrics.totalLoss,
    maxDrawdown: metrics.maxDrawdown,
    finalBalance: metrics.finalBalance,
    riskRewardRatio: metrics.riskRewardRatio,
    profitFactor: metrics.profitFactor,
    expectancy: metrics.expectancy
});

const compileResults = (trades, equityCurve, finalBalance, config) => {
    const metrics = buildMetrics(trades, equityCurve, finalBalance);
    const baseResult = {
        success: true,
        config,
        metrics: {
            totalTrades: metrics.totalTrades,
            winRate: metrics.winRate,
            avgWin: metrics.avgWin,
            avgLoss: metrics.avgLoss,
            riskRewardRatio: metrics.riskRewardRatio,
            profitFactor: metrics.profitFactor,
            expectancy: metrics.expectancy,
            maxDrawdown: metrics.maxDrawdown
        },
        summary: buildSummary(metrics),
        trades,
        equityCurve
    };

    if (!trades.length) {
        return {
            ...baseResult,
            emptyState: {
                title: 'No trades in this period',
                message: 'No valid trend-following setups passed regime and funding filters in the selected range.'
            }
        };
    }

    return baseResult;
};

const buildTradeRecord = ({
    openTrade,
    exitPrice,
    result,
    exitIndex,
    balance,
    exitReason
}) => {
    const priceDiff =
        openTrade.type === 'BUY'
            ? exitPrice - openTrade.entryPrice
            : openTrade.entryPrice - exitPrice;

    const riskAmount = balance * RISK_PER_TRADE_PCT;
    const stopDistance = Math.abs(openTrade.entryPrice - openTrade.stopLoss);
    const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
    const pnl = priceDiff * positionSize;
    const newBalance = balance + pnl;

    return {
        tradeRecord: {
            type: openTrade.type,
            result,
            exitReason,
            entryPrice: roundNumber(openTrade.entryPrice, 4),
            exitPrice: roundNumber(exitPrice, 4),
            stopLoss: roundNumber(openTrade.stopLoss, 4),
            takeProfit: roundNumber(openTrade.takeProfit, 4),
            positionSize: roundNumber(positionSize),
            riskAmount: roundNumber(riskAmount),
            pnl: roundNumber(pnl),
            entryIndex: openTrade.entryIndex,
            exitIndex
        },
        newBalance
    };
};

const getHalfTarget = (trade) => {
    const distance = Math.abs(trade.takeProfit - trade.entryPrice);
    return trade.type === 'BUY'
        ? trade.entryPrice + distance * trade.triggerFraction
        : trade.entryPrice - distance * trade.triggerFraction;
};

const deriveSignalForConfig = (signalResult, config) => {
    if (!signalResult?.success) return 'NO_TRADE';
    if (signalResult.regime !== 'TREND') return 'NO_TRADE';
    if (safeNumber(signalResult.context?.phi, 0) <= 0) return 'NO_TRADE';
    if (signalResult.score > config.scoreThreshold) return 'BUY';
    if (signalResult.score < -config.scoreThreshold) return 'SELL';
    return 'NO_TRADE';
};

const buildRiskForConfig = (entryPrice, direction, atr14, config) => {
    const safeAtr = safeNumber(atr14, 0);
    if (safeAtr <= 0) {
        return { stopLoss: entryPrice, takeProfit: entryPrice };
    }

    return {
        stopLoss: entryPrice - direction * (config.stopLossAtrMultiplier * safeAtr),
        takeProfit: entryPrice + direction * (config.takeProfitAtrMultiplier * safeAtr)
    };
};

export const runBacktest = (symbol, interval, candles, config = {}) => {
    if (!candles || candles.length < WARMUP_PERIOD + 1) {
        return {
            success: false,
            error: `Need ${WARMUP_PERIOD + 1}+ candles, got ${candles?.length ?? 0}`
        };
    }

    const normalizedConfig = normalizeConfig(config);
    let balance = INITIAL_BALANCE;
    let openTrade = null;
    const trades = [];
    const equityCurve = [{ index: 0, balance: INITIAL_BALANCE }];

    for (let i = WARMUP_PERIOD; i < candles.length; i += 1) {
        const candle = candles[i];

        if (openTrade) {
            const halfTarget = getHalfTarget(openTrade);
            const reachedHalfTarget =
                openTrade.type === 'BUY' ? candle.high >= halfTarget : candle.low <= halfTarget;

            if (reachedHalfTarget) {
                openTrade.hitHalfTarget = true;
            }

            if (openTrade.type === 'BUY') {
                if (candle.low <= openTrade.stopLoss) {
                    const { tradeRecord, newBalance } = buildTradeRecord({
                        openTrade,
                        exitPrice: openTrade.stopLoss,
                        result: 'LOSS',
                        exitIndex: i,
                        balance,
                        exitReason: 'STOP_LOSS'
                    });
                    balance = newBalance;
                    trades.push(tradeRecord);
                    openTrade = null;
                    equityCurve.push({ index: i, balance: roundNumber(balance) });
                } else if (candle.high >= openTrade.takeProfit) {
                    const { tradeRecord, newBalance } = buildTradeRecord({
                        openTrade,
                        exitPrice: openTrade.takeProfit,
                        result: 'WIN',
                        exitIndex: i,
                        balance,
                        exitReason: 'TAKE_PROFIT'
                    });
                    balance = newBalance;
                    trades.push(tradeRecord);
                    openTrade = null;
                    equityCurve.push({ index: i, balance: roundNumber(balance) });
                }
            } else {
                if (candle.high >= openTrade.stopLoss) {
                    const { tradeRecord, newBalance } = buildTradeRecord({
                        openTrade,
                        exitPrice: openTrade.stopLoss,
                        result: 'LOSS',
                        exitIndex: i,
                        balance,
                        exitReason: 'STOP_LOSS'
                    });
                    balance = newBalance;
                    trades.push(tradeRecord);
                    openTrade = null;
                    equityCurve.push({ index: i, balance: roundNumber(balance) });
                } else if (candle.low <= openTrade.takeProfit) {
                    const { tradeRecord, newBalance } = buildTradeRecord({
                        openTrade,
                        exitPrice: openTrade.takeProfit,
                        result: 'WIN',
                        exitIndex: i,
                        balance,
                        exitReason: 'TAKE_PROFIT'
                    });
                    balance = newBalance;
                    trades.push(tradeRecord);
                    openTrade = null;
                    equityCurve.push({ index: i, balance: roundNumber(balance) });
                }
            }

            if (
                openTrade &&
                i - openTrade.entryIndex >= openTrade.timeStopCandles &&
                !openTrade.hitHalfTarget
            ) {
                const forceWin =
                    openTrade.type === 'BUY'
                        ? candle.close >= openTrade.entryPrice
                        : candle.close <= openTrade.entryPrice;

                const { tradeRecord, newBalance } = buildTradeRecord({
                    openTrade,
                    exitPrice: candle.close,
                    result: forceWin ? 'WIN' : 'LOSS',
                    exitIndex: i,
                    balance,
                    exitReason: 'TIME_STOP'
                });
                balance = newBalance;
                trades.push(tradeRecord);
                openTrade = null;
                equityCurve.push({ index: i, balance: roundNumber(balance) });
            }
        }

        if (!openTrade) {
            const signalResult = getUnifiedSignal(symbol, interval, candles.slice(0, i + 1));
            const derivedSignal = deriveSignalForConfig(signalResult, normalizedConfig);

            if (signalResult.success && (derivedSignal === 'BUY' || derivedSignal === 'SELL')) {
                const direction = derivedSignal === 'SELL' ? -1 : 1;
                const risk = buildRiskForConfig(
                    candle.close,
                    direction,
                    signalResult.indicators?.atr14,
                    normalizedConfig
                );

                openTrade = {
                    type: derivedSignal,
                    entryPrice: candle.close,
                    stopLoss: risk.stopLoss,
                    takeProfit: risk.takeProfit,
                    entryIndex: i,
                    hitHalfTarget: false,
                    timeStopCandles: normalizedConfig.timeStopCandles,
                    triggerFraction: normalizedConfig.triggerFraction
                };
            }
        }
    }

    if (openTrade) {
        const lastCandle = candles.at(-1);
        const forceWin =
            openTrade.type === 'BUY'
                ? lastCandle.close >= openTrade.entryPrice
                : lastCandle.close <= openTrade.entryPrice;

        const { tradeRecord, newBalance } = buildTradeRecord({
            openTrade,
            exitPrice: lastCandle.close,
            result: forceWin ? 'WIN' : 'LOSS',
            exitIndex: candles.length - 1,
            balance,
            exitReason: 'FORCE_CLOSE'
        });
        balance = newBalance;
        trades.push({ ...tradeRecord, forceClose: true });
        equityCurve.push({ index: candles.length - 1, balance: roundNumber(balance) });
    }

    return compileResults(trades, equityCurve, balance, normalizedConfig);
};
