<script lang="ts">
	import Modal from '@components/ui/Modal.svelte';
	import Discord from '@components/icons/Discord.svelte';
	import GitHub from '@components/icons/GitHub.svelte';
	import { supabaseAuth } from '$stores/supabaseAuth.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	// Generate the Tally URL with email parameter if user is logged in
	const tallyUrl = $derived.by(() => {
		const baseUrl = 'https://tally.so/r/mO8OxM';
		if (supabaseAuth.user?.email) {
			return `${baseUrl}?email=${encodeURIComponent(supabaseAuth.user.email)}`;
		}
		return baseUrl;
	});
</script>

{#snippet headerSnippet()}
	<div class="flex items-center gap-3 flex-1">
		<h2 class="flex-1 text-2xl font-bold text-white">Feedback</h2>
		<a
			href="https://discord.ayfri.com"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center justify-center size-10 rounded-lg hover:bg-white/10 transition-colors"
			title="Chat with us on Discord"
		>
			<Discord class="size-6 text-blue-500" />
		</a>
		<a
			href="https://github.com/Ayfri/Atom-Clicker"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center justify-center size-10 rounded-lg hover:bg-white/10 transition-colors"
			title="Post an issue on GitHub"
		>
			<GitHub class="size-6 text-white" />
		</a>
	</div>
{/snippet}

<Modal {onClose} containerClass="m-2 !p-0 rounded-xl" header={headerSnippet}>
	<iframe
		src={tallyUrl}
		width="100%"
		height="100%"
		title="Feedback Form"
	></iframe>
</Modal>
