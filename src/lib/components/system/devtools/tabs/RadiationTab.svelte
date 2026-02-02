<script lang="ts">
	import { radiationManager } from '$helpers/RadiationManager.svelte';
	import { formatNumber } from '$lib/utils';
	import { Zap, Activity, Battery, Thermometer, Shield } from 'lucide-svelte';

	const mass = $derived(radiationManager.mass);
	const cpm = $derived(radiationManager.currentCpm);
	const controlLevel = $derived(radiationManager.controlRodLevel);
	const unlocked = $derived(radiationManager.unlocked);

	function addMass(amount: number) {
		radiationManager.mass += amount;
	}

	function setControl(level: number) {
		radiationManager.setControlRodLevel(level);
	}

	function resetRadiation() {
		radiationManager.reset();
	}
</script>

<div class="space-y-6">
	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
			<div class="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
				<Shield size={12} />
				Status
			</div>
			<div class="text-xl font-bold {unlocked ? 'text-green-400' : 'text-red-400'}">
				{unlocked ? 'ACTIVED' : 'LOCKED'}
			</div>
			<button
				class="text-[10px] font-bold text-accent-400 hover:underline cursor-pointer"
				onclick={() => (radiationManager.unlocked = !radiationManager.unlocked)}
			>
				Toggle Unlock
			</button>
		</div>

		<div class="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
			<div class="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
				<Battery size={12} />
				Core Mass
			</div>
			<div class="text-xl font-bold text-white font-mono">
				{mass.toFixed(2)}
			</div>
			<div class="flex gap-1">
				<button
					class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10"
					onclick={() => addMass(100)}>+100</button
				>
				<button
					class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10"
					onclick={() => addMass(1000)}>+1k</button
				>
			</div>
		</div>

		<div class="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
			<div class="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
				<Activity size={12} />
				Current Output
			</div>
			<div class="text-xl font-bold text-green-400 font-mono">
				{cpm.toFixed(1)} <span class="text-[10px] text-white/30">CPM</span>
			</div>
		</div>

		<div class="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
			<div class="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
				<Thermometer size={12} />
				Control Rods
			</div>
			<div class="text-xl font-bold text-blue-400 font-mono">
				{(controlLevel * 100).toFixed(0)}%
			</div>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={controlLevel}
				oninput={e => setControl(parseFloat(e.currentTarget.value))}
				class="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-blue-500"
			/>
		</div>
	</div>

	<!-- Danger Zone -->
	<div class="pt-4 border-t border-red-500/20">
		<button
			class="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-2 px-6 rounded-xl text-xs transition-all uppercase tracking-widest"
			onclick={resetRadiation}
		>
			Immediate SCRAM (Reset Core)
		</button>
	</div>
</div>
