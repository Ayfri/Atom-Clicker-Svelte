<script lang="ts">
	import Quark from '@components/icons/Quark.svelte';
	import { QUARK_WORDMARK } from '$data/quarks';

	interface Props {
		class?: string;
		icon?: boolean;
		size?: number;
	}

	let { class: className = '', icon = false, size = 12 }: Props = $props();
</script>

<span class="inline-flex items-center gap-0.5 align-top whitespace-nowrap {className}">
	{#if icon}
		<Quark {size} />
	{/if}
	<span aria-label="Quarks" class="inline-flex">{#each QUARK_WORDMARK as segment}<span aria-hidden="true" style="color: {segment.color}">{segment.text}</span>{/each}</span>
</span>
