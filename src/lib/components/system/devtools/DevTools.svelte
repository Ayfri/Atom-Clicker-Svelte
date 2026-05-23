<script lang="ts">
	import { dev } from '$app/environment';
	import Modal from '@components/ui/Modal.svelte';
	import AchievementsTab from './tabs/AchievementsTab.svelte';
	import ActionsTab from './tabs/ActionsTab.svelte';
	import AutomationTab from './tabs/AutomationTab.svelte';
	import BoostsTab from './tabs/BoostsTab.svelte';
	import IconsTab from './tabs/IconsTab.svelte';
	import JsonTab from './tabs/JsonTab.svelte';
	import RadiationTab from './tabs/RadiationTab.svelte';
	import StatsTab from './tabs/StatsTab.svelte';
	import UpgradesTab from './tabs/UpgradesTab.svelte';
	import {
		Activity,
		BarChart3,
		ChartLine,
		Cpu,
		FileJson,
		FlaskConical,
		Hammer,
		Image,
		LayoutDashboard,
		Settings,
		TrendingUp,
		Trophy,
		Zap,
	} from '@lucide/svelte';

	let isOpen = $state(false);
	let activeTab = $state<string>('stats');

	const groups = [
		{
			name: 'General',
			icon: LayoutDashboard,
			tabs: [
				{ icon: BarChart3, id: 'stats', label: 'Stats' },
				{ icon: FileJson, id: 'json', label: 'JSON' },
				{ icon: Zap, id: 'actions', label: 'Actions' },
			],
		},
		{
			name: 'Progression',
			icon: TrendingUp,
			tabs: [
				{ icon: TrendingUp, id: 'upgrades', label: 'Upgrades' },
				{ icon: Trophy, id: 'achievements', label: 'Achievements' },
				{ icon: Cpu, id: 'automation', label: 'Automation' },
				{ icon: Zap, id: 'boosts', label: 'Boosts' },
			],
		},
		{
			name: 'Realms',
			icon: FlaskConical,
			tabs: [{ icon: Activity, id: 'radiation', label: 'Radiation' }],
		},
		{
			name: 'Tools',
			icon: Hammer,
			tabs: [
				{ icon: Image, id: 'icons', label: 'Icons' },
				{ icon: ChartLine, id: 'benchmark', label: 'Benchmark', href: '/benchmark' },
			],
		},
	];

	function toggleDevTools() {
		isOpen = !isOpen;
	}
</script>

{#if dev}
	<!-- Floating Button -->
	<button
		class="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-accent-950/80 hover:bg-accent-900 text-accent-200 px-4 py-2.5 rounded-xl shadow-2xl transition-all font-bold cursor-pointer hover:scale-105 active:scale-95 backdrop-blur-xl border border-accent-500/30 hover:border-accent-400/60 group hover:shadow-accent-500/20"
		onclick={toggleDevTools}
		aria-label="Open Developer Tools"
	>
		<Settings
			size={18}
			class="group-hover:rotate-90 transition-transform duration-700 ease-in-out"
		/>
		<span class="hidden sm:inline text-[11px] font-black uppercase tracking-[0.2em] opacity-80 group-hover:opacity-100">DevTools</span>
	</button>

	{#if isOpen}
		<Modal
			title="Developer Tools"
			onClose={toggleDevTools}
			width="xl"
			containerClass="!p-0 border-t border-white/5"
		>
			<div class="flex flex-col md:flex-row h-full">
				<!-- Sidebar -->
				<div class="w-full md:w-56 flex flex-col gap-6 border-r border-white/5 pt-4 pb-8 px-4 bg-black/20 shrink-0">
					{#each groups as group}
						{@const GroupIcon = group.icon}
						<div class="space-y-2">
							<h3 class="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
								<GroupIcon size={12} />
								{group.name}
							</h3>
							<div class="flex flex-col gap-1">
								{#each group.tabs as tab}
									{@const TabIcon = tab.icon}
									{#if tab.href}
										<a
											href={tab.href}
											class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-2 text-white/40 hover:text-white/80 hover:bg-white/5 border-transparent"
										>
											<TabIcon size={16} />
											<span>{tab.label}</span>
											<span class="ml-auto text-xs opacity-50">↗</span>
										</a>
									{:else}
										<button
											class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-2 {(
												activeTab === tab.id
											) ?
												'bg-accent-500/10 text-accent-400 border-accent-500/30'
											:	'text-white/40 hover:text-white/80 hover:bg-white/5 border-transparent'}"
											onclick={() => (activeTab = tab.id)}
										>
											<TabIcon
												size={16}
												class={activeTab === tab.id ? 'text-accent-400' : ''}
											/>
											<span>{tab.label}</span>
										</button>
									{/if}
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<!-- Content -->
				<div class="flex-1 **:select-text! overflow-y-auto p-4 pr-3 min-h-0">
					{#if activeTab === 'stats'}
						<StatsTab />
					{:else if activeTab === 'upgrades'}
						<UpgradesTab />
					{:else if activeTab === 'achievements'}
						<AchievementsTab />
					{:else if activeTab === 'automation'}
						<AutomationTab />
					{:else if activeTab === 'boosts'}
						<BoostsTab />
					{:else if activeTab === 'radiation'}
						<RadiationTab />
					{:else if activeTab === 'icons'}
						<IconsTab />
					{:else if activeTab === 'json'}
						<JsonTab />
					{:else if activeTab === 'actions'}
						<ActionsTab />
					{/if}
				</div>
			</div>
		</Modal>
	{/if}
{/if}
