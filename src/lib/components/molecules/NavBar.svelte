<script lang="ts">
	import { BarChart2, ChartBarIcon, ChartNoAxesColumn, Network } from 'lucide-svelte';
	import { mobile } from '$stores/window';
	import { skillPointsAvailable } from '$stores/gameStore';
	import NotificationDot from '$lib/components/atoms/NotificationDot.svelte';
	import GlobalStats from '$lib/components/organisms/GlobalStats.svelte';
	import SkillTree from '$lib/components/organisms/SkillTree.svelte';

	let showStats = false;
	let showSkillTree = false;
</script>

{#if $mobile}
	<div class="absolute max-md:left-4 md:right-4 max-md:top-1/3 md:top-1/4 -translate-y-1/2 flex flex-col gap-3 z-10">
		<button
			class="flex items-center justify-center rounded-lg bg-accent/90 p-2.5 text-white backdrop-blur-sm transition-all hover:bg-accent"
			on:click={() => (showStats = true)}
		>
			<ChartNoAxesColumn size={32} />
		</button>
		<NotificationDot hasNotification={$skillPointsAvailable > 0}>
			<button
				class="flex items-center justify-center rounded-lg bg-accent/90 p-2.5 text-white backdrop-blur-sm transition-all hover:bg-accent"
				on:click={() => (showSkillTree = true)}
			>
				<Network size={32} />
			</button>
		</NotificationDot>
	</div>
{:else}
	<nav class="fixed left-0 top-0 z-50 flex h-full flex-col items-center gap-2 bg-black/30 px-4 py-6 backdrop-blur-md">
		<button
			class="group relative flex h-12 w-12 items-center justify-center rounded-lg bg-accent/90 text-white transition-all hover:bg-accent"
			on:click={() => (showStats = true)}
		>
			<ChartNoAxesColumn size={32} />
			<span
				class="invisible absolute left-[calc(100%+0.75rem)] whitespace-nowrap rounded-lg bg-accent/90 px-3 py-2 text-sm opacity-0 transition-all group-hover:visible group-hover:opacity-100"
			>
				Stats
			</span>
		</button>
		<NotificationDot hasNotification={$skillPointsAvailable > 0}>
			<button
				class="group relative flex h-12 w-12 items-center justify-center rounded-lg bg-accent/90 text-white transition-all hover:bg-accent"
				on:click={() => (showSkillTree = true)}
			>
				<Network size={32} />
				<span
					class="invisible absolute left-[calc(100%+0.75rem)] whitespace-nowrap rounded-lg bg-accent/90 px-3 py-2 text-sm opacity-0 transition-all group-hover:visible group-hover:opacity-100"
				>
					Skill Tree
				</span>
			</button>
		</NotificationDot>
	</nav>
{/if}

{#if showStats}
	<GlobalStats onClose={() => (showStats = false)} />
{/if}

{#if showSkillTree}
	<SkillTree onClose={() => (showSkillTree = false)} />
{/if}
