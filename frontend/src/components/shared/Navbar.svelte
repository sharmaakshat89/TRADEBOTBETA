<script>
	import { onMount } from 'svelte'; // lifecycle for animations
	import { goto } from '$app/navigation'; // programmatic navigation
	import { page } from '$app/state'; // current route state
	import { authStore } from '$lib/stores/authStore'; // auth state
	import { gsap } from 'gsap'; // navbar animations

	let navRef = $state(null); // navbar ref for gsap
	let actionRef = $state(null); // actions ref for gsap

	const logout = () => {
		authStore.clearAuth(); // clear persisted auth
		goto('/'); // return to landing page
	};

	onMount(() => {
		if (navRef) {
			gsap.fromTo(
				navRef,
				{ y: -28, opacity: 0 }, // start slightly above
				{ y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' } // settle in
			);
		}

		if (actionRef) {
			gsap.fromTo(
				actionRef.children,
				{ y: -10, opacity: 0 }, // start hidden
				{
					y: 0, // final position
					opacity: 1, // visible
					duration: 0.45, // quick settle
					stagger: 0.06, // little sequence
					delay: 0.12, // wait for nav
					ease: 'power2.out' // softer ease
				}
			);
		}
	});

	const isActive = (path) => page.url.pathname === path; // active link helper
</script>

<nav class="navbar glass" bind:this={navRef}>
	<button class="navbar__brand" onclick={() => goto('/')}>
		<span class="navbar__brand-mark"></span>
		<div>
			<strong>Yukti</strong>
			<small>signals desk</small>
		</div>
	</button>

	<div class="navbar__links" bind:this={actionRef}>
		<a class:active={isActive('/')} href="/">Home</a>
		<a class:active={isActive('/dashboard')} href="/dashboard">Dashboard</a>
		<a class:active={isActive('/backtest')} href="/backtest">Backtest</a>
	</div>

	<div class="navbar__actions">
		{#if $authStore.isAuthenticated}
			<div class="navbar__user">
				<span class="mono">{$authStore.user?.email ?? 'unknown'}</span>
			</div>
			<button class="btn btn-secondary navbar__button" onclick={logout}>Logout</button>
		{:else}
			<a class="btn btn-ghost navbar__button" href="/login">Login</a>
			<a class="btn btn-primary navbar__button" href="/register">Register</a>
		{/if}
	</div>
</nav>

<style>
	.navbar {
		position: sticky; /* keep nav visible */
		top: 14px; /* breathing room from top */
		z-index: 20; /* sit above page sections */
		display: grid; /* 3-column layout */
		grid-template-columns: auto 1fr auto; /* brand, links, actions */
		align-items: center; /* vertical align */
		gap: 18px; /* gap between groups */
		width: min(100% - 24px, var(--page-width)); /* nav width */
		margin: 14px auto 0; /* center nav */
		padding: 14px 18px; /* nav padding */
		border-radius: 24px; /* nav radius */
	}

	.navbar__brand {
		display: inline-flex; /* brand row */
		align-items: center; /* align brand items */
		gap: 12px; /* brand spacing */
		color: var(--text); /* brand color */
		cursor: pointer; /* clickable brand */
	}

	.navbar__brand-mark {
		width: 14px; /* dot size */
		height: 14px; /* dot size */
		border-radius: 999px; /* circle */
		background: linear-gradient(135deg, var(--brand), var(--buy)); /* brand gradient */
		box-shadow: 0 0 24px rgba(99, 164, 255, 0.55); /* glowing dot */
	}

	.navbar__brand small {
		display: block; /* small text on new line */
		color: var(--text-dim); /* muted small text */
		text-transform: uppercase; /* label styling */
		letter-spacing: 0.14em; /* tracking */
		font-size: 0.64rem; /* compact label */
	}

	.navbar__links {
		display: flex; /* horizontal links */
		align-items: center; /* align links */
		justify-content: center; /* center link group */
		gap: 10px; /* link spacing */
	}

	.navbar__links a {
		padding: 10px 14px; /* link padding */
		border-radius: 999px; /* pill links */
		color: var(--text-soft); /* idle link color */
		transition:
			background 0.2s ease,
			color 0.2s ease,
			transform 0.2s ease; /* link hover effects */
	}

	.navbar__links a:hover,
	.navbar__links a.active {
		background: rgba(255, 255, 255, 0.06); /* active bg */
		color: var(--text); /* active text */
		transform: translateY(-1px); /* hover lift */
	}

	.navbar__actions {
		display: inline-flex; /* inline actions */
		align-items: center; /* align action controls */
		gap: 10px; /* action spacing */
	}

	.navbar__user {
		padding: 10px 14px; /* user chip padding */
		border-radius: 999px; /* chip shape */
		background: rgba(255, 255, 255, 0.04); /* chip bg */
		color: var(--text-soft); /* chip text */
		border: 1px solid var(--stroke); /* chip border */
		max-width: 240px; /* prevent overflow */
		overflow: hidden; /* hide overflow */
		text-overflow: ellipsis; /* show ellipsis */
		white-space: nowrap; /* single line */
	}

	.navbar__button {
		min-width: 108px; /* stable button width */
	}

	@media (max-width: 960px) {
		.navbar {
			grid-template-columns: 1fr; /* stack navbar sections */
			justify-items: stretch; /* full-width rows */
		}

		.navbar__links,
		.navbar__actions {
			justify-content: flex-start; /* align left on mobile */
			flex-wrap: wrap; /* allow wrapping */
		}
	}
</style>
