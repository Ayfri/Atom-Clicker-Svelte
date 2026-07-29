<script lang="ts">
	import { radiationManager } from '$helpers/RadiationManager.svelte';
	import type { RadiationUpgrade } from '$data/radiationUpgrades';

	interface Props {
		id: string;
		level: number;
		upgrade: RadiationUpgrade;
	}

	let { id, level, upgrade }: Props = $props();

	function onLevelChange(e: Event & { currentTarget: HTMLInputElement }) {
		const val = parseInt(e.currentTarget.value);
		if (!isNaN(val) && val >= 0) {
			const cappedVal = Math.min(val, upgrade.maxLevel);
			radiationManager.upgradeLevels = {
				...radiationManager.upgradeLevels,
				[id]: cappedVal,
			};
		}
	}
</script>

<div
	class="p-3 rounded-xl border flex flex-col gap-2 transition-colors group bg-green-950/10 border-green-700/20 hover:border-green-500/40"
>
	<div class="flex items-start justify-between gap-2">
		<div class="font-bold text-sm transition-colors group-hover:text-white text-green-200">
			{upgrade.name}
		</div>
		<div class="text-[11px] font-mono text-white/40">{id}</div>
	</div>

	<div class="text-xs text-white/50 line-clamp-2 leading-tight min-h-[2.5em]">
		{upgrade.description(level)}
	</div>

	<div class="flex items-center gap-3 mt-1">
		<div class="relative flex-1">
			<input
				type="number"
				min="0"
				max={upgrade.maxLevel}
				value={level}
				onchange={onLevelChange}
				class="w-full bg-black/40 rounded-md px-2 py-1.5 text-sm border focus:outline-none text-white font-bold transition-all border-green-500/30 focus:border-green-400/60"
			/>
		</div>
		<div class="flex flex-col items-end whitespace-nowrap">
			<span class="text-xs uppercase tracking-widest font-black text-white/50 leading-none">Level</span>
			<span class="text-[11px] text-white/30 font-bold leading-none mt-1">Max: {upgrade.maxLevel}</span>
		</div>
	</div>
</div>
