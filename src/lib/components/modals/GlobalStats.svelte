<script lang="ts">
	import {
		achievements,
		atomsPerSecond,
		atoms,
		autoClicksPerSecond,
		bonusMultiplier,
		buildings,
		clickPower,
		electrons,
		globalMultiplier,
		highestAPS,
		inGameTime,
		photons,
		playerLevel,
		powerUpDurationMultiplier,
		powerUpEffectMultiplier,
		powerUpsCollected,
		protons,
		startDate,
		totalAtomsEarned,
		totalAtomsEarnedAllTime,
		totalBonusPhotonsClicked,
		totalBuildingsPurchased,
		totalClicks,
		totalClicksAllTime,
		totalElectronizes,
		totalElectronsEarned,
		totalProtonises,
		totalProtonsEarned,
		totalUpgradesPurchased,
		totalXP,
		upgrades,
		xpGainMultiplier,
	} from '$stores/gameStore';
	import { ACHIEVEMENTS } from '$data/achievements';
	import { formatDuration, formatNumber, formatNumberFull } from '$lib/utils';
	import StatItem from '@components/ui/StatItem.svelte';
	import Modal from '@components/ui/Modal.svelte';
	import {
		Activity,
		Atom,
		Award,
		Building2,
		Clock,
		Flame,
		MousePointerClick,
		Package,
		RotateCcw,
		Sparkles,
		Timer,
		TrendingUp,
		Zap,
	} from 'lucide-svelte';

	const totalAchievements = Object.keys(ACHIEVEMENTS).length;

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let totalBuildings = $derived(Object.values($buildings).reduce((acc, b) => acc + (b?.count || 0), 0));

	// Update time since start every second
	let timeSinceStart = $state(formatDuration(Date.now() - $startDate));
	$effect(() => {
		const interval = setInterval(() => {
			timeSinceStart = formatDuration(Date.now() - $startDate);
		}, 1000);
		return () => clearInterval(interval);
	});
</script>

