<script lang="ts">
	import type { SvelteHTMLElements } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type SpanAttributes = SvelteHTMLElements['span'];

	interface Props extends SpanAttributes {
		hasNotification?: boolean;
		children?: Snippet;
	}

	let { hasNotification = false, children, ...rest }: Props = $props();
</script>

<span
	class="
		relative
		{
			hasNotification ?
			'after:absolute after:-top-1 after:-right-1 after:size-2 after:bg-accent-400 after:rounded-full after:shadow-[0_0_10px] after:shadow-accent-400 after:animate-pulse' :
			''
		}
	"
	{...rest}
>
	{@render children?.()}
</span>
