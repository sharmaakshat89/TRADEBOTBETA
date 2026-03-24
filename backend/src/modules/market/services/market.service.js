import axios from 'axios';
import NodeCache from 'node-cache';
import {
    getIntervalMs,
    getMarketSymbolConfig,
    getProviderInterval,
    validateSymbolAndInterval
} from '../market.constants.js';

const signalCache = new NodeCache({ stdTTL: 60 });
const BINANCE_FUTURES_BASE_URL = 'https://fapi.binance.com';
const KLINE_BATCH_LIMIT = 1500;
const FUNDING_BATCH_LIMIT = 1000;
const REQUEST_PAUSE_MS = 80;

const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const roundNumber = (value, decimals = 8) => {
    if (!Number.isFinite(value)) return null;
    return Number(value.toFixed(decimals));
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeCandle = (kline, fundingRate = 0) => ({
    time: Math.floor(kline[0] / 1000),
    openTime: kline[0],
    closeTime: kline[6],
    open: safeNumber(kline[1]),
    high: safeNumber(kline[2]),
    low: safeNumber(kline[3]),
    close: safeNumber(kline[4]),
    volume: safeNumber(kline[5]),
    takerBuyBaseVolume: safeNumber(kline[9]),
    fundingRate: roundNumber(fundingRate, 6)
});

const buildFundingAlignment = (candles, fundingRates) => {
    const sortedFunding = [...fundingRates].sort((a, b) => a.fundingTime - b.fundingTime);
    let fundingIndex = 0;
    let latestFunding = 0;

    return candles.map((kline) => {
        const closeTime = kline[6];

        while (
            fundingIndex < sortedFunding.length &&
            sortedFunding[fundingIndex].fundingTime <= closeTime
        ) {
            latestFunding = sortedFunding[fundingIndex].fundingRate;
            fundingIndex += 1;
        }

        return normalizeCandle(kline, latestFunding);
    });
};

const fetchFundingRates = async (futuresSymbol, startTime, endTime) => {
    const fundingRates = [];
    let cursor = startTime;

    while (cursor <= endTime) {
        const response = await axios.get(`${BINANCE_FUTURES_BASE_URL}/fapi/v1/fundingRate`, {
            params: {
                symbol: futuresSymbol,
                startTime: cursor,
                endTime,
                limit: FUNDING_BATCH_LIMIT
            }
        });

        const batch = Array.isArray(response.data) ? response.data : [];
        if (!batch.length) break;

        fundingRates.push(
            ...batch.map((item) => ({
                fundingTime: safeNumber(item.fundingTime),
                fundingRate: safeNumber(item.fundingRate)
            }))
        );

        if (batch.length < FUNDING_BATCH_LIMIT) break;
        cursor = safeNumber(batch.at(-1)?.fundingTime) + 1;
        await pause(REQUEST_PAUSE_MS);
    }

    return fundingRates;
};

const fetchKlineBatch = async (futuresSymbol, interval, limit, startTime, endTime) => {
    const response = await axios.get(`${BINANCE_FUTURES_BASE_URL}/fapi/v1/klines`, {
        params: {
            symbol: futuresSymbol,
            interval: getProviderInterval(interval),
            limit,
            ...(startTime ? { startTime } : {}),
            ...(endTime ? { endTime } : {})
        }
    });

    if (!Array.isArray(response.data)) {
        throw new Error('Invalid data received from Binance Futures');
    }

    return response.data;
};

const fetchAllKlines = async (futuresSymbol, interval, outputsize) => {
    const target = Math.max(1, outputsize);
    const batches = [];
    let remaining = target;
    let cursorEndTime = Date.now();
    const intervalMs = getIntervalMs(interval);

    while (remaining > 0) {
        const limit = Math.min(KLINE_BATCH_LIMIT, remaining);
        const batchSpanMs = intervalMs * limit;
        const batchStartTime = Math.max(0, cursorEndTime - batchSpanMs + 1);
        const batch = await fetchKlineBatch(
            futuresSymbol,
            interval,
            limit,
            batchStartTime,
            cursorEndTime
        );

        if (!batch.length) break;

        batches.unshift(...batch);
        remaining -= batch.length;

        if (batch.length < limit) break;
        cursorEndTime = safeNumber(batch[0][0]) - 1;
        if (remaining > 0) {
            await pause(REQUEST_PAUSE_MS);
        }
    }

    const deduped = [];
    const seenOpenTimes = new Set();

    for (const kline of batches) {
        if (!seenOpenTimes.has(kline[0])) {
            seenOpenTimes.add(kline[0]);
            deduped.push(kline);
        }
    }

    return deduped
        .sort((left, right) => left[0] - right[0])
        .slice(-target);
};

export const fetchMarketData = async (symbol = 'BTC/USDT', interval = '1h', outputsize = 150) => {
    const { symbol: cleanSymbol, interval: cleanInterval, config } = validateSymbolAndInterval(
        symbol,
        interval
    );
    const cacheKey = `market_${cleanSymbol}_${cleanInterval}_${outputsize}`;
    const cachedData = signalCache.get(cacheKey);

    if (cachedData) {
        console.log(
            `[MarketData] CACHE HIT provider=BinanceFutures symbol=${cleanSymbol} interval=${cleanInterval} outputsize=${outputsize}`
        );
        return { success: true, data: cachedData, source: 'cache' };
    }

    try {
        console.log(
            `[MarketData] FETCH provider=BinanceFutures symbol=${cleanSymbol} interval=${cleanInterval} outputsize=${outputsize}`
        );

        const futuresSymbol = getMarketSymbolConfig(cleanSymbol)?.futuresSymbol ?? config?.futuresSymbol;
        const klines = await fetchAllKlines(futuresSymbol, cleanInterval, outputsize);

        if (!klines.length) {
            throw new Error(`No Binance Futures candles returned for ${cleanSymbol}`);
        }

        const fundingRates = await fetchFundingRates(
            futuresSymbol,
            safeNumber(klines[0][0]),
            safeNumber(klines.at(-1)?.[6])
        );

        const formattedData = buildFundingAlignment(klines, fundingRates);
        signalCache.set(cacheKey, formattedData);

        return { success: true, data: formattedData, source: 'api' };
    } catch (error) {
        console.error(`[MarketData] ERROR: ${error.message}`);
        throw error;
    }
};
