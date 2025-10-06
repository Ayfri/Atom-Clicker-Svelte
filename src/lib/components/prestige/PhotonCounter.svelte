<script lang="ts">
	import {photons} from '$stores/photons';
	import {formatNumber} from '$lib/utils';
</script>

<div class="mb-8 text-center z-1 sm:mb-4">
	<div class="mb-2">
		<span id="photons-value" class="sm:text-[2.75rem] sm:leading-[1.35] text-5xl font-bold text-realm-400 transition-[filter] duration-200">{formatNumber($photons)}</span>
		<span class="font-bold text-2xl opacity-80 text-realm-200">photons</span>
	</div>
	<div class="text-lg relative flex justify-center items-center">
		<div class="text-realm-300">
			Click the violet circles to collect more photons!
		</div>
	</div>
</div>
