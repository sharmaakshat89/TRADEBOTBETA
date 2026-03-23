import { getUnifiedSignal } from '../../trading/services/quant.service.js';

const INITIAL_BALANCE = 10000;
const WARMUP_PERIOD = 100;
const RISK_PER_TRADE_PCT = 0.01;

const calculateMaxDrawdown = (equityCurve) => {
    if (!equityCurve || equityCurve.length < 2) return 0;

    let peak = equityCurve[0].balance;
    let maxDrawdown = 0;

    for (const point of equityCurve) {
        if (point.balance > peak) peak = point.balance;
        const drawdown = (peak - point.balance) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return parseFloat((maxDrawdown * 100).toFixed(2));
};

const buildEmptySummary = (equityCurve, finalBalance) => ({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    netPnL: parseFloat((finalBalance - INITIAL_BALANCE).toFixed(2)),
    netPnLPercent: parseFloat((((finalBalance - INITIAL_BALANCE) / INITIAL_BALANCE) * 100).toFixed(2)),
    totalProfit: 0,
    totalLoss: 0,
    maxDrawdown: calculateMaxDrawdown(equityCurve),
    finalBalance: parseFloat(finalBalance.toFixed(2)),
    riskRewardRatio: null,
    profitFactor: null
});

const compileResults = (trades, equityCurve, finalBalance) => {
    if (trades.length === 0) {
        return {
            success: true,
            summary: buildEmptySummary(equityCurve, finalBalance),
            trades: [],
            equityCurve,
            emptyState: {
                title: 'No trades in this period',
                message: 'The selected market never met this mode\'s entry thresholds during the chosen range.'
            }
        };
    }

    const winningTrades = trades.filter((trade) => trade.result === 'WIN');
    const losingTrades = trades.filter((trade) => trade.result === 'LOSS');

    const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLoss = losingTrades.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0);
    const netPnL = finalBalance - INITIAL_BALANCE;
    const netPnLPct = (netPnL / INITIAL_BALANCE) * 100;

    return {
        success: true,
        summary: {
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: parseFloat(((winningTrades.length / trades.length) * 100).toFixed(2)),
            netPnL: parseFloat(netPnL.toFixed(2)),
            netPnLPercent: parseFloat(netPnLPct.toFixed(2)),
            totalProfit: parseFloat(totalProfit.toFixed(2)),
            totalLoss: parseFloat(totalLoss.toFixed(2)),
            maxDrawdown: calculateMaxDrawdown(equityCurve),
            finalBalance: parseFloat(finalBalance.toFixed(2)),
            riskRewardRatio: totalLoss > 0 ? parseFloat((totalProfit / totalLoss).toFixed(2)) : null,
            profitFactor: totalLoss > 0 ? parseFloat((totalProfit / totalLoss).toFixed(2)) : null
        },
        trades,
        equityCurve
    };
};

const closeTrade = (openTrade, exitPrice, result, exitIndex, balance) => {
    const priceDiff =
        openTrade.type === 'BUY'
            ? exitPrice - openTrade.entryPrice
            : openTrade.entryPrice - exitPrice;

    const riskAmount = balance * RISK_PER_TRADE_PCT;
    const stopDistance = Math.abs(openTrade.entryPrice - openTrade.stopLoss);
    const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
    const pnl = priceDiff * positionSize;

    const newBalance =
        result === 'WIN' ? balance + Math.abs(pnl) : balance - Math.abs(pnl);

    return {
        tradeRecord: {
            type: openTrade.type,
            result,
            entryPrice: parseFloat(openTrade.entryPrice.toFixed(4)),
            exitPrice: parseFloat(exitPrice.toFixed(4)),
            stopLoss: parseFloat(openTrade.stopLoss.toFixed(4)),
            takeProfit: parseFloat(openTrade.takeProfit.toFixed(4)),
            positionSize: parseFloat(positionSize.toFixed(2)),
            riskAmount: parseFloat(riskAmount.toFixed(2)),
            pnl: parseFloat(pnl.toFixed(2)),
            entryIndex: openTrade.entryIndex,
            exitIndex
        },
        newBalance
    };
};

export const runBacktest = (symbol, interval, candles, options = {}) => {
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
        const { high, low, close } = candles[i];

        if (openTrade) {
            if (openTrade.type === 'BUY') {
                if (high >= openTrade.takeProfit) {
                    const { tradeRecord, newBalance } = closeTrade(
                        openTrade,
                        openTrade.takeProfit,
                        'WIN',
                        i,
                        balance
                    );
                    balance = newBalance;
                    trades.push(tradeRecord);
                    openTrade = null;
                    equityCurve.push({ index: i, balance: parseFloat(balance.toFixed(2)) });
                } else if (low <= openTrade.stopLoss) {
                    const { tradeRecord, newBalance } = closeTrade(
                        openTrade,
                        openTrade.stopLoss,
                        'LOSS',
                        i,
                        balance
                    );
                    balance = newBalance;
                    trades.push(tradeRecord);
                    openTrade = null;
                    equityCurve.push({ index: i, balance: parseFloat(balance.toFixed(2)) });
                }
            } else if (openTrade.type === 'SELL') {
                if (low <= openTrade.takeProfit) {
                    const { tradeRecord, newBalance } = closeTrade(
                        openTrade,
                        openTrade.takeProfit,
                        'WIN',
                        i,
                        balance
                    );
                    balance = newBalance;
                    trades.push(tradeRecord);
                    openTrade = null;
                    equityCurve.push({ index: i, balance: parseFloat(balance.toFixed(2)) });
                } else if (high >= openTrade.stopLoss) {
                    const { tradeRecord, newBalance } = closeTrade(
                        openTrade,
                        openTrade.stopLoss,
                        'LOSS',
                        i,
                        balance
                    );
                    balance = newBalance;
                    trades.push(tradeRecord);
                    openTrade = null;
                    equityCurve.push({ index: i, balance: parseFloat(balance.toFixed(2)) });
                }
            }
        }

        if (!openTrade) {
            if (balance < INITIAL_BALANCE * 0.2) {
                console.warn(`[BacktestEngine] Balance blown: ${balance.toFixed(2)} - stopping`);
                break;
            }

            const historicalSlice = candles.slice(0, i + 1);
            const signalResult = getUnifiedSignal(symbol, interval, historicalSlice, options);

            if (signalResult.success && signalResult.signal !== 'NO_TRADE') {
                openTrade = {
                    type: signalResult.signal,
                    entryPrice: close,
                    stopLoss: signalResult.risk.stopLoss,
                    takeProfit: signalResult.risk.takeProfit,
                    entryIndex: i
                };
            }
        }
    }

    if (openTrade) {
        const lastCandle = candles[candles.length - 1];
        const lastClose = lastCandle.close;
        const forceResult =
            openTrade.type === 'BUY'
                ? lastClose >= openTrade.entryPrice
                    ? 'WIN'
                    : 'LOSS'
                : lastClose <= openTrade.entryPrice
                  ? 'WIN'
                  : 'LOSS';

        const { tradeRecord, newBalance } = closeTrade(
            openTrade,
            lastClose,
            forceResult,
            candles.length - 1,
            balance
        );
        balance = newBalance;
        trades.push({ ...tradeRecord, forceClose: true });
        equityCurve.push({
            index: candles.length - 1,
            balance: parseFloat(balance.toFixed(2))
        });
    }

    return compileResults(trades, equityCurve, balance);
};
