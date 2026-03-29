<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { gsap } from 'gsap';
	import api from '$lib/api';
	import { authStore } from '$lib/stores/authStore';
	import CoinDashboardPanel from '$components/dashboard/CoinDashboardPanel.svelte';

	const DASHBOARD_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
	const FIXED_INTERVAL = '1h';
	const POLL_MS = 45000;

	let pageRef = $state(null);
	let pageError = $state('');
	let pollingTimer = null;

	const createPanel = (symbol) => ({
		symbol,
		interval: FIXED_INTERVAL,
		signal: null,
		candles: [],
		loadingSignal: false,
		loadingAI: false,
		error: '',
		aiError: '',
		aiValidation: null
	});

	let panels = $state(DASHBOARD_SYMBOLS.map(createPanel));

	const redirectToLogin = async () => {
		authStore.clearAuth();
		await goto('/login');
	};

	const updatePanel = (symbol, patch) => {
		panels = panels.map((panel) => (panel.symbol === symbol ? { ...panel, ...patch } : panel));
	};

	const normalizeSignalPayload = (payload, symbol) => {
		const indicators = payload?.indicators ?? {};

		return {
			...payload,
			symbol,
			interval: FIXED_INTERVAL,
			indicators: {
				...indicators,
				ema9: indicators.ema9 ?? indicators.fast ?? null,
				ema11: indicators.ema11 ?? indicators.medium ?? null,
				ema45: indicators.ema45 ?? indicators.trend ?? null,
				adr: indicators.adr ?? indicators.atr14 ?? null
			}
		};
	};

	const fetchSignalForSymbol = async (symbol, { silent = false } = {}) => {
		if (!silent) {
			updatePanel(symbol, { loadingSignal: true, error: '' });
		}

		try {
			const response = await api.get('/signal', {
				params: { symbol, interval: FIXED_INTERVAL },
				timeout: 30000
			});

			const payload = response?.data?.data ?? {};
			updatePanel(symbol, {
				signal: normalizeSignalPayload(payload, symbol),
				candles: Array.isArray(payload?.candles) ? payload.candles : [],
				loadingSignal: false,
				error: ''
			});
		} catch (requestError) {
			if (requestError?.response?.status === 401) {
				await redirectToLogin();
				return;
			}

			updatePanel(symbol, {
				loadingSignal: false,
				error:
					requestError?.response?.data?.error ??
					requestError?.response?.data?.message ??
					`Unable to load ${symbol}.`
			});
		}
	};

	const refreshBoard = async ({ silent = false } = {}) => {
		pageError = '';
		await Promise.all(DASHBOARD_SYMBOLS.map((symbol) => fetchSignalForSymbol(symbol, { silent })));

		if (panels.every((panel) => panel.error)) {
			pageError = 'Unable to load the live futures board right now.';
		}
	};

	const runAIValidation = async (symbol) => {
		const auth = get(authStore);
		if (!auth?.token) {
			await redirectToLogin();
			return;
		}

		updatePanel(symbol, { loadingAI: true, aiError: '' });

		try {
			const response = await api.post(
				'/ai/analyze',
				{ symbol, interval: FIXED_INTERVAL },
				{ timeout: 45000 }
			);

			const payload = response?.data?.data ?? {};
			updatePanel(symbol, {
				loadingAI: false,
				aiError: '',
				signal: payload?.quantSignal
					? normalizeSignalPayload(payload.quantSignal, symbol)
					: panels.find((panel) => panel.symbol === symbol)?.signal,
				aiValidation: payload?.aiValidation ?? null
			});
		} catch (requestError) {
			if (requestError?.response?.status === 401) {
				await redirectToLogin();
				return;
			}

			updatePanel(symbol, {
				loadingAI: false,
				aiError:
					requestError?.response?.data?.error ??
					requestError?.response?.data?.message ??
					'Unable to run AI validation right now.'
			});
		}
	};

	onMount(async () => {
		const auth = get(authStore);
		if (!auth?.isAuthenticated || !auth?.token) {
			await goto('/login');
			return;
		}

		if (pageRef) {
			gsap.fromTo(
				pageRef.children,
				{ y: 20, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.6, stagger: 0.07, ease: 'power3.out' }
			);
		}

		await refreshBoard();

		pollingTimer = window.setInterval(() => {
			if (document.visibilityState === 'visible') {
				refreshBoard({ silent: true });
			}
		}, POLL_MS);

		return () => {
			if (pollingTimer) {
				clearInterval(pollingTimer);
			}
		};
	});
</script>

<svelte:head>
	<title>Dashboard | Yukti</title>
</svelte:head>

<section class="dashboard page-shell" bind:this={pageRef}>
	<div class="panel dashboard__hero">
		<div>
			<p class="dashboard__eyebrow">Fixed 1H market board</p>
			<h1>BTC, ETH, and SOL in one view.</h1>
			<p class="dashboard__copy">
				Live Binance futures data powers spot-style signals, with one compact AI validation path per coin.
			</p>
		</div>

		<div class="dashboard__hero-actions">
			<span class="pill mono">3 Coins</span>
			<span class="pill mono">1H Only</span>
			<button class="btn btn-secondary" onclick={() => refreshBoard()} disabled={panels.some((panel) => panel.loadingSignal)}>
				Refresh Board
			</button>
		</div>
	</div>

	{#if pageError}
		<div class="error-banner">{pageError}</div>
	{/if}

	<div class="dashboard__grid">
		{#each panels as panel (panel.symbol)}
			<CoinDashboardPanel {panel} onRunAI={runAIValidation} />
		{/each}
	</div>
</section>

<style>
	.dashboard {
		width: min(100% - 12px, 1540px);
		padding: 10px 0 28px;
		display: grid;
		gap: 12px;
	}

	.dashboard__hero {
		padding: 14px;
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.dashboard__eyebrow {
		color: var(--text-dim);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		margin-bottom: 6px;
	}

	.dashboard__copy {
		max-width: 62ch;
		color: var(--text-soft);
		margin-top: 6px;
	}

	.dashboard__hero-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.dashboard__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		align-items: start;
	}

	@media (max-width: 1180px) {
		.dashboard__grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 760px) {
		.dashboard {
			width: min(100% - 8px, 1540px);
			padding-top: 6px;
			gap: 10px;
		}

		.dashboard__hero {
			padding: 12px;
		}

		.dashboard__grid {
			grid-template-columns: 1fr;
			gap: 10px;
		}

		.dashboard__hero-actions {
			width: 100%;
		}
	}
</style>
