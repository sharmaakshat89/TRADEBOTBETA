<script>
	import '../app.css'; // load global styles
	import { afterNavigate } from '$app/navigation'; // page transition hook
	import { onMount } from 'svelte'; // lifecycle for init
	import { gsap } from 'gsap'; // route transition animation
	import Navbar from '$components/shared/Navbar.svelte'; // shared navbar
	import { authStore } from '$lib/stores/authStore'; // ensure store initializes

	let { children } = $props(); // route content render function
	let contentRef = $state(null); // route outlet ref

	onMount(() => {
		authStore.subscribe(() => {}); // keep store hydrated on client
	});

	afterNavigate(() => {
		if (!contentRef) return; // skip without content ref

		gsap.fromTo(
			contentRef,
			{ opacity: 0, y: 18 }, // route enter start
			{ opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' } // route enter end
		);
	});
</script>

<Navbar />

<main class="app-shell" bind:this={contentRef}>
	{@render children?.()}
</main>

<style>
	.app-shell {
		padding-top: 10px;
	}
</style>
