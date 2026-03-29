<script>
	import CandlestickChart from '$components/dashboard/CandlestickChart.svelte';
	import Loader from '$components/shared/Loader.svelte';

	let { panel, onRunAI = null } = $props();

	const tone = $derived(() => {
		if (panel?.signal?.signal === 'BUY') return 'buy';
		if (panel?.signal?.signal === 'SELL') return 'sell';
		return 'neutral';
	});

	const confidence = $derived(() => {
		const score = Number(panel?.signal?.score ?? 0);
		return Number.isFinite(score) ? Math.min(Math.max(Math.abs(score) * 100, 0), 100).toFixed(0) : '0';
	});

	const displayIndicators = $derived(() => {
		const indicators = panel?.signal?.indicators ?? {};
		return {
			ema9: indicators.ema9 ?? indicators.fast ?? null,
			ema11: indicators.ema11 ?? indicators.medium ?? null,
			ema45: indicators.ema45 ?? indicators.trend ?? null,
			adx: indicators.adx ?? null,
			adr: indicators.adr ?? indicators.atr14 ?? null
		};
	});

	const formatValue = (value, decimals = 4) => {
		const numeric = Number(value);
		return Number.isFinite(numeric) ? numeric.toFixed(decimals) : '--';
	};
</script>

<section class="panel coin-panel" data-tone={tone()}>
	<div class="coin-panel__header">
		<div>
			<p class="coin-panel__eyebrow">Binance futures feed | 1H</p>
			<h2>{panel.symbol}</h2>
		</div>

		<div class="coin-panel__actions">
			<span class="pill mono">Spot view</span>
			<button class="btn btn-secondary coin-panel__ai-button" onclick={() => onRunAI?.(panel.symbol)}>
				{panel.loadingAI ? 'Checking...' : 'AI Validate'}
			</button>
		</div>
	</div>

	{#if panel.error}
		<div class="error-banner">{panel.error}</div>
	{:else if panel.loadingSignal && !panel.signal}
		<div class="coin-panel__loading">
			<Loader label={`Loading ${panel.symbol}`} />
		</div>
	{:else}
		<div class="coin-panel__summary">
			<div class="coin-panel__signal" data-tone={tone()}>
				<p class="coin-panel__signal-label">{panel.signal?.signal ?? 'NO_TRADE'}</p>
				<span>Confidence {confidence()}%</span>
			</div>

			<div class="coin-panel__metrics">
				<div class="stat-card">
					<p class="stat-label">EMA 9</p>
					<p class="stat-value mono">{formatValue(displayIndicators().ema9)}</p>
				</div>
				<div class="stat-card">
					<p class="stat-label">EMA 11</p>
					<p class="stat-value mono">{formatValue(displayIndicators().ema11)}</p>
				</div>
				<div class="stat-card">
					<p class="stat-label">EMA 45</p>
					<p class="stat-value mono">{formatValue(displayIndicators().ema45)}</p>
				</div>
				<div class="stat-card">
					<p class="stat-label">ADX</p>
					<p class="stat-value mono">{formatValue(displayIndicators().adx, 2)}</p>
				</div>
				<div class="stat-card">
					<p class="stat-label">ADR</p>
					<p class="stat-value mono">{formatValue(displayIndicators().adr, 4)}</p>
				</div>
			</div>
		</div>

		<CandlestickChart
			candles={panel.candles}
			signal={panel.signal}
			heading={panel.symbol}
			eyebrow="Live spot-execution board"
			showLegend={false}
			showEmaOverlay={false}
			compact={true}
		/>

		<div class="coin-panel__ai-shell">
			{#if panel.aiError}
				<div class="error-banner">{panel.aiError}</div>
			{:else if panel.loadingAI}
				<p class="coin-panel__muted">Reviewing quant logic and latest coin headlines...</p>
			{:else if panel.aiValidation}
				<div class="coin-panel__ai-summary">
					<div class="stat-card">
						<p class="stat-label">AI Signal</p>
						<p class="stat-value">{panel.aiValidation.aiSignal ?? 'NO_TRADE'}</p>
					</div>
					<div class="stat-card">
						<p class="stat-label">Agreement</p>
						<p class="stat-value">{panel.aiValidation.agreesWithQuant ? 'Aligned' : 'Divergent'}</p>
					</div>
				</div>

				<div class="coin-panel__reasoning">
					<p>{panel.aiValidation.reasoning}</p>
				</div>

				{#if panel.aiValidation.headlines?.length}
					<div class="coin-panel__news">
						<p class="coin-panel__news-label">News context</p>
						<ul>
							{#each panel.aiValidation.headlines as headline}
								<li>{headline.title}</li>
							{/each}
						</ul>
					</div>
				{/if}
			{:else}
				<p class="coin-panel__muted">Run AI validation for this coin when you want a news-aware second opinion.</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.coin-panel {
		padding: 12px;
		display: grid;
		gap: 10px;
	}

	.coin-panel__header {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.coin-panel__eyebrow,
	.coin-panel__news-label {
		color: var(--text-dim);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
	}

	.coin-panel__actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.coin-panel__ai-button {
		padding: 0.5rem 0.8rem;
		font-size: 0.78rem;
	}

	.coin-panel__summary {
		display: grid;
		gap: 10px;
	}

	.coin-panel__signal {
		padding: 10px 12px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.coin-panel__signal[data-tone='buy'] {
		box-shadow: inset 0 0 0 1px rgba(44, 230, 166, 0.16);
	}

	.coin-panel__signal[data-tone='sell'] {
		box-shadow: inset 0 0 0 1px rgba(255, 107, 129, 0.16);
	}

	.coin-panel__signal-label {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.coin-panel__metrics {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 8px;
	}

	.coin-panel :global(.stat-card) {
		padding: 9px 8px;
		min-width: 0;
	}

	.coin-panel :global(.stat-label) {
		font-size: 0.62rem;
		letter-spacing: 0.07em;
	}

	.coin-panel :global(.stat-value) {
		margin-top: 4px;
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1.2;
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	.coin-panel__ai-shell {
		display: grid;
		gap: 8px;
	}

	.coin-panel__ai-summary {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	.coin-panel__reasoning,
	.coin-panel__news {
		padding: 10px 12px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.coin-panel__reasoning {
		color: var(--text-soft);
		font-size: 0.82rem;
		line-height: 1.45;
		white-space: pre-wrap;
	}

	.coin-panel__news ul {
		margin: 6px 0 0;
		padding-left: 16px;
		color: var(--text-soft);
		font-size: 0.78rem;
		line-height: 1.4;
	}

	.coin-panel__muted {
		color: var(--text-soft);
		font-size: 0.82rem;
	}

	.coin-panel__loading {
		min-height: 180px;
		display: grid;
		place-items: center;
	}

	@media (max-width: 900px) {
		.coin-panel__metrics {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.coin-panel {
			padding: 10px;
		}

		.coin-panel__metrics,
		.coin-panel__ai-summary {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 420px) {
		.coin-panel__metrics,
		.coin-panel__ai-summary {
			grid-template-columns: 1fr;
		}

		.coin-panel__signal {
			align-items: start;
		}
	}
</style>
