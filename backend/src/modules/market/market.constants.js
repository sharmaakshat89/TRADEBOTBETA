export const MARKET_INTERVALS = ['1h', '4h', '1day'];
export const BACKTEST_LOOKBACKS = ['3M', '6M', '12M'];

export const MARKET_SYMBOLS = [
    { symbol: 'BTC/USDT', futuresSymbol: 'BTCUSDT', type: 'crypto' },
    { symbol: 'ETH/USDT', futuresSymbol: 'ETHUSDT', type: 'crypto' },
    { symbol: 'BNB/USDT', futuresSymbol: 'BNBUSDT', type: 'crypto' },
    { symbol: 'SOL/USDT', futuresSymbol: 'SOLUSDT', type: 'crypto' }
];

const intervalMap = {
    '1h': '1h',
    '4h': '4h',
    '1day': '1d'
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

export const getProviderInterval = (interval) => intervalMap[interval] ?? interval;

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
