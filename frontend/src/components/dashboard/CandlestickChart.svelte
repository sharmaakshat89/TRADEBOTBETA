<script>
	import { onMount } from 'svelte'; // chart lifecycle
	import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts'; // tv charts

	let { candles = [], signal = null } = $props(); // chart data props

	let containerRef = $state(null); // main chart container
	let chart = null; // chart instance
	let candleSeries = null; // candle series ref
	let maSeries = null; // ma50 line ref
	let hmaSeries = null; // hma line ref
	let macdSeries = null; // macd histogram ref
	let resizeObserver = null; // resize observer ref

	const updateSeries = () => {
		if (!chart || !candleSeries) return; // wait for chart init

		candleSeries.setData(Array.isArray(candles) ? candles : []); // render candles safely

		const series = signal?.indicatorSeries ?? {}; // read signal series safely
		const priceCandles = Array.isArray(candles) ? candles : []; // normalize candle data

		if (priceCandles.length && Array.isArray(series.ma50)) {
			const points = priceCandles
				.slice(-series.ma50.length) // align MA to latest candles
				.map((candle, index) => ({ time: candle.time, value: series.ma50[index] })) // create line points
				.filter((point) => Number.isFinite(point.value)); // drop invalid values
			maSeries?.setData(points); // draw MA line
		} else {
			maSeries?.setData([]); // clear stale MA line
		}

		if (priceCandles.length && Array.isArray(series.hma)) {
			const points = priceCandles
				.slice(-series.hma.length) // align HMA to latest candles
				.map((candle, index) => ({ time: candle.time, value: series.hma[index] })) // create HMA points
				.filter((point) => Number.isFinite(point.value)); // drop invalid values
			hmaSeries?.setData(points); // draw HMA line
		} else {
			hmaSeries?.setData([]); // clear stale HMA line
		}

		if (priceCandles.length && Array.isArray(series.macd)) {
			const points = priceCandles
				.slice(-series.macd.length) // align MACD bars to candles
				.map((candle, index) => ({
					time: candle.time, // same x scale as candles
					value: series.macd[index], // histogram value
					color: series.macd[index] >= 0 ? 'rgba(44, 230, 166, 0.6)' : 'rgba(255, 107, 129, 0.6)' // colored bar
				}))
				.filter((point) => Number.isFinite(point.value)); // remove invalid bars
			macdSeries?.setData(points); // render histogram
		} else {
			macdSeries?.setData([]); // clear stale histogram
		}

		chart.timeScale().fitContent(); // keep visible range sane
	};

	onMount(() => {
		if (!containerRef) return; // guard missing container

		chart = createChart(containerRef, {
			layout: {
				background: { color: 'transparent' }, // transparent chart bg
				textColor: '#9eb5d4', // axis text color
				fontFamily: 'Trebuchet MS, Tahoma, Verdana, sans-serif' // chart font
			},
			grid: {
				vertLines: { color: 'rgba(151, 183, 255, 0.08)' }, // vertical grid
				horzLines: { color: 'rgba(151, 183, 255, 0.08)' } // horizontal grid
			},
			rightPriceScale: {
				borderColor: 'rgba(151, 183, 255, 0.12)' // price scale border
			},
			timeScale: {
				borderColor: 'rgba(151, 183, 255, 0.12)', // time scale border
				timeVisible: true, // show timestamps
				secondsVisible: false // hide seconds
			},
			crosshair: {
				vertLine: { color: 'rgba(99, 164, 255, 0.35)' }, // vertical crosshair color
				horzLine: { color: 'rgba(99, 164, 255, 0.2)' } // horizontal crosshair color
			},
			height: 520 // chart height
		});

		candleSeries = chart.addSeries(CandlestickSeries, {
			upColor: '#2ce6a6', // green candles
			downColor: '#ff6b81', // red candles
			borderVisible: false, // cleaner look
			wickUpColor: '#2ce6a6', // green wick
			wickDownColor: '#ff6b81' // red wick
		});

		maSeries = chart.addSeries(LineSeries, {
			color: '#63a4ff', // MA color
			lineWidth: 2, // MA stroke
			priceLineVisible: false // hide current price line
		});

		hmaSeries = chart.addSeries(LineSeries, {
			color: '#ffc857', // HMA color
			lineWidth: 2, // HMA stroke
			priceLineVisible: false // hide current price line
		});

		macdSeries = chart.addSeries(HistogramSeries, {
			priceScaleId: '', // separate overlay scale
			priceLineVisible: false, // cleaner histogram
			lastValueVisible: false // hide latest macd label
		});

		updateSeries(); // render initial dataset

		resizeObserver = new ResizeObserver(() => {
			if (!containerRef || !chart) return; // guard missing chart
			chart.applyOptions({ width: containerRef.clientWidth }); // sync chart width
		});

		resizeObserver.observe(containerRef); // watch container size

		return () => {
			resizeObserver?.disconnect(); // stop resize observer
			chart?.remove(); // cleanup chart
		};
	});

	$effect(() => {
		updateSeries(); // update chart when props change
	});
</script>

<section class="panel chart-panel">
	<div class="chart-panel__header">
		<div>
			<p class="chart-panel__eyebrow">TradingView Charts</p>
			<h2>Live 1-hour structure</h2>
		</div>
		<div class="chart-panel__legend">
			<span><i class="buy"></i> Candles</span>
			<span><i class="ma"></i> MA50</span>
			<span><i class="hma"></i> HMA</span>
		</div>
	</div>

	<div class="chart-panel__surface" bind:this={containerRef}></div>
</section>

<style>
	.chart-panel {
		padding: 22px; /* panel padding */
	}

	.chart-panel__header {
		display: flex; /* header layout */
		align-items: center; /* align items */
		justify-content: space-between; /* split header */
		gap: 16px; /* spacing */
		margin-bottom: 18px; /* spacing below header */
		flex-wrap: wrap; /* allow wrapping */
	}

	.chart-panel__eyebrow {
		color: var(--text-dim); /* eyebrow color */
		font-size: 0.8rem; /* eyebrow size */
		text-transform: uppercase; /* uppercase */
		letter-spacing: 0.18em; /* tracking */
	}

	.chart-panel__legend {
		display: flex; /* legend row */
		gap: 14px; /* legend spacing */
		flex-wrap: wrap; /* wrap on small screens */
		color: var(--text-soft); /* legend text */
		font-size: 0.88rem; /* legend text size */
	}

	.chart-panel__legend span {
		display: inline-flex; /* align dot and label */
		align-items: center; /* vertical align */
		gap: 8px; /* dot spacing */
	}

	.chart-panel__legend i {
		width: 10px; /* legend dot */
		height: 10px; /* legend dot */
		border-radius: 999px; /* circle dot */
		display: inline-block; /* render dot */
	}

	.chart-panel__legend i.buy {
		background: var(--buy); /* candle legend */
	}

	.chart-panel__legend i.ma {
		background: var(--brand); /* MA legend */
	}

	.chart-panel__legend i.hma {
		background: var(--warn); /* HMA legend */
	}

	.chart-panel__surface {
		min-height: 520px; /* reserve chart height */
	}
</style>
