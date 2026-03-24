export const symbolGroups = [
	{
		label: 'Crypto (Binance Spot Execution)',
		options: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT']
	}
];

const LOOKBACK_OPTIONS = ['6M', '12M', '1Y', '2Y', '5Y'];
const LOOKBACK_MONTHS = {
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
const MAX_FEASIBLE_KLINE_REQUESTS = 12;
const KLINE_BATCH_LIMIT = 1500;

export const allowedSymbols = symbolGroups.flatMap((group) => group.options);
export const allowedIntervals = ['1h', '4h', '1day'];

export const getBacktestLookbacksForInterval = (interval = '1h') =>
	LOOKBACK_OPTIONS.filter((lookback) => {
		const months = LOOKBACK_MONTHS[lookback] ?? 6;
		const hoursPerBar = HOURS_PER_INTERVAL[interval] ?? 24;
		const estimatedCandles = Math.ceil((months * 30 * 24) / hoursPerBar);
		return Math.ceil(estimatedCandles / KLINE_BATCH_LIMIT) <= MAX_FEASIBLE_KLINE_REQUESTS;
	});

export const backtestLookbacks = getBacktestLookbacksForInterval('1h');
