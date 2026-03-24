import { writable } from 'svelte/store';

const initialState = {
	symbol: 'BTC/USDT',
	interval: '1h',
	backtestLookback: '6M',
	backtestThreshold: '0.45',
	candles: [],
	signal: null,
	aiAnalysis: null,
	backtest: null,
	wsStatus: 'idle',
	wsError: '',
	lastUpdatedAt: null
};

const createMarketStore = () => {
	const { subscribe, update, set } = writable(initialState);

	return {
		subscribe,
		reset: () => set(initialState),
		setSelection: ({ symbol, interval }) =>
			update((state) => ({
				...state,
				symbol: symbol ?? state.symbol,
				interval: interval ?? state.interval
			})),
		setBacktestLookback: (lookback) =>
			update((state) => ({
				...state,
				backtestLookback: lookback ?? state.backtestLookback
			})),
		setBacktestThreshold: (threshold) =>
			update((state) => ({
				...state,
				backtestThreshold: threshold ?? state.backtestThreshold
			})),
		setCandles: (candles) =>
			update((state) => ({
				...state,
				candles: Array.isArray(candles) ? candles : [],
				lastUpdatedAt: Date.now()
			})),
		setSignal: (signal) =>
			update((state) => ({
				...state,
				signal: signal ?? null
			})),
		setAIAnalysis: (aiAnalysis) =>
			update((state) => ({
				...state,
				aiAnalysis: aiAnalysis ?? null
			})),
		setBacktest: (backtest) =>
			update((state) => ({
				...state,
				backtest: backtest ?? null
			})),
		setWsState: ({ status, error = '' }) =>
			update((state) => ({
				...state,
				wsStatus: status ?? state.wsStatus,
				wsError: error
			}))
	};
};

export const marketStore = createMarketStore();
