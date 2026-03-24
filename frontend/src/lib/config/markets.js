export const symbolGroups = [
	{
		label: 'Crypto (Binance Spot Execution)',
		options: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT']
	}
];

export const allowedSymbols = symbolGroups.flatMap((group) => group.options);
export const allowedIntervals = ['1h', '4h', '1day'];
export const backtestLookbacks = ['3M', '6M', '12M'];
