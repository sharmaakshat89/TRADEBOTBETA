<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { gsap } from 'gsap';
	import api from '$lib/api';
	import { authStore } from '$lib/stores/authStore';
	import { marketStore } from '$lib/stores/marketStore';
	import BacktestForm from '$components/backtesting/BacktestForm.svelte';
	import BacktestResultCard from '$components/backtesting/BacktestResultCard.svelte';
	import EquityCurve from '$components/backtesting/EquityCurve.svelte';
	import Loader from '$components/shared/Loader.svelte';
	import {
		allowedIntervals as defaultIntervals,
		allowedSymbols as defaultSymbols,
		backtestLookbacks as defaultLookbacks,
		backtestThresholdPresets,
		getBacktestLookbacksForInterval,
		symbolGroups
	} from '$lib/config/markets';

	let pageRef = $state(null);
	let loading = $state(false);
	let pageError = $state('');
	let source = $state('');
	let allowedSymbols = $state(defaultSymbols);
	let allowedIntervals = $state(defaultIntervals);
	let allowedLookbacks = $state(defaultLookbacks);

	const syncLookbacksForInterval = (interval) => {
		const nextLookbacks = getBacktestLookbacksForInterval(interval);
		allowedLookbacks = nextLookbacks;

		if (!nextLookbacks.includes(get(marketStore).backtestLookback)) {
			marketStore.setBacktestLookback(nextLookbacks[0] ?? '6M');
		}
	};

	const runBacktest = async (event) => {
		event.preventDefault();

		const selection = get(marketStore);
		loading = true;
		pageError = '';
		source = '';

		try {
			const response = await api.post('/backtest', {
				symbol: selection.symbol,
				interval: selection.interval,
				lookback: selection.backtestLookback
			}, {
				timeout: 180000
			});

			source = response?.data?.source ?? '';
			marketStore.setBacktest(response?.data?.data ?? null);
		} catch (requestError) {
			const payload = requestError?.response?.data ?? {};
			pageError = payload?.error ?? payload?.message ?? 'Unable to run backtest.';

			if (Array.isArray(payload?.allowedSymbols)) {
				allowedSymbols = payload.allowedSymbols;
			}

			if (Array.isArray(payload?.allowedIntervals)) {
				allowedIntervals = payload.allowedIntervals;
			}

			if (Array.isArray(payload?.allowedLookbacks)) {
				allowedLookbacks = payload.allowedLookbacks;
			}
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		if (!get(authStore).isAuthenticated) {
			goto('/login');
			return;
		}

		if (pageRef) {
			gsap.fromTo(
				pageRef.children,
				{ y: 24, opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: 0.7,
					stagger: 0.08,
					ease: 'power3.out'
				}
			);
		}

		syncLookbacksForInterval(get(marketStore).interval);
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
		threshold={$marketStore.backtestThreshold}
		loading={loading}
		allowedSymbols={allowedSymbols}
		symbolGroups={symbolGroups}
		allowedIntervals={allowedIntervals}
		allowedLookbacks={allowedLookbacks}
		allowedThresholds={backtestThresholdPresets}
		onSubmit={runBacktest}
		onSymbolChange={(event) => marketStore.setSelection({ symbol: event.currentTarget.value })}
		onIntervalChange={(event) => {
			const nextInterval = event.currentTarget.value;
			marketStore.setSelection({ interval: nextInterval });
			syncLookbacksForInterval(nextInterval);
		}}
		onLookbackChange={(event) => marketStore.setBacktestLookback(event.currentTarget.value)}
		onThresholdChange={(event) => marketStore.setBacktestThreshold(event.currentTarget.value)}
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
		padding: 30px 0 48px;
		display: grid;
		gap: 18px;
	}

	.backtest__loading {
		padding: 28px;
	}
</style>
