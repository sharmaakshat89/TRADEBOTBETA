import { ADX, ATR, EMA } from 'technicalindicators';
import NodeCache from 'node-cache';

const signalCache = new NodeCache({ stdTTL: 60 });
const MIN_WARMUP_CANDLES = 150;

const roundNumber = (value, decimals = 4) => {
    if (!Number.isFinite(value)) return null;
    return Number(value.toFixed(decimals));
};

const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

// =============================
// PRECOMPUTE INDICATORS ONCE
// =============================
export const buildLadderIndicators = (candles) => {
    const close = candles.map(c => safeNumber(c.close));
    const high = candles.map(c => safeNumber(c.high));
    const low = candles.map(c => safeNumber(c.low));

    return {
        ema9: EMA.calculate({ period: 9, values: close }),
        ema11: EMA.calculate({ period: 11, values: close }),
        ema45: EMA.calculate({ period: 45, values: close }),
        adx: ADX.calculate({ period: 14, high, low, close }),
        atr14: ATR.calculate({ period: 14, high, low, close })
    };
};

// =============================
//  FAST SIGNAL USING INDEX
// =============================
export const getSignal = (candles, indicators, i) => {
    if (i < MIN_WARMUP_CANDLES) {
        return { success: false };
    }

    const cacheKey = `ladder_${i}`;
    const cached = signalCache.get(cacheKey);
    if (cached) return cached;

    try {
        const price = safeNumber(candles[i].close);
        const prevClose = safeNumber(candles[i - 1].close);

        const ema9 = indicators.ema9[i - 8];
        const ema11 = indicators.ema11[i - 10];
        const ema45 = indicators.ema45[i - 44];
        const adx = indicators.adx[i - 27]?.adx || 0;
        const atr14 = indicators.atr14[i - 14] || 1;

        // =============================
        // FAST EDGE LOGIC
        // =============================

        // dynamic trend trigger (earlier entries)
        const isTrend = adx > 20 || (adx > 17 && ema9 > ema11);
        // const isTrend = adx > 22|| (adx > 19 && ema9 > ema11);
        // micro momentum
        const momentumUp = price > prevClose;
        const momentumDown = price < prevClose;

        // breakout trigger
        const breakoutUp = price > candles[i - 1].high;
        const breakoutDown = price < candles[i - 1].low;

        let signal = 'NO_TRADE';
        let direction = 0;

        if (isTrend) {
            const isBull =
                (price > ema45 && ema9 > ema11 && momentumUp) || breakoutUp;

            const isBear =
                (price < ema45 && ema9 < ema11 && momentumDown) || breakoutDown;

            if (isBull) {
                signal = 'BUY';
                direction = 1;
            } else if (isBear) {
                signal = 'SELL';
                direction = -1;
            }
        }

        // faster fills
        const buffer = 0.4 * atr14;
        const limitPrice = price - (direction * buffer);

        // stop loss (unchanged logic)
        const stopLoss =
            direction === 1
                ? ema45 - atr14
                : ema45 + atr14;

        // slightly faster TP
        const tpMultiplier = adx > 30 ? 4 : 3;
        const takeProfit = price + (direction * tpMultiplier * atr14);

        const result = {
            success: true,
            signal,
            score: signal === 'BUY' ? 1 : signal === 'SELL' ? -1 : 0,
            regime: isTrend ? 'TREND' : 'NO_TRADE',

            context: {
                phi: signal !== 'NO_TRADE' ? 1 : 0
            },

            risk: {
                stopLoss: roundNumber(stopLoss),
                takeProfit: roundNumber(takeProfit),
                timeStopCandles: 9,//earlier 12
                triggerFraction: 0.5
            },

            indicators: {
                adx: roundNumber(adx),
                atr14: roundNumber(atr14)
            },

            timestamp: Date.now(),

            // faster participation
            entries:
                signal === 'NO_TRADE'
                    ? []
                    : [
                          { type: 'MARKET', price: roundNumber(price), qtyPct: 0.7 },
                          { type: 'LIMIT', price: roundNumber(limitPrice), qtyPct: 0.2 },
                          {
                              type: 'LIMIT',
                              price: roundNumber(price - direction * 0.5 * atr14),
                              qtyPct: 0.1
                          }
                      ]
        };

        signalCache.set(cacheKey, result);
        return result;

    } catch (e) {
        return { success: false };
    }
};



