export const symbolGroups = [
    {
        label: 'Forex',
        options: ['USD/INR', 'EUR/INR', 'GBP/INR', 'JPY/INR']
    },
    {
        label: 'Crypto (Binance Spot)',
        options: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT']
    }
];

export const allowedSymbols = symbolGroups.flatMap((group) => group.options);
export const allowedIntervals = ['1h', '4h', '1day'];
export const backtestLookbacks = ['3M', '6M', '12M'];
