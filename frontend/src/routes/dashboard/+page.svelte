<script>
	import { onMount } from 'svelte'; // lifecycle for guard and init
	import { goto } from '$app/navigation'; // redirect helper
	import { get } from 'svelte/store'; // read auth snapshot
	import { gsap } from 'gsap'; // page animation
	import api from '$lib/api'; // axios client
	import websocketManager from '$lib/websocket'; // socket singleton
	import { authStore } from '$lib/stores/authStore'; // auth state
	import { marketStore } from '$lib/stores/marketStore'; // market state
	import SymbolDropdown from '$components/dashboard/SymbolDropdown.svelte'; // symbol selector
	import IntervalDropdown from '$components/dashboard/IntervalDropdown.svelte'; // interval selector
	import CandlestickChart from '$components/dashboard/CandlestickChart.svelte'; // chart component
	import IndicatorPanel from '$components/dashboard/IndicatorPanel.svelte'; // indicator component
	import SignalCard from '$components/dashboard/SignalCard.svelte'; // signal card
	import AIAdvicePanel from '$components/dashboard/AIAdvicePanel.svelte'; // ai panel
	import Loader from '$components/shared/Loader.svelte'; // loading component
	import { allowedIntervals, symbolGroups } from '$lib/config/markets'; // shared market options

	let pageRef = $state(null); // page wrapper ref
	let loadingSignal = $state(false); // signal request loading
	let loadingAI = $state(false); // ai request loading
	let pageError = $state(''); // route level error
	let aiError = $state(''); // ai panel error

	const refreshSignal = async () => {
		const state = get(marketStore); // read market selection
		loadingSignal = true; // start signal loading
		pageError = ''; // clear old error

		try {
			const response = await api.get('/signal', {
				params: {
					symbol: state.symbol, // backend query param
					interval: state.interval // backend query param
				}
			});

			const payload = response?.data?.data ?? {}; // normalize signal payload
			marketStore.setSignal(payload ?? null); // store raw signal payload
			marketStore.setCandles(payload?.candles ?? []); // ensure chart has immediate data
		} catch (requestError) {
			pageError =
				requestError?.response?.data?.error ??
				requestError?.response?.data?.message ??
				'Unable to fetch signal.'; // support both backend shapes
		} finally {
			loadingSignal = false; // stop signal loading
		}
	};

	const refreshAI = async () => {
		const state = get(marketStore); // read market selection
		loadingAI = true; // start ai loading
		aiError = ''; // clear stale ai error

		try {
			const response = await api.post('/ai/analyze', {
				symbol: state.symbol, // backend body shape
				interval: state.interval // backend body shape
			});

			const payload = response?.data?.data ?? {}; // ai response payload
			marketStore.setSignal(payload?.quantSignal ?? get(marketStore).signal); // keep quant payload synced
			marketStore.setAIAnalysis(payload?.aiValidation ?? null); // store ai validation
		} catch (requestError) {
			aiError =
				requestError?.response?.data?.error ??
				requestError?.response?.data?.message ??
				'Unable to fetch AI analysis.'; // support both error and message
		} finally {
			loadingAI = false; // stop ai loading
		}
	};

	const updateSelection = async ({ symbol, interval }) => {
		marketStore.setSelection({ symbol, interval }); // store selection change
		marketStore.setAIAnalysis(null); // reset stale ai result on selection change
		websocketManager.subscribe({ symbol, interval }); // re-subscribe live feed
		await refreshSignal(); // refresh quant signal for new selection
	};

	onMount(async () => {
		if (!get(authStore).isAuthenticated) {
			goto('/login'); // protect dashboard route
			return; // stop dashboard init
		}

		if (pageRef) {
			gsap.fromTo(
				pageRef.children,
				{ y: 24, opacity: 0 }, // initial hidden state
				{
					y: 0, // final position
					opacity: 1, // final opacity
					duration: 0.7, // reveal duration
					stagger: 0.08, // sequential reveal
					ease: 'power3.out' // smooth easing
				}
			);
		}

		websocketManager.connect(); // start live market feed
		await refreshSignal(); // fetch initial signal

		return () => {
			websocketManager.close(); // clean socket on route leave
		};
	});
</script>

<svelte:head>
	<title>Dashboard | Yukti</title>
</svelte:head>

<section class="dashboard page-shell" bind:this={pageRef}>
	<div class="panel dashboard__toolbar">
		<div class="dashboard__toolbar-grid">
			<SymbolDropdown
				value={$marketStore.symbol}
				groups={symbolGroups}
				onchange={(event) => updateSelection({ symbol: event.currentTarget.value })}
			/>
			<IntervalDropdown
				value={$marketStore.interval}
				options={allowedIntervals}
				onchange={(event) => updateSelection({ interval: event.currentTarget.value })}
			/>
		</div>

		<div class="dashboard__toolbar-actions">
			<div class="pill">WS: {$marketStore.wsStatus}</div>
			<button class="btn btn-secondary" onclick={refreshSignal} disabled={loadingSignal}>
				{loadingSignal ? 'Refreshing...' : 'Refresh Signal'}
			</button>
			<button class="btn btn-primary" onclick={refreshAI} disabled={loadingAI}>
				{loadingAI ? 'Analyzing...' : 'Run AI Analysis'}
			</button>
		</div>
	</div>

	{#if pageError}
		<div class="error-banner">{pageError}</div>
	{/if}

	<div class="dashboard__grid">
		<div class="dashboard__main">
			<CandlestickChart candles={$marketStore.candles} signal={$marketStore.signal} />
			<IndicatorPanel signal={$marketStore.signal} />
		</div>

		<div class="dashboard__side">
			{#if loadingSignal && !$marketStore.signal}
				<div class="panel dashboard__loading">
					<Loader label="Loading signal" />
				</div>
			{:else}
				<SignalCard signal={$marketStore.signal} currentPrice={$marketStore.candles.at(-1)?.close} />
			{/if}

			<AIAdvicePanel aiValidation={$marketStore.aiAnalysis} loading={loadingAI} error={aiError} />
		</div>
	</div>
</section>

<style>
	.dashboard {
		width: min(100% - 10px, 1380px);
		padding: 10px 0 28px;
		display: grid;
		gap: 10px;
	}

	.dashboard__toolbar {
		padding: 10px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.dashboard__toolbar-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(150px, 190px));
		gap: 10px;
		flex: 1;
	}

	.dashboard__toolbar-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.dashboard__grid {
		display: grid;
		grid-template-columns: minmax(0, 2.65fr) minmax(250px, 0.72fr);
		gap: 10px;
		align-items: start;
	}

	.dashboard__main,
	.dashboard__side {
		display: grid;
		gap: 10px;
	}

	.dashboard__loading {
		padding: 20px;
	}

	@media (max-width: 1024px) {
		.dashboard__grid {
			grid-template-columns: 1fr;
		}

		.dashboard__side {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 760px) {
		.dashboard {
			width: min(100% - 8px, 1400px);
			padding-top: 6px;
		}

		.dashboard__toolbar-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			width: 100%;
		}

		.dashboard__toolbar-actions {
			width: 100%;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.dashboard__toolbar-actions .pill {
			grid-column: 1 / -1;
			justify-content: center;
		}

		.dashboard__side {
			grid-template-columns: 1fr;
		}

		.dashboard__main,
		.dashboard__side {
			gap: 8px;
		}
	}

	@media (max-width: 520px) {
		.dashboard__toolbar {
			padding: 10px;
		}

		.dashboard__toolbar-grid,
		.dashboard__toolbar-actions {
			grid-template-columns: 1fr;
		}
	}
</style>
