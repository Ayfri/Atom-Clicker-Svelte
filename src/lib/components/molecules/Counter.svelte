<script lang="ts">
	import {atomsPerSecond, atoms, hasBonus, protons} from '$stores/gameStore';
	import {formatNumber} from '$lib/utils';
</script>

<div class="mb-8 text-center z-[1] sm:mb-4">
	<div class="mb-2">
		{#if $protons > 0}
			<div>
				<span id="protons-value" class="text-2xl font-bold text-yellow-400">{formatNumber($protons)}</span>
				<span class="font-bold text-lg opacity-80">protons</span>
			</div>
		{/if}
		<span id="atoms-value" class=" sm:text-[2.75rem] sm:leading-[1.35] text-5xl font-bold text-accent-500 transition-[filter] duration-200 {$hasBonus ? 'drop-shadow-[0_0_10px_#4a90e2]' : ''}">{formatNumber($atoms)}</span>
		<span class="font-bold text-2xl opacity-80">atoms</span>
	</div>
	<div class="text-lg opacity-80 {$hasBonus ? 'opacity-100' : ''}">
		<span id="atoms-per-second-value" class="font-bold transition-[filter] duration-200 {$hasBonus ? 'drop-shadow-[0_0_7px_currentColor]' : ''}">{formatNumber($atomsPerSecond)}</span> atoms per second
	</div>
</div>