/*
new aggressive strategy : 
export const getSignal = (candles, indicators, i) => {
    if (i < MIN_WARMUP_CANDLES) {
        return { success: false };
    }

    const cacheKey = `ladder_${i}`;
    const cached = signalCache.get(cacheKey);
    if (cached) return cached;

    try {
        const price = safeNumber(candles[i].close);
        const prevClose = safeNumber(candles[i - 1].close);

        const ema9 = indicators.ema9[i - 8];
        const ema11 = indicators.ema11[i - 10];
        const ema45 = indicators.ema45[i - 44];
        const adx = indicators.adx[i - 27]?.adx || 0;
        const atr14 = indicators.atr14[i - 14] || 1;

        // =============================
        // FAST EDGE LOGIC
        // =============================

        // dynamic trend trigger (earlier entries)
        const isTrend = adx > 22 || (adx > 18 && ema9 > ema11);

        // micro momentum
        const momentumUp = price > prevClose;
        const momentumDown = price < prevClose;

        // breakout trigger
        const breakoutUp = price > candles[i - 1].high;
        const breakoutDown = price < candles[i - 1].low;

        let signal = 'NO_TRADE';
        let direction = 0;

        if (isTrend) {
            const isBull =
                (price > ema45 && ema9 > ema11 && momentumUp) || breakoutUp;

            const isBear =
                (price < ema45 && ema9 < ema11 && momentumDown) || breakoutDown;

            if (isBull) {
                signal = 'BUY';
                direction = 1;
            } else if (isBear) {
                signal = 'SELL';
                direction = -1;
            }
        }

        // faster fills
        const buffer = 0.4 * atr14;
        const limitPrice = price - (direction * buffer);

        // stop loss (unchanged logic)
        const stopLoss =
            direction === 1
                ? ema45 - atr14
                : ema45 + atr14;

        // slightly faster TP
        const tpMultiplier = adx > 30 ? 4 : 3;
        const takeProfit = price + (direction * tpMultiplier * atr14);

        const result = {
            success: true,
            signal,
            score: signal === 'BUY' ? 1 : signal === 'SELL' ? -1 : 0,
            regime: isTrend ? 'TREND' : 'NO_TRADE',

            context: {
                phi: signal !== 'NO_TRADE' ? 1 : 0
            },

            risk: {
                stopLoss: roundNumber(stopLoss),
                takeProfit: roundNumber(takeProfit),
                timeStopCandles: 12,
                triggerFraction: 0.5
            },

            indicators: {
                adx: roundNumber(adx),
                atr14: roundNumber(atr14)
            },

            timestamp: Date.now(),

            // faster participation
            entries:
                signal === 'NO_TRADE'
                    ? []
                    : [
                          { type: 'MARKET', price: roundNumber(price), qtyPct: 0.7 },
                          { type: 'LIMIT', price: roundNumber(limitPrice), qtyPct: 0.2 },
                          {
                              type: 'LIMIT',
                              price: roundNumber(price - direction * 0.5 * atr14),
                              qtyPct: 0.1
                          }
                      ]
        };

        signalCache.set(cacheKey, result);
        return result;

    } catch (e) {
        return { success: false };
    }
}; */



/*
earlier more stable strategy :
 export const getSignal = (candles, indicators, i) => {
    if (i < MIN_WARMUP_CANDLES) {
        return { success: false };
    }

    const cacheKey = `ladder_${i}`;
    const cached = signalCache.get(cacheKey);
    if (cached) return cached;

    try {
        const price = safeNumber(candles[i].close);

        const ema9 = indicators.ema9[i - 8];
        const ema11 = indicators.ema11[i - 10];
        const ema45 = indicators.ema45[i - 44];
        const adx = indicators.adx[i - 27]?.adx || 0;
        const atr14 = indicators.atr14[i - 14] || 1;

        let signal = 'NO_TRADE';
        let direction = 0;

        // 🔥 Relaxed regime
        const isTrend = adx > 25;

        if (isTrend) {
            const isBull = price > ema45 && (ema9 > ema11 || adx > 25);
            const isBear = price < ema45 && (ema9 < ema11 || adx > 25);

            if (isBull) {
                signal = 'BUY';
                direction = 1;
            } else if (isBear) {
                signal = 'SELL';
                direction = -1;
            }
        }

        const buffer = 0.6 * atr14;
        const limitPrice = price - (direction * buffer);

        const stopLoss = direction === 1
            ? ema45 - atr14
            : ema45 + atr14;

        const tpMultiplier = adx > 30 ? 4.5 : 3.5;
        const takeProfit = price + (direction * tpMultiplier * atr14);

        const result = {
            success: true,
            signal,
            score: signal === 'BUY' ? 1 : signal === 'SELL' ? -1 : 0,
            regime: isTrend ? 'TREND' : 'NO_TRADE',

            context: {
                phi: signal !== 'NO_TRADE' ? 1 : 0
            },

            risk: {
                stopLoss: roundNumber(stopLoss),
                takeProfit: roundNumber(takeProfit),
                timeStopCandles: 12,
                triggerFraction: 0.5
            },

            indicators: {
                adx: roundNumber(adx),
                atr14: roundNumber(atr14)
            },

            timestamp: Date.now(),

            entries: signal === 'NO_TRADE' ? [] : [
                { type: 'MARKET', price: roundNumber(price), qtyPct: 0.6 },
                { type: 'LIMIT', price: roundNumber(limitPrice), qtyPct: 0.25 },
                { type: 'LIMIT', price: roundNumber(price - direction * 0.5 * atr14), qtyPct: 0.15 }
            ]
        };

        signalCache.set(cacheKey, result);
        return result;

    } catch (e) {
        return { success: false };
    }
};
*/