<Modal title="Statistics" {onClose}>
	<div class="flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
		<!-- General & Production -->
		<section>
			<h3 class="mb-2 flex items-center gap-2 border-b border-white/20 pb-1.5 text-base font-semibold text-white/90">
				<Activity size={18} />
				General
			</h3>
			<div class="grid gap-1.5 sm:grid-cols-2">
				<StatItem
					fullValue={timeSinceStart}
					icon={Clock}
					label="Time Since Start"
					value={timeSinceStart}
				/>
				<StatItem
					fullValue={formatDuration($inGameTime)}
					icon={Timer}
					label="In-Game Time"
					value={formatDuration($inGameTime)}
				/>
				<StatItem
					fullValue={formatNumberFull($playerLevel)}
					icon={Award}
					label="Player Level"
					value={$playerLevel}
				/>
				<StatItem
					fullValue={formatNumberFull($totalXP)}
					icon={Sparkles}
					label="Total XP"
					value={formatNumber($totalXP)}
				/>
				<StatItem
					fullValue={`${$achievements.length} / ${totalAchievements}`}
					icon={Award}
					label="Achievements"
					suffix={` / ${totalAchievements}`}
					value={$achievements.length}
				/>
			</div>
		</section>

		<!-- Production -->
		<section>
			<h3 class="mb-2 flex items-center gap-2 border-b border-white/20 pb-1.5 text-base font-semibold text-white/90">
				<TrendingUp size={18} />
				Production
			</h3>
			<div class="grid gap-1.5 sm:grid-cols-2">
				<StatItem
					fullValue={formatNumberFull($atomsPerSecond)}
					icon={Zap}
					label="Atoms/sec"
					value={formatNumber($atomsPerSecond)}
				/>
				<StatItem
					description="Best achieved"
					fullValue={formatNumberFull($highestAPS)}
					icon={Flame}
					label="Highest APS"
					value={formatNumber($highestAPS)}
				/>
				<StatItem
					fullValue={formatNumberFull($clickPower)}
					icon={MousePointerClick}
					label="Click Power"
					value={formatNumber($clickPower)}
				/>
				<StatItem
					fullValue={formatNumberFull($autoClicksPerSecond)}
					icon={Timer}
					label="Auto Clicks/sec"
					value={formatNumber($autoClicksPerSecond, 0)}
				/>
				<StatItem
					fullValue={`${$globalMultiplier.toFixed(2)}×`}
					icon={TrendingUp}
					label="Global Multiplier"
					prefix="×"
					value={formatNumber($globalMultiplier)}
				/>
				{#if $bonusMultiplier > 1}
					<StatItem
						fullValue={`${$bonusMultiplier.toFixed(2)}×`}
						icon={Zap}
						label="Active Bonus"
						prefix="×"
						value={formatNumber($bonusMultiplier)}
					/>
				{/if}
				<StatItem
					fullValue={`${$xpGainMultiplier.toFixed(2)}×`}
					icon={Sparkles}
					label="XP Multiplier"
					prefix="×"
					value={formatNumber($xpGainMultiplier)}
				/>
			</div>
		</section>

		<!-- Clicks & Resources -->
		<section>
			<h3 class="mb-2 flex items-center gap-2 border-b border-white/20 pb-1.5 text-base font-semibold text-white/90">
				<MousePointerClick size={18} />
				Clicks & Resources
			</h3>
			<div class="grid gap-1.5 sm:grid-cols-2">
				<StatItem
					description="This run"
					fullValue={formatNumberFull($totalClicks)}
					icon={MousePointerClick}
					label="Clicks"
					value={formatNumber($totalClicks, 0)}
				/>
				<StatItem
					description="All time"
					fullValue={formatNumberFull($totalClicksAllTime)}
					icon={MousePointerClick}
					label="Clicks (Total)"
					value={formatNumber($totalClicksAllTime, 0)}
				/>
				<StatItem
					description="This run"
					fullValue={formatNumberFull($totalAtomsEarned)}
					icon={Zap}
					label="Atoms Earned"
					value={formatNumber($totalAtomsEarned)}
				/>
				<StatItem
					description="All time"
					fullValue={formatNumberFull($totalAtomsEarnedAllTime)}
					icon={Zap}
					label="Atoms (Total)"
					value={formatNumber($totalAtomsEarnedAllTime)}
				/>
				<div class="flex items-center gap-2 rounded-lg bg-white/5 p-2.5" title={formatNumberFull($atoms)}>
					<img src="/currencies/atom.png" alt="Atoms" class="size-5" />
					<span class="text-sm text-white/70">Current Atoms</span>
					<span class="ml-auto font-semibold text-accent tabular-nums">{formatNumber($atoms)}</span>
				</div>
			</div>
		</section>

		<!-- Buildings & Upgrades -->
		<section>
			<h3 class="mb-2 flex items-center gap-2 border-b border-white/20 pb-1.5 text-base font-semibold text-white/90">
				<Building2 size={18} />
				Buildings & Upgrades
			</h3>
			<div class="grid gap-1.5 sm:grid-cols-2">
				<StatItem
					description="Currently owned"
					fullValue={formatNumberFull(totalBuildings)}
					icon={Building2}
					label="Buildings Owned"
					value={formatNumber(totalBuildings, 0)}
				/>
				<StatItem
					description="All time"
					fullValue={formatNumberFull($totalBuildingsPurchased)}
					icon={Building2}
					label="Buildings Purchased"
					value={formatNumber($totalBuildingsPurchased, 0)}
				/>
				<StatItem
					description="Currently owned"
					fullValue={$upgrades.length.toString()}
					icon={Package}
					label="Upgrades Owned"
					value={$upgrades.length}
				/>
				<StatItem
					description="All time"
					fullValue={formatNumberFull($totalUpgradesPurchased)}
					icon={Package}
					label="Upgrades Purchased"
					value={formatNumber($totalUpgradesPurchased, 0)}
				/>
			</div>
		</section>

		<!-- Power-ups -->
		<section>
			<h3 class="mb-2 flex items-center gap-2 border-b border-white/20 pb-1.5 text-base font-semibold text-white/90">
				<Zap size={18} />
				Power-ups
			</h3>
			<div class="grid gap-1.5 sm:grid-cols-2">
				<StatItem
					fullValue={formatNumberFull($powerUpsCollected)}
					icon={Zap}
					label="Power-ups Collected"
					value={formatNumber($powerUpsCollected, 0)}
				/>
				<StatItem
					fullValue={`${$powerUpDurationMultiplier.toFixed(2)}×`}
					icon={Timer}
					label="Duration Multiplier"
					prefix="×"
					value={formatNumber($powerUpDurationMultiplier)}
				/>
				<StatItem
					fullValue={`${$powerUpEffectMultiplier.toFixed(2)}×`}
					icon={TrendingUp}
					label="Effect Multiplier"
					prefix="×"
					value={formatNumber($powerUpEffectMultiplier)}
				/>
			</div>
		</section>

		<!-- Prestige Stats -->
		{#if $protons > 0 || $electrons > 0 || $totalProtonises > 0 || $totalElectronizes > 0}
			<section>
				<h3 class="mb-2 flex items-center gap-2 border-b border-white/20 pb-1.5 text-base font-semibold text-white/90">
					<RotateCcw size={18} />
					Prestige
				</h3>
				<div class="grid gap-1.5 lg:grid-cols-2">
					<!-- Protons Column -->
					{#if $protons > 0 || $totalProtonises > 0 || $totalElectronizes > 0}
						<div class="flex flex-col gap-1.5">
							<div class="flex items-center gap-2 rounded-lg bg-white/5 p-2.5" title={formatNumberFull($protons)}>
								<img src="/currencies/proton.png" alt="Protons" class="size-5" />
								<span class="text-sm text-white/70">Protons</span>
								<span class="ml-auto font-semibold text-yellow-400 tabular-nums">{formatNumber($protons)}</span>
							</div>
							<StatItem
								fullValue={formatNumberFull($totalProtonsEarned)}
								icon={Atom}
								label="Protons Earned (Total)"
								value={formatNumber($totalProtonsEarned)}
							/>
							<StatItem
								fullValue={formatNumberFull($totalProtonises)}
								icon={RotateCcw}
								label="Times Protonised"
								value={$totalProtonises}
							/>
						</div>
					{/if}
					<!-- Electrons Column -->
					{#if $electrons > 0 || $totalElectronizes > 0}
						<div class="flex flex-col gap-1.5">
							<div class="flex items-center gap-2 rounded-lg bg-white/5 p-2.5" title={formatNumberFull($electrons)}>
								<img src="/currencies/electron.png" alt="Electrons" class="size-5" />
								<span class="text-sm text-white/70">Electrons</span>
								<span class="ml-auto font-semibold text-green-400 tabular-nums">{formatNumber($electrons)}</span>
							</div>
							<StatItem
								fullValue={formatNumberFull($totalElectronsEarned)}
								icon={Atom}
								label="Electrons Earned (Total)"
								value={formatNumber($totalElectronsEarned)}
							/>
							<StatItem
								fullValue={formatNumberFull($totalElectronizes)}
								icon={RotateCcw}
								label="Times Electronized"
								value={$totalElectronizes}
							/>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Photon Realm Stats -->
		{#if $photons > 0 || $totalBonusPhotonsClicked > 0}
			<section>
				<h3 class="mb-2 flex items-center gap-2 border-b border-white/20 pb-1.5 text-base font-semibold text-white/90">
					<Sparkles size={18} />
					Photon Realm
				</h3>
				<div class="grid gap-1.5 sm:grid-cols-2">
					<div class="flex items-center gap-2 rounded-lg bg-white/5 p-2.5" title={formatNumberFull($photons)}>
						<img src="/currencies/photon.png" alt="Photons" class="size-5" />
						<span class="text-sm text-white/70">Photons</span>
						<span class="ml-auto font-semibold text-purple-400 tabular-nums">{formatNumber($photons)}</span>
					</div>
					<StatItem
						fullValue={formatNumberFull($totalBonusPhotonsClicked)}
						icon={MousePointerClick}
						label="Bonus Photons Clicked"
						value={formatNumber($totalBonusPhotonsClicked, 0)}
					/>
				</div>
			</section>
		{/if}
	</div>
</Modal>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 3px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
