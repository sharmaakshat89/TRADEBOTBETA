<script>
	let { aiValidation = null, loading = false, error = '' } = $props(); // ai payload and ui flags
</script>

<section class="panel ai-panel">
	<div class="ai-panel__header">
		<div>
			<p class="ai-panel__eyebrow">LLM Interpretation</p>
			<h2>AI reasoning</h2>
		</div>
		{#if aiValidation?.source}
			<span class="pill mono">{aiValidation.source}</span>
		{/if}
	</div>

	{#if loading}
		<p class="ai-panel__muted">Analyzing signal context...</p>
	{:else if error}
		<div class="error-banner">{error}</div>
	{:else if !aiValidation}
		<p class="ai-panel__muted">Run AI analysis to see the model's validation and reasoning.</p>
	{:else}
		<div class="ai-panel__summary">
			<div class="stat-card">
				<p class="stat-label">AI Signal</p>
				<p class="stat-value">{aiValidation.aiSignal ?? 'NO_TRADE'}</p>
			</div>
			<div class="stat-card">
				<p class="stat-label">Agreement</p>
				<p class="stat-value">{aiValidation.agreesWithQuant ? 'Aligned' : 'Divergent'}</p>
			</div>
		</div>

		<div class="ai-panel__reasoning">
			<p>{aiValidation.reasoning ?? 'No AI reasoning returned by backend.'}</p>
		</div>
	{/if}
</section>

<style>
	.ai-panel {
		padding: 14px; /* panel padding */
	}

	.ai-panel__header {
		display: flex; /* header row */
		align-items: center; /* center header items */
		justify-content: space-between; /* split content */
		gap: 16px; /* gap */
		margin-bottom: 10px; /* spacing below header */
	}

	.ai-panel__eyebrow {
		color: var(--text-dim); /* eyebrow color */
		font-size: 0.8rem; /* eyebrow size */
		text-transform: uppercase; /* uppercase */
		letter-spacing: 0.18em; /* tracking */
	}

	.ai-panel__summary {
		display: grid; /* summary cards grid */
		grid-template-columns: repeat(2, minmax(0, 1fr)); /* two summary cards */
		gap: 8px; /* gap */
		margin-bottom: 10px; /* spacing */
	}

	.ai-panel__reasoning {
		padding: 14px; /* reasoning padding */
		border-radius: 14px; /* reasoning radius */
		background: rgba(255, 255, 255, 0.04); /* reasoning bg */
		border: 1px solid rgba(151, 183, 255, 0.08); /* reasoning border */
		color: var(--text-soft); /* reasoning text */
		white-space: pre-wrap; /* preserve backend line breaks */
		font-size: 0.9rem;
	}

	.ai-panel__muted {
		color: var(--text-soft); /* muted placeholder */
	}

	@media (max-width: 520px) {
		.ai-panel {
			padding: 10px;
		}

		.ai-panel__summary {
			grid-template-columns: 1fr; /* stack cards on small screens */
		}
	}
</style>
