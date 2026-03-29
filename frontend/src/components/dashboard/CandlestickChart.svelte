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
	let emaSeries = null;
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

		const ema45Series = signal?.indicatorSeries?.ema45 ?? signal?.indicatorSeries?.ema50 ?? [];
		if (showEmaOverlay && priceCandles.length && Array.isArray(ema45Series)) {
			const points = priceCandles
				.slice(-ema45Series.length)
				.map((candle, index) => ({ time: candle.time, value: ema45Series[index] }))
				.filter((point) => Number.isFinite(point.value));
			emaSeries?.setData(points);
		} else {
			emaSeries?.setData([]);
		}

		chart.timeScale().fitContent();
	};

	onMount(() => {
		if (!containerRef) return;

		chart = createChart(containerRef, {
			layout: {
				background: { color: 'transparent' },
				textColor: '#9eb5d4',
				fontFamily: 'Trebuchet MS, Tahoma, Verdana, sans-serif',
				fontSize: compact ? 9 : 12
			},
			grid: {
				vertLines: { color: 'rgba(151, 183, 255, 0.08)' },
				horzLines: { color: 'rgba(151, 183, 255, 0.08)' }
			},
			rightPriceScale: {
				borderColor: 'rgba(151, 183, 255, 0.12)'
			},
			timeScale: {
				borderColor: 'rgba(151, 183, 255, 0.12)',
				timeVisible: true,
				secondsVisible: false
			},
			crosshair: {
				vertLine: { color: 'rgba(99, 164, 255, 0.35)' },
				horzLine: { color: 'rgba(99, 164, 255, 0.2)' }
			},
			height: getChartHeight()
		});

		candleSeries = chart.addSeries(CandlestickSeries, {
			upColor: '#2ce6a6',
			downColor: '#ff6b81',
			borderVisible: false,
			wickUpColor: '#2ce6a6',
			wickDownColor: '#ff6b81'
		});

		if (showEmaOverlay) {
			emaSeries = chart.addSeries(LineSeries, {
				color: '#63a4ff',
				lineWidth: 2,
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
					<span><i class="ema"></i> EMA 45</span>
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
		color: var(--text-dim);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
	}

	.chart-panel__legend {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		color: var(--text-soft);
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
		background: var(--buy);
	}

	.chart-panel__legend i.ema {
		background: var(--brand);
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
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
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
