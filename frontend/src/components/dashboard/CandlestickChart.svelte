<script>
	import { onMount } from 'svelte';
	import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

	let { candles = [], signal = null } = $props();

	let containerRef = $state(null);
	let chart = null;
	let candleSeries = null;
	let emaSeries = null;
	let resizeObserver = null;

	const getChartHeight = () => {
		if (typeof window === 'undefined') return 560;
		if (window.innerWidth <= 640) return Math.max(420, Math.min(window.innerHeight * 0.62, 560));
		if (window.innerWidth <= 1024) return 500;
		return 560;
	};

	const updateSeries = () => {
		if (!chart || !candleSeries) return;

		const priceCandles = Array.isArray(candles) ? candles : [];
		candleSeries.setData(priceCandles);

		const ema50Series = signal?.indicatorSeries?.ema50 ?? [];
		if (priceCandles.length && Array.isArray(ema50Series)) {
			const points = priceCandles
				.slice(-ema50Series.length)
				.map((candle, index) => ({ time: candle.time, value: ema50Series[index] }))
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
				fontFamily: 'Trebuchet MS, Tahoma, Verdana, sans-serif'
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

		emaSeries = chart.addSeries(LineSeries, {
			color: '#63a4ff',
			lineWidth: 2,
			priceLineVisible: false
		});

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
			<p class="chart-panel__eyebrow">TradingView Charts</p>
			<h2>Live futures structure</h2>
		</div>
		<div class="chart-panel__legend">
			<span><i class="buy"></i> Candles</span>
			<span><i class="ema"></i> EMA50</span>
		</div>
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

	@media (max-width: 640px) {
		.chart-panel {
			padding: 10px;
		}

		.chart-panel__surface {
			min-height: 420px;
		}
	}
</style>
