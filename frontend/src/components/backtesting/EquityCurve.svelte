<script>
	import { onMount } from 'svelte'; // chart lifecycle
	import { createChart, LineSeries, AreaSeries } from 'lightweight-charts'; // tv charts

	let { points = [] } = $props(); // equity curve points

	let containerRef = $state(null); // chart container ref
	let chart = null; // chart instance
	let lineSeries = null; // curve series ref
	let areaSeries = null; // fill series ref
	let resizeObserver = null; // resize observer ref

	const normalizedPoints = $derived(() =>
		Array.isArray(points)
			? points.map((point) => ({
				time: Number(point?.index ?? 0), // use index on x-axis
				value: Number(point?.balance ?? 0) // balance on y-axis
			}))
			: []
	);

	const updateData = () => {
		const safePoints = normalizedPoints(); // read normalized points
		lineSeries?.setData(safePoints); // set line data
		areaSeries?.setData(safePoints); // set area data
		chart?.timeScale().fitContent(); // fit x range
	};

	onMount(() => {
		if (!containerRef) return; // wait for container

		chart = createChart(containerRef, {
			layout: {
				background: { color: 'transparent' }, // transparent background
				textColor: '#9eb5d4', // axis text color
				fontFamily: 'Trebuchet MS, Tahoma, Verdana, sans-serif' // chart font
			},
			grid: {
				vertLines: { color: 'rgba(151, 183, 255, 0.08)' }, // vertical grid
				horzLines: { color: 'rgba(151, 183, 255, 0.08)' } // horizontal grid
			},
			rightPriceScale: {
				borderColor: 'rgba(151, 183, 255, 0.12)' // scale border
			},
			timeScale: {
				borderColor: 'rgba(151, 183, 255, 0.12)' // time scale border
			},
			height: 340 // chart height
		});

		areaSeries = chart.addSeries(AreaSeries, {
			lineColor: 'rgba(44, 230, 166, 0.32)', // area line tint
			topColor: 'rgba(44, 230, 166, 0.24)', // area top fill
			bottomColor: 'rgba(44, 230, 166, 0.02)', // area bottom fill
			priceLineVisible: false // hide current value line
		});

		lineSeries = chart.addSeries(LineSeries, {
			color: '#2ce6a6', // equity line color
			lineWidth: 3, // equity line width
			priceLineVisible: false // hide current value line
		});

		updateData(); // set initial data

		resizeObserver = new ResizeObserver(() => {
			if (!containerRef || !chart) return; // guard missing chart
			chart.applyOptions({ width: containerRef.clientWidth }); // sync width
		});

		resizeObserver.observe(containerRef); // watch width changes

		return () => {
			resizeObserver?.disconnect(); // stop observer
			chart?.remove(); // cleanup chart
		};
	});

	$effect(() => {
		updateData(); // refresh series when points change
	});
</script>

<section class="panel equity-curve">
	<div class="equity-curve__header">
		<div>
			<p class="equity-curve__eyebrow">Equity Curve</p>
			<h2>Balance over trade sequence</h2>
		</div>
	</div>

	<div class="equity-curve__surface" bind:this={containerRef}></div>
</section>

<style>
	.equity-curve {
		padding: 22px; /* panel padding */
	}

	.equity-curve__header {
		margin-bottom: 18px; /* spacing below header */
	}

	.equity-curve__eyebrow {
		color: var(--text-dim); /* eyebrow color */
		font-size: 0.8rem; /* eyebrow size */
		text-transform: uppercase; /* uppercase */
		letter-spacing: 0.18em; /* tracking */
	}

	.equity-curve__surface {
		min-height: 340px; /* reserve chart area */
	}
</style>
