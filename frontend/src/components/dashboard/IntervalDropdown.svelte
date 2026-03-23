<script>
	let {
		value = '1h', // selected interval
		options = ['1h', '4h', '1day'], // backend allowed intervals
		onchange = () => {} // parent callback
	} = $props();
</script>

<div class="field">
	<label for="interval">Interval</label>
	<select id="interval" class="select" value={value} onchange={onchange}>
		{#each options as option}
			<option value={option}>{option}</option>
		{/each}
	</select>
</div>
