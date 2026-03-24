<script>
	import { onMount } from 'svelte'; // lifecycle for animations
	import { goto } from '$app/navigation'; // navigation helper
	import { get } from 'svelte/store'; // read auth snapshot
	import { gsap } from 'gsap'; // page animations
	import { authStore } from '$lib/stores/authStore'; // auth status

	let heroRef = $state(null); // hero section ref
	let cardsRef = $state(null); // features wrapper ref

	onMount(() => {
		const auth = get(authStore); // read auth on landing
		if (auth.isAuthenticated) {
			goto('/dashboard'); // authenticated users jump to app
			return; // stop landing animation
		}

		if (heroRef) {
			gsap.fromTo(
				heroRef.children,
				{ y: 38, opacity: 0 }, // initial hidden state
				{
					y: 0, // final position
					opacity: 1, // visible state
					duration: 0.8, // smooth reveal
					stagger: 0.08, // sequence animation
					ease: 'power3.out' // premium ease
				}
			);
		}

		if (cardsRef) {
			gsap.fromTo(
				cardsRef.children,
				{ y: 28, opacity: 0 }, // card start state
				{
					y: 0, // card final position
					opacity: 1, // card final opacity
					duration: 0.7, // card duration
					stagger: 0.1, // card stagger
					delay: 0.25, // wait after hero
					ease: 'power3.out' // ease
				}
			);
		}
	});

	const metrics = [
		{ label: 'Live OHLC feed', value: '1 min' }, // websocket delivery cadence
		{ label: 'Quant indicators', value: '7+' }, // count of displayed indicators
		{ label: 'Backtest depth', value: '500 candles' } // fetched backtest size
	];

	const features = [
		{
			title: 'Live market desk',
			body: 'Realtime INR pair candles delivered through a single WebSocket manager with auto reconnect and subscription switching.'
		},
		{
			title: 'Quant signal engine',
			body: 'Signal cards reflect the backend score, risk levels, and indicator state exactly as the API emits them.'
		},
		{
			title: 'AI validation layer',
			body: 'The AI panel renders the quant signal and the model response side by side without contract mismatch.'
		},
		{
			title: 'Backtesting workspace',
			body: 'Equity curves and performance metrics map directly to the summary, trades, and equityCurve payload from the backend.'
		}
	];
</script>

<svelte:head>
	<title>Yukti | Live Signal Terminal</title>
</svelte:head>

<section class="landing page-shell">
	<div class="landing__hero panel" bind:this={heroRef}>
		<div class="pill">Powered by Svelte</div>
		<h1 class="section-title">AI Assisted Crypto Live Dashboard</h1>
		<p class="section-subtitle">
			Like TradingView charts? You’ll love what we built.
		</p>
		<div class="landing__actions">
			<a class="btn btn-primary" href="/register">Start Free</a>
			<a class="btn btn-secondary" href="/login">Open Dashboard</a>
		</div>
		<div class="landing__metrics">
			{#each metrics as metric}
				<div class="stat-card">
					<p class="stat-label">{metric.label}</p>
					<p class="stat-value">{metric.value}</p>
				</div>
			{/each}
		</div>
	</div>

	<div class="landing__feature-grid" bind:this={cardsRef}>
		{#each features as feature}
			<article class="panel landing__feature">
				<h2>{feature.title}</h2>
				<p>{feature.body}</p>
			</article>
		{/each}
	</div>
</section>

<style>
	.landing {
		padding: 38px 0 48px; /* landing spacing */
		display: grid; /* stack hero and features */
		gap: 22px; /* section gap */
	}

	.landing__hero {
		padding: clamp(28px, 6vw, 56px); /* hero padding */
		min-height: min(74vh, 760px); /* hero height */
		display: grid; /* stack hero content */
		align-content: center; /* center content vertically */
		gap: 20px; /* hero item spacing */
		background:
			radial-gradient(circle at top right, rgba(44, 230, 166, 0.18), transparent 22%),
			radial-gradient(circle at bottom left, rgba(99, 164, 255, 0.18), transparent 28%),
			var(--bg-elevated); /* expressive hero bg */
	}

	.landing__actions {
		display: flex; /* action row */
		gap: 14px; /* button spacing */
		flex-wrap: wrap; /* allow wrapping */
	}

	.landing__metrics {
		display: grid; /* metrics grid */
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); /* responsive metrics */
		gap: 14px; /* metrics gap */
		margin-top: 6px; /* spacing above metrics */
	}

	.landing__feature-grid {
		display: grid; /* feature grid */
		grid-template-columns: repeat(2, minmax(0, 1fr)); /* two columns */
		gap: 20px; /* feature gap */
	}

	.landing__feature {
		padding: 24px; /* feature card padding */
		min-height: 220px; /* equal-ish card heights */
		display: grid; /* stack feature content */
		align-content: start; /* align content to top */
		gap: 14px; /* feature spacing */
	}

	.landing__feature p {
		color: var(--text-soft); /* feature text */
	}

	@media (max-width: 880px) {
		.landing__feature-grid {
			grid-template-columns: 1fr; /* stack features on tablet */
		}
	}
</style>
