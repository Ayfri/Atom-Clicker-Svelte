<script lang="ts">
	import { playerLevel, currentLevelXP, nextLevelXP, xpProgress } from '$stores/gameStore';
	import { formatNumber } from '$lib/utils';
</script>

<div class="flex fixed left-1/2 top-0 z-10 w-full p-2 -translate-x-1/2 flex-col-reverse gap-1 md:w-3/5 md:flex-col">
	<div class="flex items-center justify-between px-2 text-sm">
		<span class="font-bold text-accent-400">Level {$playerLevel}</span>
		<span class="text-gray-300">{formatNumber($currentLevelXP, 0)} / {formatNumber($nextLevelXP, 0)} XP</span>
	</div>
	<div class="h-2 w-full overflow-hidden bg-gray-700 md:rounded-full">
		<div class="h-full w-full transition-all duration-300 ease-out bg-gradient-to-r from-accent-400 to-accent-500" style="clip-path: inset(0 {100 - $xpProgress}% 0 0);"></div>
	</div>
</div>
