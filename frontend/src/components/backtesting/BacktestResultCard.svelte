<script>
	let { result = null, source = '' } = $props();

	const summary = $derived(() => result?.summary ?? null);
</script>

<section class="panel backtest-result">
	<div class="backtest-result__header">
		<div>
			<p class="backtest-result__eyebrow">Performance Summary</p>
			<h2>Portfolio curve snapshot</h2>
		</div>
		{#if source}
			<span class="pill mono">{source}</span>
		{/if}
	</div>

	{#if !summary()}
		<p class="backtest-result__empty">Run a backtest to inspect metrics.</p>
	{:else}
		<div class="backtest-result__meta">
			<span class="pill">Range: {result?.lookback ?? '6M'}</span>
			<span class="pill">Interval: {result?.interval ?? '1h'}</span>
			<span class="pill">Candles: {result?.candlesAnalyzed ?? 0}</span>
		</div>
		{#if result?.emptyState}
			<div class="backtest-result__notice">
				<h3>{result.emptyState.title}</h3>
				<p>{result.emptyState.message}</p>
			</div>
		{/if}
		<div class="stat-grid">
			<div class="stat-card">
				<p class="stat-label">Total Trades</p>
				<p class="stat-value">{summary().totalTrades}</p>
			</div>
			<div class="stat-card">
				<p class="stat-label">Win Rate</p>
				<p class="stat-value">{summary().winRate}%</p>
			</div>
			<div class="stat-card">
				<p class="stat-label">Net PnL</p>
				<p class="stat-value mono">{summary().netPnL}</p>
			</div>
			<div class="stat-card">
				<p class="stat-label">PnL %</p>
				<p class="stat-value">{summary().netPnLPercent}%</p>
			</div>
			<div class="stat-card">
				<p class="stat-label">Max Drawdown</p>
				<p class="stat-value">{summary().maxDrawdown}%</p>
			</div>
			<div class="stat-card">
				<p class="stat-label">Final Balance</p>
				<p class="stat-value mono">{summary().finalBalance}</p>
			</div>
		</div>
	{/if}
</section>

<style>
	.backtest-result {
		padding: 22px;
	}

	.backtest-result__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
	}

	.backtest-result__eyebrow {
		color: var(--text-dim);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
	}

	.backtest-result__empty {
		color: var(--text-soft);
	}

	.backtest-result__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 18px;
	}

	.backtest-result__notice {
		margin-bottom: 18px;
		padding: 16px;
		border-radius: 18px;
		border: 1px solid rgba(151, 183, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
	}

	.backtest-result__notice h3 {
		margin-bottom: 6px;
		font-size: 1rem;
	}

	.backtest-result__notice p {
		color: var(--text-soft);
	}
</style>
