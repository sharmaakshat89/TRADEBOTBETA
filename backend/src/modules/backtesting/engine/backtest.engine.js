import { getUnifiedSignal } from '../../trading/services/quant.service.js';

const INITIAL_BALANCE = 10000;
const WARMUP_PERIOD = 150;
const RISK_PER_TRADE_PCT = 0.01;
const TIME_STOP_CANDLES = 8;
const TP_PROGRESS_FRACTION = 0.5;

const roundNumber = (value, decimals = 2) => Number(value.toFixed(decimals));

const calculateMaxDrawdown = (equityCurve) => {
    if (!equityCurve || equityCurve.length < 2) return 0;

    let peak = equityCurve[0].balance;
    let maxDrawdown = 0;

    for (const point of equityCurve) {
        if (point.balance > peak) peak = point.balance;
        const drawdown = peak > 0 ? (peak - point.balance) / peak : 0;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return roundNumber(maxDrawdown * 100);
};

const buildEmptySummary = (equityCurve, finalBalance) => ({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    netPnL: roundNumber(finalBalance - INITIAL_BALANCE),
    netPnLPercent: roundNumber(((finalBalance - INITIAL_BALANCE) / INITIAL_BALANCE) * 100),
    totalProfit: 0,
    totalLoss: 0,
    maxDrawdown: calculateMaxDrawdown(equityCurve),
    finalBalance: roundNumber(finalBalance),
    riskRewardRatio: null,
    profitFactor: null
});

const compileResults = (trades, equityCurve, finalBalance) => {
    if (!trades.length) {
        return {
            success: true,
            summary: buildEmptySummary(equityCurve, finalBalance),
            trades: [],
            equityCurve,
            emptyState: {
                title: 'No trades in this period',
                message: 'No valid trend-following setups passed regime and funding filters in the selected range.'
            }
        };
    }

    const winningTrades = trades.filter((trade) => trade.result === 'WIN');
    const losingTrades = trades.filter((trade) => trade.result === 'LOSS');
    const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLoss = losingTrades.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0);
    const netPnL = finalBalance - INITIAL_BALANCE;

    return {
        success: true,
        summary: {
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: roundNumber((winningTrades.length / trades.length) * 100),
            netPnL: roundNumber(netPnL),
            netPnLPercent: roundNumber((netPnL / INITIAL_BALANCE) * 100),
            totalProfit: roundNumber(totalProfit),
            totalLoss: roundNumber(totalLoss),
            maxDrawdown: calculateMaxDrawdown(equityCurve),
            finalBalance: roundNumber(finalBalance),
            riskRewardRatio: totalLoss > 0 ? roundNumber(totalProfit / totalLoss) : null,
            profitFactor: totalLoss > 0 ? roundNumber(totalProfit / totalLoss) : null
        },
        trades,
        equityCurve
    };
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
        ? trade.entryPrice + distance * TP_PROGRESS_FRACTION
        : trade.entryPrice - distance * TP_PROGRESS_FRACTION;
};

export const runBacktest = (symbol, interval, candles) => {
    if (!candles || candles.length < WARMUP_PERIOD + 1) {
        return {
            success: false,
            error: `Need ${WARMUP_PERIOD + 1}+ candles, got ${candles?.length ?? 0}`
        };
    }

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
                i - openTrade.entryIndex >= TIME_STOP_CANDLES &&
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

            if (signalResult.success && (signalResult.signal === 'BUY' || signalResult.signal === 'SELL')) {
                openTrade = {
                    type: signalResult.signal,
                    entryPrice: candle.close,
                    stopLoss: signalResult.risk.stopLoss,
                    takeProfit: signalResult.risk.takeProfit,
                    entryIndex: i,
                    hitHalfTarget: false
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

    return compileResults(trades, equityCurve, balance);
};
