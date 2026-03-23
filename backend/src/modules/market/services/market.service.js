import axios from 'axios';
import NodeCache from 'node-cache'; // In-memory cache for signal stability
import dotenv from 'dotenv';
import { getProviderInterval, validateSymbolAndInterval } from '../market.constants.js';

dotenv.config();

// Standard TTL 60 seconds i.e 1 minute tak API call nahi hogi same symbol ke liye
const signalCache = new NodeCache({ stdTTL: 60 }); //reserves space in RAM

/**
 * Fetch normalized candle data for forex and crypto pairs.
 * Forex uses Twelve Data, crypto spot pairs use Binance public klines.
 */
export const fetchMarketData = async (symbol = 'EUR/USD', interval = '1h', outputsize = 100) => {
    const { symbol: cleanSymbol, interval: cleanInterval, config } = validateSymbolAndInterval(
        symbol,
        interval
    );
    const cacheKey = `market_${cleanSymbol}_${cleanInterval}_${outputsize}`; // Unique key for cache lookup
    const providerLabel = config.provider === 'binance' ? 'Binance' : 'Twelve Data';

    // 1. SIGNAL CACHE CHECK (Architecture Rule [1])
    const cachedData = signalCache.get(cacheKey); // RAM mein check kar rahe hain data hai ya nahi
    if (cachedData) { // if found
        console.log(
            `[MarketData] CACHE HIT provider=${providerLabel} symbol=${cleanSymbol} interval=${cleanInterval} outputsize=${outputsize}`
        );
        return { success: true, data: cachedData, source: 'cache' }; // API call bacha li
    }

    try {
        console.log(
            `[MarketData] FETCH provider=${providerLabel} symbol=${cleanSymbol} interval=${cleanInterval} outputsize=${outputsize}`
        );
        let formattedData = [];

        if (config.provider === 'binance') {
            const response = await axios.get('https://api.binance.com/api/v3/klines', {
                params: {
                    symbol: config.apiSymbol,
                    interval: getProviderInterval(config.provider, cleanInterval),
                    limit: outputsize
                }
            });

            if (!Array.isArray(response.data)) {
                throw new Error('Invalid data received from Binance');
            }

            formattedData = response.data.map((candle) => ({
                time: candle[0] / 1000,
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5] ?? 0)
            }));
        } else {
            const response = await axios.get('https://api.twelvedata.com/time_series', {
                params: {
                    symbol: config.apiSymbol,
                    interval: getProviderInterval(config.provider, cleanInterval),
                    apikey: process.env.TWELVE_DATA_KEY,
                    outputsize: outputsize
                }
            });

            if (response.data.status === 'error') { // Twelve Data specific error check
                throw new Error(response.data.message); // Credit exhaustion ya invalid symbol
            }

            if (!response.data.values || !Array.isArray(response.data.values)) {
                throw new Error('Invalid data received from API');
            }

            formattedData = response.data.values
                .map((candle) => ({
                    time: new Date(candle.datetime).getTime() / 1000, // String to Unix timestamp for Charts [1]
                    open: parseFloat(candle.open), // String to Number conversion for Math
                    high: parseFloat(candle.high), // High price for volatility filters [3]
                    low: parseFloat(candle.low), // Low price for ATR
                    close: parseFloat(candle.close), // Most critical for MA50
                    volume: candle.volume ? parseFloat(candle.volume) : 0 // Forex volume is often zero or ticks
                }))
                .reverse(); // Reverse because , to calculate indicators we go from old to new [1]
        }

        // 5. UPDATE SIGNAL CACHE
        signalCache.set(cacheKey, formattedData); // Key: symbol_interval, Value: candles

        return { success: true, data: formattedData, source: 'api' };

    } catch (error) {
        console.error(`error msg: ${error.message}`);
        throw error;
    }
};

export const fetchForexData = fetchMarketData;
