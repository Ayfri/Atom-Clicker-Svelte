<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import Modal from '@components/atoms/Modal.svelte';
	import { changelog } from '$stores/changelog';

	export let onClose: () => void;

	let changelogContent = '';

	function parseChangelogDate(title: string): Date | null {
		const dateMatch = title.match(/(\d{2})-(\d{2})-(\d{4})/);
		if (!dateMatch) return null;

		const [_, day, month, year] = dateMatch;
		return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
	}

	onMount(async () => {
		try {
			const response = await fetch('/Changelog.md');
			changelogContent = await response.text();

			// Get the first date from the changelog
			const firstDateMatch = changelogContent.match(/# What's new (\d{2}-\d{2}-\d{4})/);
			if (firstDateMatch) {
				const lastChangelogDate = parseChangelogDate(firstDateMatch[0]);
				if (lastChangelogDate) {
					changelog.checkForUpdates(lastChangelogDate);
				}
			}
		} catch (error) {
			console.error('Failed to load changelog:', error);
		}

		changelog.markAsRead();
	});
</script>

<Modal
	title="Changelog"
	{onClose}
>
	{#if changelogContent}
		<div class="prose prose-invert max-w-none">
			{@html marked(changelogContent)}
		</div>
	{:else}
		<p class="text-center text-white/60">Loading changelog...</p>
	{/if}
</Modal>

<style lang="postcss">
	:global(.prose) {
		@apply text-white/90;
	}

	:global(.prose *) {
		user-select: text;
	}

	:global(.prose h1) {
		@apply mb-4 text-3xl font-bold text-white border-b border-white/10 pb-4;
	}

	:global(.prose ul) {
		@apply space-y-2 pl-5 pb-8 list-disc;
	}

	:global(.prose li) {
		@apply leading-relaxed;
	}

	:global(.prose li::marker) {
		@apply text-accent-200;
	}

	:global(.prose p) {
		@apply leading-relaxed;
	}

	:global(.prose a) {
		@apply text-accent-500 hover:text-accent-400 transition-colors;
	}

	:global(.prose strong) {
		@apply text-white font-bold;
	}

	:global(.prose em) {
		@apply text-white/80 italic;
	}

	:global(.prose code) {
		@apply bg-black/20 px-1.5 py-0.5 rounded text-sm font-mono text-white;
	}

	:global(.prose pre) {
		@apply bg-black/20 p-4 rounded-lg overflow-x-auto;
	}

	:global(.prose pre code) {
		@apply bg-transparent p-0 text-base;
	}
</style>
