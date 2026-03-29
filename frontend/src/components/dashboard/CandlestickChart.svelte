<script>
	import { onMount } from 'svelte';
	import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

	let {
		candles = [],
		signal = null,
		heading = 'Live futures structure',
		eyebrow = 'TradingView Charts',
		showLegend = true,
		showEmaOverlay = true,
		compact = false
	} = $props();

	let containerRef = $state(null);
	let chart = null;
	let candleSeries = null;
	let ema9Series = null;
	let ema11Series = null;
	let ema45Series = null;
	let resizeObserver = null;

	const getChartHeight = () => {
		if (typeof window === 'undefined') return compact ? 320 : 560;
		if (compact) {
			if (window.innerWidth <= 640) return Math.max(260, Math.min(window.innerHeight * 0.34, 320));
			if (window.innerWidth <= 1024) return 300;
			return 320;
		}
		if (window.innerWidth <= 640) return Math.max(420, Math.min(window.innerHeight * 0.62, 560));
		if (window.innerWidth <= 1024) return 500;
		return 560;
	};

	const updateSeries = () => {
		if (!chart || !candleSeries) return;

		const priceCandles = Array.isArray(candles) ? candles : [];
		candleSeries.setData(priceCandles);

		const toOverlayPoints = (series) =>
			priceCandles
				.slice(-series.length)
				.map((candle, index) => ({ time: candle.time, value: series[index] }))
				.filter((point) => Number.isFinite(point.value));

		if (showEmaOverlay && priceCandles.length) {
			const ema9Values = signal?.indicatorSeries?.ema9 ?? [];
			const ema11Values = signal?.indicatorSeries?.ema11 ?? [];
			const ema45Values = signal?.indicatorSeries?.ema45 ?? signal?.indicatorSeries?.ema50 ?? [];
			ema9Series?.setData(Array.isArray(ema9Values) ? toOverlayPoints(ema9Values) : []);
			ema11Series?.setData(Array.isArray(ema11Values) ? toOverlayPoints(ema11Values) : []);
			ema45Series?.setData(Array.isArray(ema45Values) ? toOverlayPoints(ema45Values) : []);
		} else {
			ema9Series?.setData([]);
			ema11Series?.setData([]);
			ema45Series?.setData([]);
		}

		chart.timeScale().fitContent();
	};

	onMount(() => {
		if (!containerRef) return;

		chart = createChart(containerRef, {
			layout: {
				background: { color: 'transparent' },
				textColor: 'rgba(255,255,255,0.72)',
				fontFamily: '"PP Neue Machina", "Neue Machina", "Trebuchet MS", sans-serif',
				fontSize: compact ? 9 : 12
			},
			grid: {
				vertLines: { color: 'rgba(255, 255, 255, 0.06)' },
				horzLines: { color: 'rgba(255, 255, 255, 0.06)' }
			},
			rightPriceScale: {
				borderColor: 'rgba(255, 255, 255, 0.14)'
			},
			timeScale: {
				borderColor: 'rgba(255, 255, 255, 0.14)',
				timeVisible: true,
				secondsVisible: false
			},
			crosshair: {
				vertLine: { color: 'rgba(255, 255, 255, 0.24)' },
				horzLine: { color: 'rgba(255, 255, 255, 0.16)' }
			},
			height: getChartHeight()
		});

		candleSeries = chart.addSeries(CandlestickSeries, {
			upColor: '#24c26a',
			downColor: '#e5484d',
			borderVisible: false,
			wickUpColor: '#24c26a',
			wickDownColor: '#e5484d'
		});

		if (showEmaOverlay) {
			ema9Series = chart.addSeries(LineSeries, {
				color: '#f5f5f2',
				lineWidth: 1.8,
				priceLineVisible: false
			});

			ema11Series = chart.addSeries(LineSeries, {
				color: '#a8a8a2',
				lineWidth: 1.6,
				priceLineVisible: false
			});

			ema45Series = chart.addSeries(LineSeries, {
				color: '#8c9aa5',
				lineWidth: 1.8,
				priceLineVisible: false
			});
		}

		updateSeries();

		resizeObserver = new ResizeObserver(() => {
			if (!containerRef || !chart) return;
			chart.applyOptions({ width: containerRef.clientWidth, height: getChartHeight() });
		});

		resizeObserver.observe(containerRef);

		return () => {
			resizeObserver?.disconnect();
			chart?.remove();
		};
	});

	$effect(() => {
		updateSeries();
	});
</script>

<section class="panel chart-panel">
	<div class="chart-panel__header">
		<div>
			<p class="chart-panel__eyebrow">{eyebrow}</p>
			<h2>{heading}</h2>
		</div>
		{#if showLegend}
			<div class="chart-panel__legend">
				<span><i class="buy"></i> Candles</span>
				{#if showEmaOverlay}
					<span><i class="ema9"></i> EMA 9</span>
					<span><i class="ema11"></i> EMA 11</span>
					<span><i class="ema45"></i> EMA 45</span>
				{/if}
			</div>
		{/if}
	</div>

	<div class="chart-panel__surface" bind:this={containerRef}></div>
</section>

<style>
	.chart-panel {
		padding: 14px;
	}

	.chart-panel__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}

	.chart-panel__eyebrow {
		color: rgba(255, 255, 255, 0.45);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
	}

	.chart-panel__legend {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		color: rgba(255, 255, 255, 0.68);
		font-size: 0.8rem;
	}

	.chart-panel__legend span {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.chart-panel__legend i {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		display: inline-block;
	}

	.chart-panel__legend i.buy {
		background: #24c26a;
	}

	.chart-panel__legend i.ema9 {
		background: #f5f5f2;
	}

	.chart-panel__legend i.ema11 {
		background: #a8a8a2;
	}

	.chart-panel__legend i.ema45 {
		background: #8c9aa5;
	}

	.chart-panel__surface {
		min-height: 560px;
		border-radius: 16px;
		overflow: hidden;
	}

	:global(.coin-panel) .chart-panel {
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
	}

	:global(.coin-panel) .chart-panel__header {
		margin-bottom: 8px;
	}

	:global(.coin-panel) .chart-panel__surface {
		min-height: 0;
		border-radius: 14px;
		background: #050505;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	@media (max-width: 640px) {
		.chart-panel {
			padding: 10px;
		}

		.chart-panel__surface {
			min-height: 420px;
		}
	}
</style>
