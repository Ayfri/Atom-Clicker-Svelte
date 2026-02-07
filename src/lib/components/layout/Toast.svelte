<script lang="ts">
	import { getToastIcon, removeToast, type Toast as ToastStore } from '$stores/toasts';
	import { X } from 'lucide-svelte';
	import { linear } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		config: any;
		toast: ToastStore;
	}

	let { config, toast }: Props = $props();

	const progress = new Tween(0, {
		duration: () => toast.duration,
		easing: linear,
	});

	onMount(() => {
		if (!toast.is_infinite && toast.duration > 0) {
			progress.set(100);
		}
	});

	const IconComponent = $derived(getToastIcon(toast, config.icon));
</script>

<div
	class="relative flex w-full max-w-sm overflow-hidden rounded-xl border {config.border} bg-neutral-900/95 p-4 shadow-xl backdrop-blur-sm sm:w-85"
	transition:fly={{ duration: 400, x: 20 }}
>
	<div class="flex w-full gap-4">
		<!-- Icon Container -->
		<div class="flex size-10 shrink-0 items-center justify-center border border-white/5 rounded-lg bg-white/5">
			<IconComponent
				class={config.iconColor}
				size={24}
			/>
		</div>

		<!-- Content Column -->
		<div class="flex-1 min-w-0 pr-6">
			<h3 class="font-bold tracking-tight truncate {config.title}">{toast.title}</h3>
			<p class="mt-1 leading-relaxed text-neutral-300 text-sm whitespace-pre-line">
				{toast.message}
			</p>
			{#if toast.action && toast.actionLabel}
				<button
					class="mt-3 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 font-semibold px-3 py-1.5 text-white/90 text-xs transition-colors hover:bg-white/10"
					onclick={() => {
						toast.action?.();
						removeToast(toast.id);
					}}
				>
					{toast.actionLabel}
				</button>
			{/if}
		</div>

		<!-- Close Button -->
		<button
			class="absolute right-3 top-3 flex size-7 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
			onclick={() => removeToast(toast.id)}
		>
			<X size={16} />
		</button>
	</div>

	<!-- Linear Progress -->
	{#if !toast.is_infinite && toast.duration > 0}
		<div class="absolute bottom-0 left-0 h-1 w-full bg-white/5">
			<div
				class="h-full opacity-40 {config.progressBarColor}"
				style="width: {progress.current}%"
			></div>
		</div>
	{/if}
</div>
