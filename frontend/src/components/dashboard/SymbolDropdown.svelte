<script>
	let {
		value = 'BTC/USDT', // selected symbol
		groups = [], // grouped market options
		onchange = () => {} // parent callback
	} = $props();
</script>

<div class="field">
	<label for="symbol">Symbol</label>
	<select id="symbol" class="select" value={value} onchange={onchange}>
		{#each groups as group}
			<optgroup label={group.label}>
				{#each group.options as option}
					<option value={option}>{option}</option>
				{/each}
			</optgroup>
		{/each}
	</select>
</div>
