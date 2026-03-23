import { writable } from 'svelte/store'; // reactive market state

const initialState = {
	symbol: 'BTC/USDT', // default to Binance-backed crypto for deeper history
	interval: '1h', // backend default interval
	backtestLookback: '6M', // default backtest range
	backtestMode: 'BALANCED', // default backtest strictness
	candles: [], // live candle feed
	signal: null, // latest quant signal payload
	aiAnalysis: null, // latest ai payload
	backtest: null, // latest backtest payload
	wsStatus: 'idle', // socket lifecycle state
	wsError: '', // socket error message
	lastUpdatedAt: null // last market refresh time
};

const createMarketStore = () => {
	const { subscribe, update, set } = writable(initialState); // create writable store

	return {
		subscribe, // expose subscription
		reset: () => set(initialState), // reset all market data
		setSelection: ({ symbol, interval }) =>
			update((state) => ({
				...state, // retain other fields
				symbol: symbol ?? state.symbol, // patch symbol if present
				interval: interval ?? state.interval // patch interval if present
			})),
		setBacktestLookback: (lookback) =>
			update((state) => ({
				...state,
				backtestLookback: lookback ?? state.backtestLookback
			})),
		setBacktestMode: (mode) =>
			update((state) => ({
				...state,
				backtestMode: mode ?? state.backtestMode
			})),
		setCandles: (candles) =>
			update((state) => ({
				...state, // retain prior state
				candles: Array.isArray(candles) ? candles : [], // sanitize candles
				lastUpdatedAt: Date.now() // timestamp refresh
			})),
		setSignal: (signal) =>
			update((state) => ({
				...state, // keep other market fields
				signal: signal ?? null // store latest signal
			})),
		setAIAnalysis: (aiAnalysis) =>
			update((state) => ({
				...state, // retain state
				aiAnalysis: aiAnalysis ?? null // store ai payload
			})),
		setBacktest: (backtest) =>
			update((state) => ({
				...state, // retain state
				backtest: backtest ?? null // store backtest payload
			})),
		setWsState: ({ status, error = '' }) =>
			update((state) => ({
				...state, // retain existing data
				wsStatus: status ?? state.wsStatus, // patch ws status
				wsError: error // set latest socket error
			}))
	};
};

export const marketStore = createMarketStore(); // shared market store
