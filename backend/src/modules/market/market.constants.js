export const MARKET_INTERVALS = ['1h', '4h', '1day'];
export const BACKTEST_LOOKBACKS = ['3M', '6M', '12M', '1Y', '2Y', '5Y'];
export const BACKTEST_LOOKBACK_OPTIONS = ['6M', '12M', '1Y', '2Y', '5Y'];

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

const LOOKBACK_MONTHS = {
    '3M': 3,
    '6M': 6,
    '12M': 12,
    '1Y': 12,
    '2Y': 24,
    '5Y': 60
};

const HOURS_PER_INTERVAL = {
    '1h': 1,
    '4h': 4,
    '1day': 24
};

const KLINE_BATCH_LIMIT = 1500;
const MAX_FEASIBLE_KLINE_REQUESTS = 12;

export const ALLOWED_SYMBOLS = MARKET_SYMBOLS.map((entry) => entry.symbol);
export const ALLOWED_INTERVALS = [...MARKET_INTERVALS];

export const getMarketSymbolConfig = (symbol) =>
    MARKET_SYMBOLS.find((entry) => entry.symbol === symbol) ?? null;

export const normalizeMarketSymbol = (symbol) => symbol?.trim().toUpperCase() ?? '';

export const normalizeMarketInterval = (interval) => interval?.trim().toLowerCase() ?? '';

export const normalizeBacktestLookback = (lookback) => lookback?.trim().toUpperCase() ?? '';

export const getLookbackMonths = (lookback) => LOOKBACK_MONTHS[lookback] ?? 6;

export const getEstimatedCandleCount = (interval, lookback) => {
    const months = getLookbackMonths(lookback);
    const hoursPerBar = HOURS_PER_INTERVAL[interval] ?? 24;
    return Math.ceil((months * 30 * 24) / hoursPerBar);
};

export const getIntervalMs = (interval) => (HOURS_PER_INTERVAL[interval] ?? 24) * 60 * 60 * 1000;

export const isLookbackFeasibleForInterval = (interval, lookback) => {
    const estimatedCandles = getEstimatedCandleCount(interval, lookback);
    const requestCount = Math.ceil(estimatedCandles / KLINE_BATCH_LIMIT);
    return requestCount <= MAX_FEASIBLE_KLINE_REQUESTS;
};

export const getFeasibleBacktestLookbacks = (interval, { includeLegacy = false } = {}) => {
    const candidates = includeLegacy
        ? BACKTEST_LOOKBACKS
        : BACKTEST_LOOKBACK_OPTIONS;

    return candidates.filter((lookback) => isLookbackFeasibleForInterval(interval, lookback));
};

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

export const validateBacktestLookback = (lookback = '6M', interval = '1h') => {
    const cleanLookback = normalizeBacktestLookback(lookback || '6M');
    const feasibleLookbacks = getFeasibleBacktestLookbacks(interval);

    if (!BACKTEST_LOOKBACKS.includes(cleanLookback)) {
        const error = new Error(
            `Invalid lookback: ${cleanLookback}. Allowed: ${feasibleLookbacks.join(', ')}`
        );
        error.statusCode = 400;
        error.allowedLookbacks = feasibleLookbacks;
        throw error;
    }

    if (!isLookbackFeasibleForInterval(interval, cleanLookback)) {
        const error = new Error(
            `Lookback ${cleanLookback} is not available for ${interval}. Allowed: ${feasibleLookbacks.join(', ')}`
        );
        error.statusCode = 400;
        error.allowedLookbacks = feasibleLookbacks;
        throw error;
    }

    return cleanLookback;
};
