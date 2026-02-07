<script lang="ts">
	import { Code, Pause, Play, RotateCcw, Settings, Zap } from 'lucide-svelte';
	import {
		ACTIVITY_PRESETS,
		BOT_PROFILES,
		PLAYSTYLE_PRESETS,
		PRESTIGE_PRESETS,
		buildBenchmarkConfig,
		type ActivityPresetId,
		type BenchmarkConfig,
		type PlaystylePresetId,
		type PrestigePresetId,
	} from '$lib/simulation/types';

	let {
		activityId = $bindable(),
		playstyleId = $bindable(),
		prestigeId = $bindable(),
		targetHours = $bindable(),
		isRunning,
		runSimulation,
		stopSimulation,
	} = $props<{
		activityId: ActivityPresetId;
		playstyleId: PlaystylePresetId;
		prestigeId: PrestigePresetId;
		targetHours: number;
		isRunning: boolean;
		runSimulation: () => void;
		stopSimulation: () => void;
	}>();

	const currentConfig = $derived<BenchmarkConfig>(
		buildBenchmarkConfig(activityId, playstyleId, prestigeId, targetHours),
	);

	function applyQuickProfile(profileKey: keyof typeof BOT_PROFILES) {
		const p = BOT_PROFILES[profileKey];
		activityId = p.activityId;
		playstyleId = p.playstyleId;
		prestigeId = p.prestigeId;
	}
</script>

