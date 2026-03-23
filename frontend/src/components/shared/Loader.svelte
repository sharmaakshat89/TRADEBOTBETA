<script>
	let { label = 'Loading' } = $props(); // allow custom loader text
</script>

<div class="loader" aria-live="polite">
	<div class="loader__orbit"></div>
	<div class="loader__core"></div>
	<span>{label}</span>
</div>

<style>
	.loader {
		display: inline-flex; /* center spinner and label */
		align-items: center; /* vertical align */
		gap: 12px; /* spacing */
		color: var(--text-soft); /* loader text color */
		position: relative; /* anchor inner core */
		padding-left: 32px; /* create room for spinner */
	}

	.loader__orbit,
	.loader__core {
		border-radius: 999px; /* circular shape */
	}

	.loader__orbit {
		width: 22px; /* outer circle */
		height: 22px; /* outer circle */
		border: 2px solid rgba(151, 183, 255, 0.16); /* outer ring */
		border-top-color: var(--brand); /* animated segment */
		animation: spin 0.85s linear infinite; /* rotate ring */
	}

	.loader__core {
		position: absolute; /* center pulse */
		width: 8px; /* inner circle */
		height: 8px; /* inner circle */
		background: var(--brand); /* pulse color */
		box-shadow: 0 0 20px rgba(99, 164, 255, 0.45); /* pulse glow */
		animation: pulse 1.2s ease-in-out infinite; /* pulse motion */
		left: 7px; /* center core horizontally */
	}

	@keyframes spin {
		to {
			transform: rotate(360deg); /* full rotation */
		}
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(0.9); /* smaller pulse state */
			opacity: 0.75; /* lower opacity */
		}

		50% {
			transform: scale(1.2); /* larger pulse state */
			opacity: 1; /* full opacity */
		}
	}
</style>
