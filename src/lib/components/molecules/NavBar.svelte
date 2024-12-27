<script lang="ts">
	import { mobile } from '$stores/window';
	import NotificationDot from '$lib/components/atoms/NotificationDot.svelte';
	import GlobalStats from '$lib/components/organisms/GlobalStats.svelte';
	import SkillTree from '$lib/components/organisms/SkillTree.svelte';
	import Credits from '$lib/components/organisms/Credits.svelte';
	import Protonise from '$lib/components/organisms/Protonise.svelte';
	import Leaderboard from '$lib/components/organisms/Leaderboard.svelte';
	import { ChartNoAxesColumn, Network, Info, Atom, Trophy } from 'lucide-svelte';
	import { onDestroy, onMount, type ComponentType } from 'svelte';
	import { skillPointsAvailable, protons, atoms } from '$lib/stores/gameStore';
	import { protoniseProtonsGain, PROTONS_ATOMS_REQUIRED } from '$lib/stores/protons';

	interface Link {
		icon: ComponentType;
		label: string;
		component: ComponentType;
		notification?: () => boolean;
		condition?: () => boolean;
	}

	const links: Link[] = [
		{
			icon: ChartNoAxesColumn,
			label: 'Stats',
			component: GlobalStats,
		},
		{
			icon: Trophy,
			label: 'Leaderboard',
			component: Leaderboard,
		},
		{
			icon: Network,
			label: 'Skill Tree',
			component: SkillTree,
			condition: () => $skillPointsAvailable > 0,
			notification: () => $skillPointsAvailable > 0,
		},
		{
			icon: Atom,
			label: 'Protonise',
			component: Protonise,
			condition: () => $atoms >= PROTONS_ATOMS_REQUIRED || $protons > 0,
			notification: () => $protoniseProtonsGain > $protons,
		},
		{
			icon: Info,
			label: 'Credits',
			component: Credits,
		},
	];

	let activeComponent: ComponentType | null = null;
	let visibleComponents: Link[] = [];

	let interval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		visibleComponents = links.filter(link => !link.condition || link.condition());
		interval = setInterval(() => {
			visibleComponents = links.filter(link => !link.condition || link.condition());
		}, 100);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

{#if $mobile}
	<div class="absolute max-md:left-4 md:right-4 max-md:top-1/3 md:top-1/4 -translate-y-1/2 flex flex-col gap-3.5 z-10">
		{#each visibleComponents as link}
			<NotificationDot hasNotification={link.notification ? link.notification() : false}>
				<button
					class="flex items-center justify-center rounded-lg bg-accent/90 p-2 text-white transition-all hover:bg-accent"
					on:click={() => activeComponent = link.component}
				>
					<svelte:component this={link.icon} size={30} />
				</button>
			</NotificationDot>
		{/each}
	</div>
{:else}
	<nav class="fixed left-0 top-0 z-50 flex h-full flex-col items-center gap-5 bg-black/20 px-3 py-6 backdrop-blur">
		{#each visibleComponents as link}
			<NotificationDot hasNotification={link.notification ? link.notification() : false}>
				<button
					class="group relative flex h-12 w-12 items-center justify-center rounded-lg bg-accent/90 text-white transition-all hover:bg-accent"
					on:click={() => activeComponent = link.component}
				>
					<svelte:component this={link.icon} size={32} />
					<span
						class="label invisible absolute left-[calc(100%+1.25rem)] whitespace-nowrap rounded-lg bg-accent/90 px-3 py-2 text-sm opacity-0 transition-all group-hover:visible group-hover:opacity-100 bg-accent-900"
					>
						{link.label}
					</span>
				</button>
			</NotificationDot>
		{/each}
	</nav>
{/if}

{#if activeComponent}
	<svelte:component this={activeComponent} onClose={() => (activeComponent = null)} />
{/if}

<style lang="postcss">
	/* Label anchor, small triangle */
	.label::after {
		content: '';
		position: absolute;
		left: -0.85rem;
		top: 50%;
		transform: translateY(-50%);
		border-width: 0.5rem;
		border-style: solid;
		border-color: transparent theme('colors.accent.900') transparent transparent;
	}
</style>
