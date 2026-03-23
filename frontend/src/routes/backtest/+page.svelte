<script>
	import { onMount } from 'svelte'; // lifecycle for guard and animation
	import { goto } from '$app/navigation'; // redirect helper
	import { get } from 'svelte/store'; // read auth snapshot
	import { gsap } from 'gsap'; // page animation
	import api from '$lib/api'; // axios client
	import { authStore } from '$lib/stores/authStore'; // auth state
	import { marketStore } from '$lib/stores/marketStore'; // shared selection and result store
	import BacktestForm from '$components/backtesting/BacktestForm.svelte'; // backtest form
	import BacktestResultCard from '$components/backtesting/BacktestResultCard.svelte'; // result summary
	import EquityCurve from '$components/backtesting/EquityCurve.svelte'; // curve chart
	import Loader from '$components/shared/Loader.svelte'; // loading component
	import {
		allowedIntervals as defaultIntervals,
		allowedSymbols as defaultSymbols,
		backtestLookbacks as defaultLookbacks,
		symbolGroups
	} from '$lib/config/markets'; // shared market options

	let pageRef = $state(null); // route wrapper ref
	let loading = $state(false); // request loading state
	let pageError = $state(''); // page error text
	let source = $state(''); // result source from backend
	let allowedSymbols = $state(defaultSymbols); // default backend symbols
	let allowedIntervals = $state(defaultIntervals); // default backend intervals
	let allowedLookbacks = $state(defaultLookbacks); // default backend lookbacks

	const runBacktest = async (event) => {
		event.preventDefault(); // stop native submit

		const selection = get(marketStore); // read selected values
		loading = true; // start loading
		pageError = ''; // clear previous error
		source = ''; // clear previous source

		try {
			const response = await api.post('/backtest', {
				symbol: selection.symbol, // backend body symbol
				interval: selection.interval, // backend body interval
				lookback: selection.backtestLookback // historical range preset
			});

			source = response?.data?.source ?? ''; // track cache/api source
			marketStore.setBacktest(response?.data?.data ?? null); // store full result payload
		} catch (requestError) {
			const payload = requestError?.response?.data ?? {}; // normalize error payload
			pageError = payload?.error ?? payload?.message ?? 'Unable to run backtest.'; // read error shape

			if (Array.isArray(payload?.allowedSymbols)) {
				allowedSymbols = payload.allowedSymbols; // adopt backend whitelist
			}

			if (Array.isArray(payload?.allowedIntervals)) {
				allowedIntervals = payload.allowedIntervals; // adopt backend whitelist
			}

			if (Array.isArray(payload?.allowedLookbacks)) {
				allowedLookbacks = payload.allowedLookbacks; // adopt backend lookbacks
			}
		} finally {
			loading = false; // always stop loading
		}
	};

	onMount(() => {
		if (!get(authStore).isAuthenticated) {
			goto('/login'); // protect route
			return; // stop init
		}

		if (pageRef) {
			gsap.fromTo(
				pageRef.children,
				{ y: 24, opacity: 0 }, // initial hidden state
				{
					y: 0, // final position
					opacity: 1, // final visibility
					duration: 0.7, // reveal duration
					stagger: 0.08, // section stagger
					ease: 'power3.out' // smooth ease
				}
			);
		}
	});
</script>

<svelte:head>
	<title>Backtest | Yukti</title>
</svelte:head>

<section class="backtest page-shell" bind:this={pageRef}>
	<BacktestForm
		symbol={$marketStore.symbol}
		interval={$marketStore.interval}
		lookback={$marketStore.backtestLookback}
		loading={loading}
		allowedSymbols={allowedSymbols}
		symbolGroups={symbolGroups}
		allowedIntervals={allowedIntervals}
		allowedLookbacks={allowedLookbacks}
		onSubmit={runBacktest}
		onSymbolChange={(event) => marketStore.setSelection({ symbol: event.currentTarget.value })}
		onIntervalChange={(event) => marketStore.setSelection({ interval: event.currentTarget.value })}
		onLookbackChange={(event) => marketStore.setBacktestLookback(event.currentTarget.value)}
	/>

	{#if pageError}
		<div class="error-banner">{pageError}</div>
	{/if}

	{#if loading && !$marketStore.backtest}
		<div class="panel backtest__loading">
			<Loader label="Running historical simulation" />
		</div>
	{/if}

	<BacktestResultCard result={$marketStore.backtest} source={source} />
	<EquityCurve points={$marketStore.backtest?.equityCurve ?? []} />
</section>

<style>
	.backtest {
		padding: 30px 0 48px; /* page spacing */
		display: grid; /* stack page sections */
		gap: 18px; /* section gap */
	}

	.backtest__loading {
		padding: 28px; /* loading panel padding */
	}
</style>
