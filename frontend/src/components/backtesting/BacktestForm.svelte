<script>
	let {
		symbol = 'BTC/USDT', // default symbol
		interval = '1h', // default interval
		lookback = '6M', // default historical range
		loading = false, // loading state
		allowedSymbols = ['USD/INR', 'EUR/INR', 'GBP/INR', 'JPY/INR'], // backend allowed symbols
		symbolGroups = [], // grouped market options
		allowedIntervals = ['1h', '4h', '1day'], // backend allowed intervals
		allowedLookbacks = ['3M', '6M', '12M'], // historical ranges
		onSubmit = () => {}, // form submit callback
		onSymbolChange = () => {}, // symbol change callback
		onIntervalChange = () => {}, // interval change callback
		onLookbackChange = () => {} // lookback change callback
	} = $props();
</script>

<form class="panel backtest-form" onsubmit={onSubmit}>
	<div>
		<p class="backtest-form__eyebrow">Backtesting Engine</p>
		<h2>Run a historical simulation</h2>
	</div>

	<div class="backtest-form__grid">
		<div class="field">
			<label for="backtest-symbol">Symbol</label>
			<select id="backtest-symbol" class="select" value={symbol} onchange={onSymbolChange}>
				{#if symbolGroups.length}
					{#each symbolGroups as group}
						<optgroup label={group.label}>
							{#each group.options as option}
								{#if allowedSymbols.includes(option)}
									<option value={option}>{option}</option>
								{/if}
							{/each}
						</optgroup>
					{/each}
				{:else}
					{#each allowedSymbols as option}
						<option value={option}>{option}</option>
					{/each}
				{/if}
			</select>
		</div>

		<div class="field">
			<label for="backtest-interval">Interval</label>
			<select id="backtest-interval" class="select" value={interval} onchange={onIntervalChange}>
				{#each allowedIntervals as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>

		<div class="field">
			<label for="backtest-lookback">Lookback</label>
			<select id="backtest-lookback" class="select" value={lookback} onchange={onLookbackChange}>
				{#each allowedLookbacks as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>
	</div>

	<button class="btn btn-primary" type="submit" disabled={loading}>
		{loading ? 'Running backtest...' : 'Run Backtest'}
	</button>
</form>

<style>
	.backtest-form {
		padding: 22px; /* form padding */
		display: grid; /* stack content */
		gap: 18px; /* spacing */
	}

	.backtest-form__eyebrow {
		color: var(--text-dim); /* eyebrow color */
		font-size: 0.8rem; /* eyebrow size */
		text-transform: uppercase; /* uppercase */
		letter-spacing: 0.18em; /* tracking */
	}

	.backtest-form__grid {
		display: grid; /* controls grid */
		grid-template-columns: repeat(3, minmax(0, 1fr)); /* three controls */
		gap: 14px; /* control gap */
	}

	@media (max-width: 680px) {
		.backtest-form__grid {
			grid-template-columns: 1fr; /* stack fields */
		}
	}
</style>
