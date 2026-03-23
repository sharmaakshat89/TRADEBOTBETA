<script>
	let { signal = null } = $props(); // quant signal payload

	const indicators = $derived(() => signal?.indicators ?? null); // safe indicator access

	const items = $derived(() => {
		if (!indicators()) return []; // no indicators yet

		return [
			{ label: 'RSI', value: indicators().rsi, tone: indicators().rsi > 70 ? 'sell' : indicators().rsi < 30 ? 'buy' : 'neutral' },
			{ label: 'ADX', value: indicators().adx, tone: indicators().adx > 25 ? 'buy' : 'neutral' },
			{ label: 'SuperTrend', value: indicators().supertrend, tone: indicators().supertrend === 1 ? 'buy' : indicators().supertrend === -1 ? 'sell' : 'neutral' },
			{ label: 'HMA', value: indicators().hma, tone: 'neutral' },
			{ label: 'MACD Hist', value: indicators().macdHist, tone: indicators().macdHist > 0 ? 'buy' : indicators().macdHist < 0 ? 'sell' : 'neutral' },
			{ label: 'BB Width', value: indicators().bbWidth, tone: indicators().bbWidth < 0.02 ? 'warn' : 'neutral' },
			{ label: 'MA50', value: indicators().ma50, tone: 'neutral' }
		];
	});
</script>

<section class="panel indicator-panel">
	<div class="indicator-panel__header">
		<div>
			<p class="indicator-panel__eyebrow">Indicator Engine</p>
			<h2>Quant inputs</h2>
		</div>
		{#if signal?.timestamp}
			<span class="pill mono">{new Date(signal.timestamp).toLocaleTimeString()}</span>
		{/if}
	</div>

	{#if !items().length}
		<p class="indicator-panel__empty">Indicators will appear after the first signal response.</p>
	{:else}
		<div class="indicator-panel__grid">
			{#each items() as item}
				<article class="indicator-panel__card">
					<span>{item.label}</span>
					<strong class:item-buy={item.tone === 'buy'} class:item-sell={item.tone === 'sell'} class:item-warn={item.tone === 'warn'}>
						{item.value}
					</strong>
				</article>
			{/each}
		</div>
	{/if}
</section>

<style>
	.indicator-panel {
		padding: 22px; /* panel padding */
	}

	.indicator-panel__header {
		display: flex; /* header row */
		align-items: center; /* align header content */
		justify-content: space-between; /* split heading and badge */
		gap: 16px; /* header spacing */
		margin-bottom: 18px; /* spacing after header */
	}

	.indicator-panel__eyebrow {
		color: var(--text-dim); /* eyebrow color */
		font-size: 0.8rem; /* eyebrow size */
		text-transform: uppercase; /* uppercase eyebrow */
		letter-spacing: 0.18em; /* tracking */
	}

	.indicator-panel__grid {
		display: grid; /* indicator grid */
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* responsive grid */
		gap: 12px; /* card gap */
	}

	.indicator-panel__card {
		padding: 16px; /* card padding */
		border-radius: 18px; /* card radius */
		background: rgba(255, 255, 255, 0.04); /* card bg */
		border: 1px solid rgba(151, 183, 255, 0.08); /* card border */
		display: grid; /* stack text */
		gap: 8px; /* item spacing */
	}

	.indicator-panel__card span {
		color: var(--text-dim); /* card label */
		font-size: 0.84rem; /* card label size */
	}

	.indicator-panel__card strong {
		font-size: 1.22rem; /* value size */
	}

	.item-buy {
		color: var(--buy); /* bullish text */
	}

	.item-sell {
		color: var(--sell); /* bearish text */
	}

	.item-warn {
		color: var(--warn); /* warning text */
	}

	.indicator-panel__empty {
		color: var(--text-soft); /* empty state color */
	}
</style>
