<script lang="ts">
	import {gameManager} from '$helpers/GameManager.svelte';
	import {quarksManager} from '$helpers/QuarksManager.svelte';
	import {ACHIEVEMENTS} from '$data/achievements';
	import Quark from '@components/icons/Quark.svelte';
	import HelpIcon from '@components/ui/HelpIcon.svelte';
	import QuarkLabel from '@components/ui/QuarkLabel.svelte';

	const unlockedAchievements = $derived(Object.entries(ACHIEVEMENTS).map(([name, achievement]) => ({
		...achievement,
		id: name,
		unlocked: gameManager.achievements.includes(name)
	})));

	const claimableAchievementIds = $derived(gameManager.achievements.filter(id => !quarksManager.claimedAchievementIds.includes(id)));
	const PARTICLE_DIRECTIONS = [
		[-20, -24], [0, -30], [21, -22], [28, -4], [20, 20], [0, 28], [-22, 18], [-29, -5],
	] as const;

	interface ClaimBurst {
		duration: number;
		id: number;
	}

	let bursts = $state<Record<string, ClaimBurst>>({});
	let claimAllBurst = $state<ClaimBurst | null>(null);
	let nextBurstId = 0;

	function startBurst(achievementId: string, duration = 650) {
		const burst = { duration, id: ++nextBurstId };
		bursts = { ...bursts, [achievementId]: burst };
		setTimeout(() => {
			if (bursts[achievementId]?.id !== burst.id) return;
			const { [achievementId]: _, ...remainingBursts } = bursts;
			bursts = remainingBursts;
		}, duration);
	}

	function claimAchievement(achievementId: string) {
		startBurst(achievementId);
		quarksManager.claimAchievement(achievementId);
	}

	function claimAllAchievements() {
		const duration = Math.min(2400, 900 + Math.log10(Math.max(gameManager.atoms, 1)) * 160);
		const burst = { duration, id: ++nextBurstId };
		claimAllBurst = burst;
		for (const achievementId of claimableAchievementIds) startBurst(achievementId, duration);
		setTimeout(() => {
			if (claimAllBurst?.id === burst.id) claimAllBurst = null;
		}, duration);
		quarksManager.claimAchievements(claimableAchievementIds);
	}
</script>

<div class="backdrop-blur-xs bg-black/10 p-3 rounded-lg h-150 lg:h-[calc(100vh-180px)] flex flex-col">
	<div class="flex items-center gap-1.5">
		<h2 class="font-semibold text-lg">
		Achievements ({gameManager.achievements.length}/{Object.keys(ACHIEVEMENTS).length})
		</h2>
		{#if claimableAchievementIds.length > 0}
			<div class="relative ml-auto">
				<button
					class="rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-white/20 cursor-pointer"
					onclick={claimAllAchievements}
				>
					Claim all
				</button>
				{#if claimAllBurst}
					<span class="claim-burst claim-all-burst pointer-events-none" style:--duration="{claimAllBurst.duration}ms">
						{#each [...PARTICLE_DIRECTIONS, ...PARTICLE_DIRECTIONS, ...PARTICLE_DIRECTIONS] as [x, y], index (index)}
							<span class="claim-particle" style:--delay="{index * 18}ms" style:--x="{x * 1.8}px" style:--y="{y * 1.8}px"></span>
						{/each}
					</span>
				{/if}
			</div>
		{/if}
		<HelpIcon position="bottom">
			{#snippet content()}
				<p class="text-xs text-white/80">
					Each achievement awards 1 <QuarkLabel /> the first time you unlock it. Hidden achievements stay secret until you find them.
				</p>
			{/snippet}
		</HelpIcon>
	</div>
	<div class="achievement-grid mt-2 grid gap-1.5 overflow-y-auto flex-1 custom-scrollbar px-1">
		{#each unlockedAchievements as achievement}
			{@const hidden = achievement.hiddenCondition?.(gameManager) === true}
			<div
				class="duration-200 flex items-center gap-2 rounded-lg p-2 transition-all {achievement.unlocked
					? 'bg-[#486f9b]'
					: 'cursor-not-allowed bg-white/5 opacity-50'}"
			>
				<!-- <div class="icon">{achievement.icon}</div> -->
				<div>
					<h3 class="m-0 font-semibold text-sm">
						{hidden && !achievement.unlocked ? '???' : achievement.name}
					</h3>
					<p class="m-0 mt-0.5 text-xs opacity-80">
						{hidden && !achievement.unlocked ? '???' : achievement.description}
					</p>
				</div>
					{#if achievement.unlocked && !quarksManager.claimedAchievementIds.includes(achievement.id)}
						<button
							class="ml-auto flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-1.5 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20 cursor-pointer"
							onclick={() => claimAchievement(achievement.id)}
							aria-label="Claim 1 Quark for {achievement.name}"
							title="Claim 1 Quark"
						>
							+1 <Quark size={14} />
						</button>
					{/if}
					{#if bursts[achievement.id]}
						<span class="claim-burst pointer-events-none" style:--duration="{bursts[achievement.id].duration}ms">
							{#each PARTICLE_DIRECTIONS as [x, y], index (index)}
								<span class="claim-particle" style:--delay="{index * 16}ms" style:--x="{x}px" style:--y="{y}px"></span>
							{/each}
						</span>
					{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.claim-burst {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 10;
		display: block;
		width: 0;
		height: 0;
	}

	.claim-all-burst {
		top: 100%;
	}

	.claim-particle {
		position: absolute;
		width: 5px;
		height: 5px;
		border-radius: 999px;
		background: #ffffff;
		box-shadow: 0 0 7px #4a9eff;
		animation: quark-claim-burst var(--duration) cubic-bezier(0.15, 0.8, 0.3, 1) forwards;
		animation-delay: var(--delay);
	}

	.claim-particle:nth-child(3n + 1) {
		background: #4a9eff;
	}

	.claim-particle:nth-child(3n + 2) {
		background: #3ddc84;
	}

	.claim-particle:nth-child(3n) {
		background: #ff5d73;
	}

	@keyframes quark-claim-burst {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.2);
		}
		15% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.claim-particle {
			animation-duration: 1ms;
		}
	}
</style>
