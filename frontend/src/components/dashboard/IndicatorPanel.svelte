<script>
	let { signal = null } = $props();

	const indicators = $derived(() => signal?.indicators ?? null);
	const context = $derived(() => signal?.context ?? null);

	const items = $derived(() => {
		if (!indicators()) return [];

		return [
			{ label: 'Regime', value: signal?.regime ?? 'NO_TRADE', tone: signal?.regime === 'TREND' ? 'buy' : 'warn' },
			{ label: 'EMA50', value: indicators().ema50, tone: 'neutral' },
			{ label: 'RSI14', value: indicators().rsi, tone: indicators().rsi > 60 ? 'buy' : indicators().rsi < 40 ? 'sell' : 'neutral' },
			{ label: 'ADX14', value: indicators().adx, tone: indicators().adx > 22 ? 'buy' : 'warn' },
			{ label: 'ATR14', value: indicators().atr14, tone: 'neutral' },
			{ label: 'ATR50', value: indicators().atr50, tone: 'neutral' },
			{ label: 'Structure', value: indicators().structure, tone: indicators().structure > 0 ? 'buy' : indicators().structure < 0 ? 'sell' : 'neutral' },
			{ label: 'Funding', value: indicators().fundingRate, tone: indicators().fundingRate > 0 ? 'sell' : indicators().fundingRate < 0 ? 'buy' : 'neutral' },
			{ label: 'Context Phi', value: context()?.phi, tone: context()?.phi > 0 ? 'buy' : 'sell' }
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
		padding: 22px;
	}

	.indicator-panel__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
	}

	.indicator-panel__eyebrow {
		color: var(--text-dim);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
	}

	.indicator-panel__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 12px;
	}

	.indicator-panel__card {
		padding: 16px;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(151, 183, 255, 0.08);
		display: grid;
		gap: 8px;
	}

	.indicator-panel__card span {
		color: var(--text-dim);
		font-size: 0.84rem;
	}

	.indicator-panel__card strong {
		font-size: 1.22rem;
	}

	.item-buy {
		color: var(--buy);
	}

	.item-sell {
		color: var(--sell);
	}

	.item-warn {
		color: var(--warn);
	}

	.indicator-panel__empty {
		color: var(--text-soft);
	}
</style>
