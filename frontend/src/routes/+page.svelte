<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { gsap } from 'gsap';
	import { authStore } from '$lib/stores/authStore';

	let heroRef = $state(null);
	let cardsRef = $state(null);

	onMount(() => {
		const auth = get(authStore);
		if (auth.isAuthenticated) {
			goto('/dashboard');
			return;
		}

		if (heroRef) {
			gsap.fromTo(
				heroRef.children,
				{ y: 24, opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: 0.7,
					stagger: 0.07,
					ease: 'power3.out'
				}
			);
		}

		if (cardsRef) {
			gsap.fromTo(
				cardsRef.children,
				{ y: 20, opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: 0.6,
					stagger: 0.08,
					delay: 0.18,
					ease: 'power3.out'
				}
			);
		}
	});

	const metrics = [
		{ label: 'Live feed', value: 'Binance Futures' },
		{ label: 'Execution view', value: 'Spot-ready' },
		{ label: 'Backtests', value: '6M to 5Y' }
	];

	const features = [
		{
			title: 'Chart-first workflow',
			body: 'Realtime candles, compact signal context, and backtests that stay aligned with the same backend payload.'
		},
		{
			title: 'Quant plus AI',
			body: 'Structured signal logic stays deterministic while the AI layer is free to validate and explain the setup.'
		},
		{
			title: 'Crypto-only focus',
			body: 'Built around Binance market structure, funding-aware context, and multi-range backtesting without mixed asset logic.'
		}
	];
</script>

<svelte:head>
	<title>Yukti | Live Signal Terminal</title>
</svelte:head>

<section class="landing page-shell">
	<div class="landing__hero panel" bind:this={heroRef}>
		<div class="pill">Crypto signal workspace</div>
		<h1 class="section-title">LIVE CHARTS FOR YOU .</h1>
		<p class="section-subtitle">
			Yukti keeps the trading surface focused: market structure first, signal context second, and backtesting close at hand.
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
		width: min(100% - 18px, 1180px);
		padding: 16px 0 28px;
		display: grid;
		gap: 12px;
	}

	.landing__hero {
		padding: clamp(20px, 4vw, 34px);
		min-height: min(52vh, 480px);
		display: grid;
		align-content: center;
		gap: 14px;
		background:
			radial-gradient(circle at top right, rgba(217, 119, 87, 0.14), transparent 22%),
			radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.05), transparent 28%),
			var(--bg-elevated);
	}

	.landing__actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.landing__metrics {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin-top: 2px;
	}

	.landing__feature-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.landing__feature {
		padding: 16px;
		min-height: 150px;
		display: grid;
		align-content: start;
		gap: 10px;
	}

	.landing__feature h2 {
		font-size: 1rem;
	}

	.landing__feature p {
		color: var(--text-soft);
		font-size: 0.92rem;
	}

	@media (max-width: 880px) {
		.landing {
			width: min(100% - 12px, 1180px);
		}

		.landing__metrics,
		.landing__feature-grid {
			grid-template-columns: 1fr;
		}

		.landing__hero {
			min-height: auto;
		}
	}
</style>
