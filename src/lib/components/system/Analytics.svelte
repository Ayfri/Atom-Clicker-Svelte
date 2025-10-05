<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	const beacon = { token: 'e8f7ea160f464f118b12dc2a395614d5' };

	onMount(() => {
		if (browser) {
			// Google Analytics
			window.dataLayer = window.dataLayer || [];
			function gtag() {
				window.dataLayer.push(arguments);
			}
			gtag('js', new Date());
			gtag('config', 'G-9M6JETNYJ5');
		}
	});
</script>

{#if browser}
	<!-- Cloudflare Web Analytics -->
	<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify(beacon)}>
	</script>
	<!-- End Cloudflare Web Analytics -->

	<!-- Google tag (gtag.js) -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-9M6JETNYJ5"></script>
{/if}
