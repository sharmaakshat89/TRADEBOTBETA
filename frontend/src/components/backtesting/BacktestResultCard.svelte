<script>
	let { result = null, source = '' } = $props(); // backtest result payload

	const summary = $derived(() => result?.summary ?? null); // summary shortcut
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
		padding: 22px; /* panel padding */
	}

	.backtest-result__header {
		display: flex; /* header row */
		align-items: center; /* align header content */
		justify-content: space-between; /* split heading and source */
		gap: 16px; /* spacing */
		margin-bottom: 18px; /* spacing below header */
	}

	.backtest-result__eyebrow {
		color: var(--text-dim); /* eyebrow color */
		font-size: 0.8rem; /* eyebrow size */
		text-transform: uppercase; /* uppercase */
		letter-spacing: 0.18em; /* tracking */
	}

	.backtest-result__empty {
		color: var(--text-soft); /* empty state color */
	}

	.backtest-result__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 18px;
	}
</style>