<section class="simulation-config backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl">
	<div class="flex gap-3 items-center mb-6 text-gray-400">
		<Settings size={20} />
		<h2 class="font-semibold text-gray-200 text-xl">Simulation Config</h2>
	</div>

	<div class="gap-10 grid grid-cols-1 mb-8 md:grid-cols-2 lg:grid-cols-4">
		<!-- Core Config: min width so selects aren't squeezed -->
		<div class="flex min-w-[260px] flex-col gap-4">
			<h3 class="flex gap-2 items-center text-gray-400 text-sm uppercase">
				<Settings size={14} /> Config
			</h3>
			<p class="text-gray-500 text-xs">Mix activity, playstyle and prestige. Or pick a quick profile.</p>
			<div class="flex flex-col gap-4">
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(BOT_PROFILES) as [key, preset] (key)}
						<button
							class="cursor-pointer px-3 py-1.5 rounded-lg text-xs transition-colors {activityId === preset.activityId &&
							playstyleId === preset.playstyleId &&
							prestigeId === preset.prestigeId
								? 'bg-cyan-500/30 text-cyan-400'
								: 'bg-white/5 hover:bg-white/10 text-gray-400'}"
							disabled={isRunning}
							onclick={() => applyQuickProfile(key as keyof typeof BOT_PROFILES)}
							type="button"
						>
							{key === 'afk'
								? 'AFK'
								: key === 'balanced'
									? 'Balanced'
									: 'Tryhard'}
						</button>
					{/each}
				</div>
				<div class="flex min-w-0 flex-col gap-4">
					<div class="flex flex-col gap-1.5 min-w-[200px]">
						<label class="text-gray-500 text-xs" for="activity">Activity</label>
						<select
							bind:value={activityId}
							class="simulation-config-select bg-slate-800 border border-white/10 disabled:cursor-not-allowed disabled:opacity-50 focus:border-green-400 focus:outline-none px-3 py-2 rounded-lg text-gray-200 text-sm w-full"
							disabled={isRunning}
							id="activity"
						>
							{#each Object.entries(ACTIVITY_PRESETS) as [id, a] (id)}
								<option value={id} class="text-gray-200 bg-slate-900">{a.name}</option>
							{/each}
						</select>
					</div>
					<div class="flex flex-col gap-1.5 min-w-[200px]">
						<label class="text-gray-500 text-xs" for="playstyle">Playstyle</label>
						<select
							bind:value={playstyleId}
							class="simulation-config-select bg-slate-800 border border-white/10 disabled:cursor-not-allowed disabled:opacity-50 focus:border-green-400 focus:outline-none px-3 py-2 rounded-lg text-gray-200 text-sm w-full"
							disabled={isRunning}
							id="playstyle"
						>
							{#each Object.entries(PLAYSTYLE_PRESETS) as [id, p] (id)}
								<option value={id} class="text-gray-200 bg-slate-900">{p.name}</option>
							{/each}
						</select>
					</div>
					<div class="flex flex-col gap-1.5 min-w-[200px]">
						<label class="text-gray-500 text-xs" for="prestige">Prestige</label>
						<select
							bind:value={prestigeId}
							class="simulation-config-select bg-slate-800 border border-white/10 disabled:cursor-not-allowed disabled:opacity-50 focus:border-green-400 focus:outline-none px-3 py-2 rounded-lg text-gray-200 text-sm w-full"
							disabled={isRunning}
							id="prestige"
						>
							{#each Object.entries(PRESTIGE_PRESETS) as [id, p] (id)}
								<option value={id} class="text-gray-200 bg-slate-900">{p.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-gray-500 text-xs" for="hours">Target Duration</label>
					<div class="flex gap-2 items-center">
						<input
							bind:value={targetHours}
							class="bg-black/30 border border-white/10 disabled:cursor-not-allowed disabled:opacity-50 focus:border-green-400 focus:outline-none px-3 py-2 rounded-lg text-gray-200 text-sm w-full"
							disabled={isRunning}
							id="hours"
							min="1"
							type="number"
						/>
						<span class="text-gray-500 text-sm">hours</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Bot Behavior -->
		<div class="flex flex-col gap-4">
			<h3 class="flex gap-2 items-center text-gray-400 text-sm uppercase">
				<Zap size={14} /> Bot Behavior
			</h3>
			<p class="text-gray-500 text-xs">Defines how the bot interacts with the game. Knowledge affects efficiency and priority.</p>
			<div class="gap-x-4 gap-y-3 grid grid-cols-2">
				<div class="flex flex-col">
					<span class="text-gray-500 text-xs">Strategy</span>
					<span class="capitalize font-medium text-green-400 text-sm">{currentConfig.botBehavior.buyStrategy}</span>
				</div>
				<div class="flex flex-col">
					<span class="text-gray-500 text-xs">Knowledge</span>
					<span class="font-medium text-cyan-400 text-sm">{Math.round(currentConfig.botBehavior.gameKnowledge * 100)}%</span>
				</div>
				<div class="flex flex-col">
					<span class="text-gray-500 text-xs">Clicks</span>
					<span class="font-medium text-amber-500 text-sm">
						{currentConfig.botBehavior.clicksPerSecond}/s
						{#if currentConfig.botBehavior.activityPattern}
							<span class="text-gray-500 font-normal"
								>({currentConfig.botBehavior.activityPattern.activeMinutes} min active/h)</span
							>
						{/if}
					</span>
				</div>
				<div class="flex flex-col">
					<span class="text-gray-500 text-xs">Decision Flow</span>
					<span class="font-medium text-purple-400 text-sm">{currentConfig.botBehavior.autoBuy ? 'Reactive' : 'Manual'}</span>
				</div>
			</div>
		</div>

		<!-- Prestige Strategy -->
		<div class="flex flex-col gap-4">
			<h3 class="flex gap-2 items-center text-gray-400 text-sm uppercase">
				<RotateCcw size={14} /> Prestige Logic
			</h3>
			<p class="text-gray-500 text-xs">
				Wait for a multiplier (gain vs current) before resetting. Higher means more efficient prestiges.
			</p>
			<div class="gap-x-4 gap-y-3 grid grid-cols-2">
				<div class="flex flex-col">
					<span class="text-gray-500 text-xs">Protonise</span>
					<span class="font-medium text-amber-400 text-sm">
						{currentConfig.prestigeStrategy.autoProtonise ?
							`${currentConfig.prestigeStrategy.protoniseThreshold}x gain`
						:	'Manual Only'}
					</span>
				</div>
				<div class="flex flex-col">
					<span class="text-gray-500 text-xs">Electronize</span>
					<span class="font-medium text-blue-400 text-sm">
						{currentConfig.prestigeStrategy.autoElectronize ?
							`${currentConfig.prestigeStrategy.electronizeThreshold}x gain`
						:	'Manual Only'}
					</span>
				</div>
			</div>
		</div>

		<!-- Engine Settings -->
		<div class="flex flex-col gap-4">
			<h3 class="flex gap-2 items-center text-gray-400 text-sm uppercase">
				<Code size={14} /> Engine Stats
			</h3>
			<p class="text-gray-500 text-xs">Simulation fidelity. Resolution affects graph smoothness and simulation accuracy.</p>
			<div class="gap-x-4 gap-y-3 grid grid-cols-2">
				<div class="flex flex-col">
					<span class="text-gray-500 text-xs">Tick Rate</span>
					<span class="font-mono text-gray-300 text-sm">{currentConfig.tickRate}ms</span>
				</div>
				<div class="flex flex-col">
					<span class="text-gray-500 text-xs">Snapshots</span>
					<span class="font-mono text-gray-300 text-sm">{currentConfig.snapshotInterval}s</span>
				</div>
				<div class="col-span-2 flex flex-col">
					<span class="text-gray-500 text-xs">Resolution</span>
					<span class="font-medium text-gray-400 text-xs uppercase"
						>{(3600 / currentConfig.snapshotInterval).toFixed(1)} points/game-hour</span
					>
				</div>
			</div>
		</div>
	</div>

	<!-- Feature toggles -->
	<div class="bg-black/20 flex flex-wrap gap-4 mb-6 p-4 rounded-lg text-sm">
		<span class="flex gap-2 items-center">
			<span class={currentConfig.botBehavior.autoBuyBuildings ? 'text-green-400' : 'text-gray-600'}>●</span>
			Buildings
		</span>
		<span class="flex gap-2 items-center">
			<span class={currentConfig.botBehavior.autoBuyUpgrades ? 'text-green-400' : 'text-gray-600'}>●</span>
			Upgrades
		</span>
		<span class="flex gap-2 items-center">
			<span class={currentConfig.botBehavior.autoBuySkills ? 'text-green-400' : 'text-gray-600'}>●</span>
			Skills
		</span>
		<span class="flex gap-2 items-center">
			<span class={currentConfig.botBehavior.autoBuyPhotonUpgrades ? 'text-green-400' : 'text-gray-600'}>●</span>
			Photon Upgrades
		</span>
		<span class="flex gap-2 items-center">
			<span class={currentConfig.botBehavior.clicksPerSecond > 0 ? 'text-green-400' : 'text-gray-600'}>●</span>
			Clicks
			({currentConfig.botBehavior.clicksPerSecond}/s
			{#if currentConfig.botBehavior.activityPattern}
				, {currentConfig.botBehavior.activityPattern.activeMinutes} min/h
			{/if})
		</span>
	</div>

	{#if isRunning}
		<button
			class="bg-linear-to-r cursor-pointer flex font-semibold from-red-500 gap-3 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/30 items-center justify-center orange-500 px-8 py-4 rounded-xl text-lg text-white to-orange-500 transition-all w-full"
			onclick={stopSimulation}
		>
			<Pause size={20} />
			Stop Simulation
		</button>
	{:else}
		<button
			class="bg-linear-to-r cursor-pointer cyan-400 flex font-semibold from-green-400 gap-3 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-400/30 items-center justify-center px-8 py-4 rounded-xl text-gray-900 text-lg to-cyan-400 transition-all w-full"
			onclick={runSimulation}
		>
			<Play size={20} />
			Run Simulation
		</button>
	{/if}
</section>
