<script>
	import { onMount } from 'svelte'; // lifecycle for guard and animation
	import { goto } from '$app/navigation'; // redirect helper
	import { get } from 'svelte/store'; // read auth snapshot
	import { gsap } from 'gsap'; // form animation
	import api from '$lib/api'; // axios client
	import { authStore } from '$lib/stores/authStore'; // auth store

	let pageRef = $state(null); // card ref
	let email = $state(''); // email input model
	let password = $state(''); // password input model
	let confirmPassword = $state(''); // confirm input model
	let loading = $state(false); // loading state
	let error = $state(''); // error message
	let success = $state(''); // success message

	onMount(() => {
		if (get(authStore).isAuthenticated) {
			goto('/'); // registered users return home
			return; // stop animation
		}

		if (pageRef) {
			gsap.fromTo(
				pageRef,
				{ y: 24, opacity: 0 }, // page start state
				{ y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' } // page reveal
			);
		}
	});

	const handleSubmit = async (event) => {
		event.preventDefault(); // stop native submit

		if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
			error = 'All fields are required.'; // client validation
			return; // stop invalid submit
		}

		if (password !== confirmPassword) {
			error = 'Passwords must match.'; // client validation
			return; // stop invalid submit
		}

		loading = true; // start loading
		error = ''; // clear stale error
		success = ''; // clear stale success

		try {
			const response = await api.post('/auth/register', {
				email, // backend expects email
				password // backend expects password
			});

			authStore.setAuth(response?.data?.data ?? null); // persist token from backend
			success = response?.data?.message ?? 'Registration successful.'; // show backend success
			await goto('/'); // requirement says redirect to /
		} catch (requestError) {
			error =
				requestError?.response?.data?.error ??
				requestError?.response?.data?.message ??
				'Registration failed. Please try again.'; // support both error and message shapes
		} finally {
			loading = false; // stop loading
		}
	};
</script>

<svelte:head>
	<title>Register | Yukti</title>
</svelte:head>

<section class="auth-page page-shell">
	<form class="panel auth-card" bind:this={pageRef} onsubmit={handleSubmit}>
		<div class="pill">Limited beta onboarding</div>
		<h1>Create your account.</h1>
		<p class="auth-copy">The backend currently limits registrations to five users, so register while slots are open.</p>

		{#if error}
			<div class="error-banner">{error}</div>
		{/if}

		{#if success}
			<div class="success-banner">{success}</div>
		{/if}

		<div class="field">
			<label for="register-email">Email</label>
			<input id="register-email" class="input" type="email" bind:value={email} autocomplete="email" />
		</div>

		<div class="field">
			<label for="register-password">Password</label>
			<input id="register-password" class="input" type="password" bind:value={password} autocomplete="new-password" />
		</div>

		<div class="field">
			<label for="register-confirm-password">Confirm Password</label>
			<input
				id="register-confirm-password"
				class="input"
				type="password"
				bind:value={confirmPassword}
				autocomplete="new-password"
			/>
		</div>

		<button class="btn btn-primary" type="submit" disabled={loading}>
			{loading ? 'Creating account...' : 'Register'}
		</button>

		<p class="auth-switch">
			Already registered?
			<a href="/login">Sign in</a>
		</p>
	</form>
</section>

<style>
	.auth-page {
		padding: 56px 0; /* page spacing */
		display: grid; /* center card */
		place-items: center; /* center content */
		min-height: calc(100vh - var(--nav-height)); /* full height minus nav */
	}

	.auth-card {
		width: min(100%, 520px); /* form width */
		padding: 30px; /* form padding */
		display: grid; /* stack form content */
		gap: 18px; /* form spacing */
	}

	.auth-copy,
	.auth-switch {
		color: var(--text-soft); /* helper text color */
	}
</style>
