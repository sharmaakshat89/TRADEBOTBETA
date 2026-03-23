import { get } from 'svelte/store'; // read auth store values
import { authStore } from '$lib/stores/authStore'; // auth state for token
import { marketStore } from '$lib/stores/marketStore'; // market selection store

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000'; // websocket endpoint

class WebSocketManager {
	socket = null; // active socket instance
	reconnectTimer = null; // reconnect timeout id
	heartbeatTimer = null; // local heartbeat watcher
	reconnectAttempts = 0; // reconnect counter
	manuallyClosed = false; // prevent reconnect after explicit close

	connect() {
		if (typeof window === 'undefined') return; // skip SSR
		if (this.socket && this.socket.readyState <= 1) return; // avoid duplicate connect

		const auth = get(authStore); // read latest auth
		const token = auth?.token ?? ''; // read JWT if present
		const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL; // append token query

		this.manuallyClosed = false; // mark socket as expected
		marketStore.setWsState({ status: 'connecting', error: '' }); // update UI state
		this.socket = new WebSocket(url); // create native websocket

		this.socket.onopen = () => {
			this.reconnectAttempts = 0; // reset reconnect count
			marketStore.setWsState({ status: 'connected', error: '' }); // show connected state
			this.startHeartbeat(); // start local heartbeat timer
			this.subscribe(); // subscribe current selection
		};

		this.socket.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data); // parse backend message

				if (payload?.type === 'CANDLE_DATA' && Array.isArray(payload?.data)) {
					marketStore.setCandles(payload.data); // push candle payload
				}
			} catch (error) {
				console.error('[ws] message parse failed', error); // log malformed message
			}
		};

		this.socket.onerror = () => {
			marketStore.setWsState({
				status: 'error', // show socket error
				error: 'Live feed error. Attempting reconnect.'
			});
		};

		this.socket.onclose = () => {
			this.stopHeartbeat(); // clear timers on close

			if (!this.manuallyClosed) {
				marketStore.setWsState({
					status: 'reconnecting', // show reconnect state
					error: 'Live feed disconnected. Reconnecting.'
				});
				this.scheduleReconnect(); // recover automatically
			} else {
				marketStore.setWsState({ status: 'disconnected', error: '' }); // explicit close
			}
		};
	}

	subscribe(selection) {
		const state = get(marketStore); // read current market selection
		const auth = get(authStore); // read current auth
		const symbol = selection?.symbol ?? state.symbol; // normalize symbol
		const interval = selection?.interval ?? state.interval; // normalize interval

		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return; // only send on open socket

		this.socket.send(
			JSON.stringify({
				type: 'SUBSCRIBE', // backend listens for subscribe type
				symbol, // selected market symbol
				interval, // selected interval
				token: auth?.token ?? null // extra token field for future backend support
			})
		);
	}

	close() {
		this.manuallyClosed = true; // disable reconnect loop
		this.stopHeartbeat(); // clear timers
		clearTimeout(this.reconnectTimer); // cancel reconnect timeout
		this.reconnectTimer = null; // clear timeout reference
		this.socket?.close(); // close socket if open
		this.socket = null; // release socket ref
	}

	startHeartbeat() {
		this.stopHeartbeat(); // clear previous timer
		this.heartbeatTimer = window.setInterval(() => {
			if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
				this.stopHeartbeat(); // stop when socket is not open
			}
		}, 30000); // check socket every 30s
	}

	stopHeartbeat() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer); // clear heartbeat timer
			this.heartbeatTimer = null; // release timer ref
		}
	}

	scheduleReconnect() {
		clearTimeout(this.reconnectTimer); // avoid stacked reconnects
		const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 12000); // bounded exponential backoff
		this.reconnectAttempts += 1; // increment attempts after computing delay
		this.reconnectTimer = window.setTimeout(() => this.connect(), delay); // reconnect after delay
	}
}

export const websocketManager = new WebSocketManager(); // singleton manager
export default websocketManager; // default export
