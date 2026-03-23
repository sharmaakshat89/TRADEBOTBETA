export const MARKET_INTERVALS = ['1h', '4h', '1day'];
export const BACKTEST_LOOKBACKS = ['3M', '6M', '12M'];

export const MARKET_SYMBOLS = [
    { symbol: 'USD/INR', provider: 'twelvedata', apiSymbol: 'USD/INR', type: 'forex' },
    { symbol: 'EUR/INR', provider: 'twelvedata', apiSymbol: 'EUR/INR', type: 'forex' },
    { symbol: 'GBP/INR', provider: 'twelvedata', apiSymbol: 'GBP/INR', type: 'forex' },
    { symbol: 'JPY/INR', provider: 'twelvedata', apiSymbol: 'JPY/INR', type: 'forex' },
    { symbol: 'BTC/USDT', provider: 'binance', apiSymbol: 'BTCUSDT', type: 'crypto' },
    { symbol: 'ETH/USDT', provider: 'binance', apiSymbol: 'ETHUSDT', type: 'crypto' },
    { symbol: 'BNB/USDT', provider: 'binance', apiSymbol: 'BNBUSDT', type: 'crypto' },
    { symbol: 'SOL/USDT', provider: 'binance', apiSymbol: 'SOLUSDT', type: 'crypto' }
];

const intervalMapByProvider = {
    twelvedata: {
        '1h': '1h',
        '4h': '4h',
        '1day': '1day'
    },
    binance: {
        '1h': '1h',
        '4h': '4h',
        '1day': '1d'
    }
};

export const ALLOWED_SYMBOLS = MARKET_SYMBOLS.map((entry) => entry.symbol);
export const ALLOWED_INTERVALS = [...MARKET_INTERVALS];

export const getMarketSymbolConfig = (symbol) =>
    MARKET_SYMBOLS.find((entry) => entry.symbol === symbol) ?? null;

export const normalizeMarketSymbol = (symbol) => symbol?.trim().toUpperCase() ?? '';

export const normalizeMarketInterval = (interval) => interval?.trim().toLowerCase() ?? '';

export const validateSymbolAndInterval = (symbol, interval) => {
    const cleanSymbol = normalizeMarketSymbol(symbol);
    const cleanInterval = normalizeMarketInterval(interval);

    if (!cleanSymbol || !cleanInterval) {
        const error = new Error('symbol and interval are required');
        error.statusCode = 400;
        error.allowedSymbols = ALLOWED_SYMBOLS;
        error.allowedIntervals = ALLOWED_INTERVALS;
        throw error;
    }

    if (!ALLOWED_SYMBOLS.includes(cleanSymbol)) {
        const error = new Error(`Invalid symbol: ${cleanSymbol}. Allowed: ${ALLOWED_SYMBOLS.join(', ')}`);
        error.statusCode = 400;
        error.allowedSymbols = ALLOWED_SYMBOLS;
        throw error;
    }

    if (!ALLOWED_INTERVALS.includes(cleanInterval)) {
        const error = new Error(
            `Invalid interval: ${cleanInterval}. Allowed: ${ALLOWED_INTERVALS.join(', ')}`
        );
        error.statusCode = 400;
        error.allowedIntervals = ALLOWED_INTERVALS;
        throw error;
    }

    return { symbol: cleanSymbol, interval: cleanInterval, config: getMarketSymbolConfig(cleanSymbol) };
};

export const getProviderInterval = (provider, interval) =>
    intervalMapByProvider[provider]?.[interval] ?? interval;

export const normalizeBacktestLookback = (lookback) => lookback?.trim().toUpperCase() ?? '';

export const validateBacktestLookback = (lookback = '6M') => {
    const cleanLookback = normalizeBacktestLookback(lookback || '6M');

    if (!BACKTEST_LOOKBACKS.includes(cleanLookback)) {
        const error = new Error(
            `Invalid lookback: ${cleanLookback}. Allowed: ${BACKTEST_LOOKBACKS.join(', ')}`
        );
        error.statusCode = 400;
        error.allowedLookbacks = BACKTEST_LOOKBACKS;
        throw error;
    }

    return cleanLookback;
};
