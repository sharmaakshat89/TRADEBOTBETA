<script>
	import { onMount } from 'svelte'; // lifecycle for guards and animation
	import { goto } from '$app/navigation'; // redirect helper
	import { get } from 'svelte/store'; // read auth snapshot
	import { gsap } from 'gsap'; // form animation
	import api from '$lib/api'; // axios client
	import { authStore } from '$lib/stores/authStore'; // auth store

	let pageRef = $state(null); // page wrapper ref
	let email = $state(''); // email input model
	let password = $state(''); // password input model
	let loading = $state(false); // submit loading state
	let error = $state(''); // ui error message

	onMount(() => {
		if (get(authStore).isAuthenticated) {
			goto('/dashboard'); // keep authenticated users out
			return; // stop page animation
		}

		if (pageRef) {
			gsap.fromTo(
				pageRef,
				{ y: 24, opacity: 0 }, // page start state
				{ y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' } // reveal form
			);
		}
	});

	const handleSubmit = async (event) => {
		event.preventDefault(); // stop native form submit

		if (!email.trim() || !password.trim()) {
			error = 'Email aur password dono required hain.'; // local validation
			return; // stop invalid submit
		}

		loading = true; // begin loading state
		error = ''; // clear stale error

		try {
			const response = await api.post('/auth/login', {
				email, // backend expects email in body
				password // backend expects password in body
			});

			authStore.setAuth(response?.data?.data ?? null); // persist backend auth payload
			await goto('/dashboard'); // login goes to dashboard
		} catch (requestError) {
			error =
				requestError?.response?.data?.error ??
				requestError?.response?.data?.message ??
				'Login failed. Please verify your credentials.'; // support both error and message shapes
		} finally {
			loading = false; // always stop spinner
		}
	};
</script>

<svelte:head>
	<title>Login | Yukti</title>
</svelte:head>

<section class="auth-page page-shell">
	<form class="panel auth-card" bind:this={pageRef} onsubmit={handleSubmit}>
		<div class="pill">Secure login</div>
		<h1>Welcome back.</h1>
		<p class="auth-copy">Sign in to access the live signal dashboard and historical backtest console.</p>

		{#if error}
			<div class="error-banner">{error}</div>
		{/if}

		<div class="field">
			<label for="email">Email</label>
			<input id="email" class="input" type="email" bind:value={email} autocomplete="email" />
		</div>

		<div class="field">
			<label for="password">Password</label>
			<input id="password" class="input" type="password" bind:value={password} autocomplete="current-password" />
		</div>

		<button class="btn btn-primary" type="submit" disabled={loading}>
			{loading ? 'Signing in...' : 'Login'}
		</button>

		<p class="auth-switch">
			Need an account?
			<a href="/register">Create one</a>
		</p>
	</form>
</section>

<style>
	.auth-page {
		padding: 56px 0; /* page spacing */
		display: grid; /* center card */
		place-items: center; /* center form */
		min-height: calc(100vh - var(--nav-height)); /* full viewport minus nav */
	}

	.auth-card {
		width: min(100%, 480px); /* form width */
		padding: 30px; /* form padding */
		display: grid; /* stack form sections */
		gap: 18px; /* form gap */
	}

	.auth-copy,
	.auth-switch {
		color: var(--text-soft); /* muted helper text */
	}
</style>
