import { 
    buildLadderIndicators, 
    getSignal 
} from '../../trading/services/quant.service.js';

const INITIAL_BALANCE = 10000;
const WARMUP_PERIOD = 150;
const RISK_PER_TRADE_PCT = 0.01;

const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const safeDivide = (num, den, fallback = 0) => {
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return fallback;
    return num / den;
};

const roundNumber = (value, decimals = 2) => {
    if (!Number.isFinite(value)) return 0;
    return Number(value.toFixed(decimals));
};

const calculateMaxDrawdown = (equityCurve) => {
    let peak = equityCurve[0].balance;
    let maxDD = 0;

    for (const point of equityCurve) {
        if (point.balance > peak) peak = point.balance;
        const dd = (peak - point.balance) / peak;
        if (dd > maxDD) maxDD = dd;
    }

    return roundNumber(maxDD * 100);
};

const buildMetrics = (trades, equityCurve, finalBalance) => {
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);

    const totalProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const totalLoss = losses.reduce((s, t) => s + Math.abs(t.pnl), 0);

    const winRate = safeDivide(wins.length, trades.length);

    return {
        totalTrades: trades.length,
        winRate: roundNumber(winRate * 100, 2),
        avgWin: roundNumber(safeDivide(totalProfit, wins.length)),
        avgLoss: roundNumber(safeDivide(totalLoss, losses.length)),
        profitFactor: roundNumber(safeDivide(totalProfit, totalLoss)),
        maxDrawdown: calculateMaxDrawdown(equityCurve),
        finalBalance: roundNumber(finalBalance),
        netPnL: roundNumber(finalBalance - INITIAL_BALANCE),
        netPnLPercent: roundNumber(((finalBalance - INITIAL_BALANCE) / INITIAL_BALANCE) * 100)
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

    const baseSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
    const positionSize = baseSize * (openTrade.positionSize || 1);

    const pnl = priceDiff * positionSize;
    const newBalance = balance + pnl;

    return {
        tradeRecord: {
            type: openTrade.type,
            result,
            exitReason,
            entryPrice: roundNumber(openTrade.entryPrice, 4),
            exitPrice: roundNumber(exitPrice, 4),
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

export const runBacktest = (symbol, interval, candles) => {
    if (!candles || candles.length < WARMUP_PERIOD + 1) {
        return { success: false };
    }

    const indicators = buildLadderIndicators(candles);

    let balance = INITIAL_BALANCE;
    let openTrade = null;

    const trades = [];
    const equityCurve = [{ index: 0, balance }];

    for (let i = WARMUP_PERIOD; i < candles.length; i++) {
        const candle = candles[i];

        // =============================
        // 🧠 ENTRY FILL
        // =============================
        if (openTrade && openTrade.entries) {
            for (const entry of openTrade.entries) {
                if (entry.filled) continue;

                let fill = false;

                if (entry.type === 'MARKET') fill = true;
                else if (entry.type === 'LIMIT') {
                    fill = openTrade.type === 'BUY'
                        ? candle.low <= entry.price
                        : candle.high >= entry.price;
                }

                if (fill) {
                    entry.filled = true;
                    openTrade.totalQty += entry.qtyPct;
                    openTrade.totalCost += entry.price * entry.qtyPct;

                    openTrade.entryPrice = openTrade.totalCost / openTrade.totalQty;
                    openTrade.positionSize = openTrade.totalQty;
                }
            }
        }

        // =============================
        // 🧠 EXIT
        // =============================
        if (openTrade && openTrade.entryPrice !== null) {
            const halfTarget = getHalfTarget(openTrade);

            if (
                (openTrade.type === 'BUY' && candle.high >= halfTarget) ||
                (openTrade.type === 'SELL' && candle.low <= halfTarget)
            ) {
                openTrade.hitHalfTarget = true;
            }

            const hitSL = openTrade.type === 'BUY'
                ? candle.low <= openTrade.stopLoss
                : candle.high >= openTrade.stopLoss;

            const hitTP = openTrade.type === 'BUY'
                ? candle.high >= openTrade.takeProfit
                : candle.low <= openTrade.takeProfit;

            if (hitSL || hitTP) {
                const { tradeRecord, newBalance } = buildTradeRecord({
                    openTrade,
                    exitPrice: hitSL ? openTrade.stopLoss : openTrade.takeProfit,
                    result: hitSL ? 'LOSS' : 'WIN',
                    exitIndex: i,
                    balance,
                    exitReason: hitSL ? 'SL' : 'TP'
                });

                balance = newBalance;
                trades.push(tradeRecord);
                openTrade = null;
                equityCurve.push({ index: i, balance });
                continue;
            }

            if (
                i - openTrade.entryIndex >= openTrade.timeStopCandles &&
                !openTrade.hitHalfTarget
            ) {
                const { tradeRecord, newBalance } = buildTradeRecord({
                    openTrade,
                    exitPrice: candle.close,
                    result: 'LOSS',
                    exitIndex: i,
                    balance,
                    exitReason: 'TIME'
                });

                balance = newBalance;
                trades.push(tradeRecord);
                openTrade = null;
                equityCurve.push({ index: i, balance });
            }
        }

        // =============================
        // 🧠 ENTRY
        // =============================
        if (!openTrade) {
            const signal = getSignal(candles, indicators, i);

            if (signal.signal === 'BUY' || signal.signal === 'SELL') {
                openTrade = {
                    type: signal.signal,
                    entries: signal.entries.map(e => ({ ...e, filled: false })),
                    entryPrice: null,
                    positionSize: 0,
                    totalQty: 0,
                    totalCost: 0,
                    stopLoss: signal.risk.stopLoss,
                    takeProfit: signal.risk.takeProfit,
                    entryIndex: i,
                    hitHalfTarget: false,
                    timeStopCandles: signal.risk.timeStopCandles,
                    triggerFraction: signal.risk.triggerFraction
                };
            }
        }
    }

    return {
        success: true,
        summary: buildMetrics(trades, equityCurve, balance),
        trades,
        equityCurve
    };
};