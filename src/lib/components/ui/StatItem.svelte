<script lang="ts">
	import type { Icon as IconType } from 'lucide-svelte';

	interface Props {
		description?: string;
		fullValue?: string;
		icon?: typeof IconType;
		label: string;
		prefix?: string;
		suffix?: string;
		value: string | number;
	}

	let {
		description,
		fullValue,
		icon: Icon,
		label,
		prefix = '',
		suffix = '',
		value,
	}: Props = $props();
</script>

<div
	class="flex items-center justify-between gap-2 rounded-lg bg-white/5 p-2.5 transition-colors hover:bg-white/10"
	title={fullValue || undefined}
>
	<div class="flex items-center gap-2">
		{#if Icon}
			<div class="flex size-6 shrink-0 items-center justify-center rounded bg-accent/20 text-accent">
				<Icon size={14} />
			</div>
		{/if}
		<div class="flex flex-col">
			<span class="text-sm text-white/70">{label}</span>
			{#if description}
				<span class="text-xs text-white/40">{description}</span>
			{/if}
		</div>
	</div>
	<span class="font-semibold text-accent tabular-nums">{prefix}{value}{suffix}</span>
</div>
