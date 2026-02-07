<script lang="ts">
	import { Code, Copy } from 'lucide-svelte';
	import type { SimulationResult } from '$lib/simulation/types';

	let { result } = $props<{ result: SimulationResult }>();

	const finalStateJson = $derived.by(() => {
		if (!result || result.snapshots.length === 0) return null;
		const lastSnapshot = result.snapshots[result.snapshots.length - 1];
		// Remove actions array to keep JSON cleaner
		const { actions, ...state } = lastSnapshot;
		return JSON.stringify(state, null, 2);
	});

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}
</script>

<section class="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl">
	<div class="flex gap-3 items-center justify-between mb-4">
		<div class="flex gap-3 items-center text-gray-400">
			<Code size={20} />
			<h2 class="font-semibold text-gray-200 text-xl">Final Game State</h2>
		</div>
		{#if finalStateJson}
			<button
				class="bg-white/10 border border-white/10 cursor-pointer flex gap-2 hover:bg-white/20 items-center px-3 py-1.5 rounded-lg text-sm text-white transition-colors"
				onclick={() => finalStateJson && copyToClipboard(finalStateJson)}
			>
				<Copy size={14} />
				Copy JSON
			</button>
		{/if}
	</div>
	{#if finalStateJson}
		<pre
			class="bg-black/40 border border-white/5 font-mono max-h-80 overflow-auto p-4 rounded-lg text-[10px] text-green-400/90">{finalStateJson}
		</pre>
	{/if}
</section>
