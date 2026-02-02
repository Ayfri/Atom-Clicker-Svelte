<script lang="ts">
	import Tooltip from '@components/ui/Tooltip.svelte';
	import { radiationManager } from '$helpers/RadiationManager.svelte';
	import { CircleHelp } from 'lucide-svelte';

	const controlLevel = $derived(radiationManager.controlRodLevel);
	const cpm = $derived(radiationManager.currentCpm);

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		radiationManager.setControlRodLevel(parseFloat(target.value));
	}

	// Status based on control level
	const status = $derived(
		controlLevel < 0.1 ? { label: 'Idle', color: 'text-blue-400', desc: 'No output, no burn' }
		: controlLevel < 0.3 ? { label: 'Low', color: 'text-green-400', desc: 'Efficient, slow burn' }
		: controlLevel < 0.6 ? { label: 'Active', color: 'text-yellow-400', desc: 'Balanced output' }
		: controlLevel < 0.85 ? { label: 'High', color: 'text-orange-400', desc: 'High output, fast burn' }
		: { label: 'MAX', color: 'text-red-400', desc: 'Maximum output!' },
	);
</script>

<div class="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-green-500/20">
	<div class="flex items-center justify-between mb-2">
		<h3 class="text-xs font-semibold text-green-400 flex items-center gap-2">
			<svg
				class="w-3.5 h-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<rect
					x="3"
					y="3"
					width="18"
					height="18"
					rx="2"
				></rect>
				<line
					x1="12"
					y1="3"
					x2="12"
					y2="21"
				></line>
			</svg>
			Power Level
		</h3>
		<Tooltip
			class="ml-auto"
			position="top"
			size="md"
		>
			{#snippet children()}
				<CircleHelp class="w-3.5 h-3.5 text-white/30 hover:text-green-400 transition-colors" />
			{/snippet}
			{#snippet content()}
				<div class="text-left">
					<p class="text-white/70"><strong>CPM = Cycles Per Minute</strong></p>
					<p class="text-white/60 mt-1 text-xs">It represents the reactor's output intensity.</p>
					<p class="text-white/60 mt-1 text-xs">Higher CPM = Higher production multiplier.</p>
					<p class="text-green-400/80 mt-1 text-xs font-mono">100 CPM adds +200% bonus!</p>
				</div>
			{/snippet}
		</Tooltip>
	</div>

	<!-- Slider -->
	<div class="mb-2">
		<input
			type="range"
			min="0"
			max="1"
			step="0.01"
			value={controlLevel}
			oninput={handleChange}
			class="w-full h-2 rounded-lg appearance-none cursor-pointer"
			style="background: linear-gradient(to right, #3b82f6, #22c55e 33%, #eab308 66%, #ef4444)"
		/>
	</div>

	<!-- Stats row -->
	<div class="grid grid-cols-3 gap-2 text-xs">
		<div class="text-center">
			<div class="text-white/40">Level</div>
			<div class="font-mono text-white">{(controlLevel * 100).toFixed(0)}%</div>
		</div>
		<div class="text-center">
			<div class="text-white/40">Status</div>
			<div class={status.color + ' font-medium'}>{status.label}</div>
		</div>
		<div class="text-center">
			<div class="text-white/40">Output</div>
			<div class="font-mono text-green-400">{cpm.toFixed(0)}</div>
		</div>
	</div>
</div>

<style>
	input[type='range']::-webkit-slider-thumb {
		box-sizing: border-box;
		appearance: none;
		background: white;
		border: 2px solid #39ff14;
		border-radius: 50%;
		box-shadow: 0 0 8px rgba(57, 255, 20, 0.5);
		cursor: pointer;
		height: 18px;
		width: 18px;
	}

	input[type='range']::-moz-range-thumb {
		box-sizing: border-box;
		background: white;
		border: 2px solid #39ff14;
		border-radius: 50%;
		box-shadow: 0 0 8px rgba(57, 255, 20, 0.5);
		cursor: pointer;
		height: 18px;
		width: 18px;
	}
</style>
