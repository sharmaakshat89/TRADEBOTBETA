<script>
	let {
		symbol = 'BTC/USDT',
		interval = '1h',
		lookback = '6M',
		threshold = '0.45',
		loading = false,
		allowedSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'],
		symbolGroups = [],
		allowedIntervals = ['1h', '4h', '1day'],
		allowedLookbacks = ['6M', '12M', '1Y', '2Y'],
		allowedThresholds = ['0.4', '0.45', '0.5'],
		onSubmit = () => {},
		onSymbolChange = () => {},
		onIntervalChange = () => {},
		onLookbackChange = () => {},
		onThresholdChange = () => {}
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

		<div class="field">
			<label for="backtest-threshold">Threshold</label>
			<select id="backtest-threshold" class="select" value={threshold} onchange={onThresholdChange}>
				{#each allowedThresholds as option}
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
		padding: 22px;
		display: grid;
		gap: 18px;
	}

	.backtest-form__eyebrow {
		color: var(--text-dim);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
	}

	.backtest-form__grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
	}

	@media (max-width: 680px) {
		.backtest-form__grid {
			grid-template-columns: 1fr;
		}
	}
</style>
