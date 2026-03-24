<script>
	import { onMount } from 'svelte'; // animate card on updates
	import { gsap } from 'gsap'; // card animation

	let { signal = null, currentPrice = null } = $props(); // quant signal payload

	let cardRef = $state(null); // card DOM ref

	const tone = $derived(() => {
		if (signal?.signal === 'BUY') return 'buy'; // bullish signal
		if (signal?.signal === 'SELL') return 'sell'; // bearish signal
		return 'neutral'; // no trade fallback
	});

	const confidence = $derived(() => {
		const score = Number(signal?.score ?? 0); // normalize score
		return Math.min(Math.max(Math.abs(score) * 100, 0), 100).toFixed(1); // percent clamp
	});

	const livePrice = $derived(() => {
		const value = Number(currentPrice ?? signal?.currentPrice ?? 0);
		return Number.isFinite(value) && value > 0 ? value.toFixed(4) : '--';
	});

	onMount(() => {
		if (!cardRef) return; // skip without card ref

		gsap.fromTo(
			cardRef,
			{ y: 24, opacity: 0 }, // initial offset
			{ y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' } // reveal card
		);
	});

	$effect(() => {
		if (!cardRef || !signal) return; // animate only with signal data

		gsap.fromTo(
			cardRef,
			{ scale: 0.985, boxShadow: '0 0 0 rgba(0,0,0,0)' }, // subtle reset
			{
				scale: 1, // settle scale
				boxShadow: signal.signal === 'BUY'
					? '0 24px 60px rgba(44, 230, 166, 0.16)' // buy glow
					: signal.signal === 'SELL'
						? '0 24px 60px rgba(255, 107, 129, 0.16)' // sell glow
						: '0 24px 60px rgba(99, 164, 255, 0.12)', // neutral glow
				duration: 0.45, // quick feedback
				ease: 'power2.out' // smooth finish
			}
		);
	});
</script>

<section class="panel signal-card" bind:this={cardRef}>
	<div class="signal-card__header">
		<div>
			<p class="signal-card__eyebrow">Signal Generator</p>
			<h2>Current bias</h2>
		</div>
		<span class="pill mono">{signal?.symbol ?? 'Awaiting signal'}</span>
	</div>

	<div class="signal-card__hero" data-tone={tone()}>
		<span class="signal-card__label">{signal?.signal ?? 'NO_TRADE'}</span>
		<small>Confidence {confidence()}%</small>
	</div>

	<div class="signal-card__bar">
		<div class="signal-card__fill" style={`width:${confidence()}%`}></div>
	</div>

	<div class="stat-grid">
		<div class="stat-card">
			<p class="stat-label">Current Price</p>
			<p class="stat-value mono">{livePrice()}</p>
		</div>
		<div class="stat-card">
			<p class="stat-label">Stop Loss</p>
			<p class="stat-value mono">{signal?.risk?.stopLoss ?? '--'}</p>
		</div>
		<div class="stat-card">
			<p class="stat-label">Take Profit</p>
			<p class="stat-value mono">{signal?.risk?.takeProfit ?? '--'}</p>
		</div>
	</div>
</section>

<style>
	.signal-card {
		padding: 14px; /* card padding */
	}

	.signal-card__header {
		display: flex; /* split header */
		align-items: center; /* align header content */
		justify-content: space-between; /* justify content */
		gap: 16px; /* spacing */
		margin-bottom: 10px; /* spacing after header */
	}

	.signal-card__eyebrow {
		color: var(--text-dim); /* eyebrow color */
		font-size: 0.8rem; /* eyebrow size */
		text-transform: uppercase; /* uppercase eyebrow */
		letter-spacing: 0.18em; /* tracking */
	}

	.signal-card__hero {
		padding: 16px; /* hero padding */
		border-radius: 16px; /* hero radius */
		border: 1px solid rgba(151, 183, 255, 0.14); /* hero border */
		background:
			radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 35%),
			rgba(255, 255, 255, 0.05); /* layered hero bg */
		display: grid; /* stack hero text */
		gap: 5px; /* hero gap */
	}

	.signal-card__hero[data-tone='buy'] {
		box-shadow: inset 0 0 0 1px rgba(44, 230, 166, 0.12); /* buy tint */
	}

	.signal-card__hero[data-tone='sell'] {
		box-shadow: inset 0 0 0 1px rgba(255, 107, 129, 0.12); /* sell tint */
	}

	.signal-card__label {
		font-size: clamp(1.5rem, 6vw, 2.2rem); /* big signal text */
		font-weight: 700; /* emphasize text */
		letter-spacing: -0.05em; /* tighten signal text */
	}

	.signal-card__bar {
		margin: 12px 0 12px; /* bar spacing */
		height: 8px; /* bar height */
		border-radius: 999px; /* bar shape */
		background: rgba(255, 255, 255, 0.06); /* track color */
		overflow: hidden; /* clip fill */
	}

	.signal-card__fill {
		height: 100%; /* fill full height */
		border-radius: inherit; /* follow bar radius */
		background: linear-gradient(90deg, var(--brand), var(--buy)); /* fill gradient */
	}

	@media (max-width: 640px) {
		.signal-card {
			padding: 10px;
		}
	}
</style>
