<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/authStore';
	import { gsap } from 'gsap';

	let navRef = $state(null);
	let menuOpen = $state(false);
	let hidden = $state(false);
	let previousScrollY = 0;

	const logout = () => {
		authStore.clearAuth();
		menuOpen = false;
		goto('/');
	};

	const closeMenu = () => {
		menuOpen = false;
	};

	const isActive = (path) => page.url.pathname === path;

	onMount(() => {
		if (navRef) {
			gsap.fromTo(
				navRef,
				{ y: -20, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.55, ease: 'power2.out' }
			);
		}

		const onScroll = () => {
			const currentScrollY = window.scrollY;
			const scrollingDown = currentScrollY > previousScrollY + 8;
			const scrollingUp = currentScrollY < previousScrollY - 8;

			if (currentScrollY < 24) {
				hidden = false;
			} else if (scrollingDown) {
				hidden = true;
				menuOpen = false;
			} else if (scrollingUp) {
				hidden = false;
			}

			previousScrollY = currentScrollY;
		};

		previousScrollY = window.scrollY;
		window.addEventListener('scroll', onScroll, { passive: true });

		return () => {
			window.removeEventListener('scroll', onScroll);
		};
	});
</script>

<nav class:hidden class="navbar glass" bind:this={navRef}>
	<div class="navbar__row">
		<button class="navbar__brand" onclick={() => { closeMenu(); goto('/'); }}>
			<span class="navbar__brand-mark"></span>
			<div>
				<strong>Yukti</strong>
				<small>signals desk</small>
			</div>
		</button>

		<div class="navbar__desktop">
			<div class="navbar__links">
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
		</div>

		<button
			class="navbar__menu-toggle"
			class:is-open={menuOpen}
			aria-label="Toggle navigation"
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span></span>
			<span></span>
		</button>
	</div>

	<div class="navbar__quicklinks">
		<a class:active={isActive('/')} href="/" onclick={closeMenu}>Home</a>
		<a class:active={isActive('/dashboard')} href="/dashboard" onclick={closeMenu}>Dashboard</a>
		<a class:active={isActive('/backtest')} href="/backtest" onclick={closeMenu}>Backtest</a>
	</div>

	<div class:open={menuOpen} class="navbar__mobile">
		<div class="navbar__links navbar__links--mobile">
			<a class:active={isActive('/')} href="/" onclick={closeMenu}>Home</a>
			<a class:active={isActive('/dashboard')} href="/dashboard" onclick={closeMenu}>Dashboard</a>
			<a class:active={isActive('/backtest')} href="/backtest" onclick={closeMenu}>Backtest</a>
		</div>

		<div class="navbar__actions navbar__actions--mobile">
			{#if $authStore.isAuthenticated}
				<div class="navbar__user">
					<span class="mono">{$authStore.user?.email ?? 'unknown'}</span>
				</div>
				<button class="btn btn-secondary navbar__button" onclick={logout}>Logout</button>
			{:else}
				<a class="btn btn-ghost navbar__button" href="/login" onclick={closeMenu}>Login</a>
				<a class="btn btn-primary navbar__button" href="/register" onclick={closeMenu}>Register</a>
			{/if}
		</div>
	</div>
</nav>

<style>
	.navbar {
		position: sticky;
		top: 10px;
		z-index: 30;
		width: min(100% - 20px, var(--page-width));
		margin: 10px auto 0;
		padding: 10px 12px;
		border-radius: 18px;
		transition:
			transform 0.28s ease,
			opacity 0.28s ease,
			box-shadow 0.28s ease;
	}

	.hidden {
		transform: translateY(calc(-100% - 16px));
		opacity: 0.2;
		pointer-events: none;
	}

	.navbar__row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 14px;
	}

	.navbar__brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--text);
		cursor: pointer;
	}

	.navbar__brand strong {
		font-size: 0.98rem;
	}

	.navbar__brand-mark {
		width: 11px;
		height: 11px;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--brand), #f0a98d);
		box-shadow: 0 0 20px rgba(217, 119, 87, 0.45);
	}

	.navbar__brand small {
		display: block;
		color: var(--text-dim);
		text-transform: uppercase;
		letter-spacing: 0.14em;
		font-size: 0.58rem;
	}

	.navbar__desktop {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 14px;
	}

	.navbar__links {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.navbar__links a {
		padding: 8px 10px;
		border-radius: 10px;
		color: var(--text-soft);
		font-size: 0.88rem;
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}

	.navbar__links a:hover,
	.navbar__links a.active {
		background: rgba(255, 255, 255, 0.045);
		color: var(--text);
	}

	.navbar__actions {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.navbar__user {
		max-width: 190px;
		padding: 8px 10px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-soft);
		border: 1px solid var(--stroke);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.8rem;
	}

	.navbar__button {
		min-width: 92px;
	}

	.navbar__menu-toggle {
		display: none;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		border: 1px solid var(--stroke);
		background: rgba(255, 255, 255, 0.03);
		align-items: center;
		justify-content: center;
		gap: 5px;
		flex-direction: column;
	}

	.navbar__menu-toggle span {
		width: 14px;
		height: 1.5px;
		background: var(--text);
		border-radius: 999px;
		transition: transform 0.22s ease, opacity 0.22s ease;
	}

	.navbar__menu-toggle.is-open span:first-child {
		transform: translateY(3.5px) rotate(45deg);
	}

	.navbar__menu-toggle.is-open span:last-child {
		transform: translateY(-3.5px) rotate(-45deg);
	}

	.navbar__mobile {
		display: none;
	}

	.navbar__quicklinks {
		display: none;
	}

	@media (max-width: 880px) {
		.navbar {
			width: min(100% - 12px, var(--page-width));
			padding: 9px 10px;
			border-radius: 16px;
		}

		.navbar__desktop {
			display: none;
		}

		.navbar__menu-toggle {
			display: inline-flex;
		}

		.navbar__mobile {
			display: grid;
			max-height: 0;
			opacity: 0;
			overflow: hidden;
			transition:
				max-height 0.25s ease,
				opacity 0.25s ease,
				padding-top 0.25s ease;
		}

		.navbar__quicklinks {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 6px;
			padding-top: 8px;
		}

		.navbar__quicklinks a {
			padding: 8px 10px;
			border-radius: 10px;
			border: 1px solid rgba(255, 255, 255, 0.05);
			background: rgba(255, 255, 255, 0.025);
			color: var(--text-soft);
			font-size: 0.8rem;
			text-align: center;
		}

		.navbar__quicklinks a.active {
			color: var(--text);
			border-color: rgba(217, 119, 87, 0.24);
			background: rgba(217, 119, 87, 0.08);
		}

		.navbar__mobile.open {
			max-height: 280px;
			opacity: 1;
			padding-top: 10px;
		}

		.navbar__links--mobile,
		.navbar__actions--mobile {
			display: grid;
			gap: 8px;
		}

		.navbar__links--mobile {
			padding-bottom: 8px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.05);
			margin-bottom: 8px;
		}

		.navbar__links--mobile a {
			padding: 10px 12px;
		}

		.navbar__actions--mobile {
			align-items: stretch;
		}

		.navbar__user {
			max-width: none;
		}
	}

	@media (max-width: 460px) {
		.navbar__quicklinks {
			grid-template-columns: 1fr;
		}
	}
</style>
