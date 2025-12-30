<script lang="ts">
	import { gameManager } from '$helpers/GameManager.svelte';
	import { ACHIEVEMENTS } from '$data/achievements';
	import { CurrenciesTypes } from '$data/currencies';
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
	import HiggsBoson from '@components/icons/HiggsBoson.svelte';

	const totalAchievements = Object.keys(ACHIEVEMENTS).length;

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let totalBuildings = $derived(Object.values(gameManager.buildings).reduce((acc, b) => acc + (b?.count || 0), 0));

	// Update time since start every second
	let timeSinceStart = $state(formatDuration(Date.now() - gameManager.startDate));
	$effect(() => {
		const interval = setInterval(() => {
			timeSinceStart = formatDuration(Date.now() - gameManager.startDate);
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
					fullValue={formatDuration(gameManager.inGameTime)}
					icon={Timer}
					label="In-Game Time"
					value={formatDuration(gameManager.inGameTime)}
				/>
				<StatItem
					fullValue={formatNumberFull(gameManager.playerLevel)}
					icon={Award}
					label="Player Level"
					value={formatNumber(gameManager.playerLevel)}
				/>
				<StatItem
					fullValue={formatNumberFull(gameManager.totalXP)}
					icon={TrendingUp}
					label="Total XP"
					value={formatNumber(gameManager.totalXP)}
				/>
				<StatItem
					fullValue={`${gameManager.achievements.length} / ${totalAchievements}`}
					icon={Award}
					label="Achievements"
					suffix={` / ${totalAchievements}`}
					value={gameManager.achievements.length}
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
					fullValue={formatNumberFull(gameManager.atomsPerSecond)}
					icon={Zap}
					label="Atoms/sec"
					value={formatNumber(gameManager.atomsPerSecond)}
				/>
				<StatItem
					description="Best achieved"
					fullValue={formatNumberFull(gameManager.highestAPS)}
					icon={Flame}
					label="Highest APS"
					value={formatNumber(gameManager.highestAPS)}
				/>
				<StatItem
					fullValue={formatNumberFull(gameManager.clickPower)}
					icon={MousePointerClick}
					label="Click Power"
					value={formatNumber(gameManager.clickPower)}
				/>
				<StatItem
					fullValue={formatNumberFull(gameManager.autoClicksPerSecond)}
					icon={Timer}
					label="Auto Clicks/sec"
					value={formatNumber(gameManager.autoClicksPerSecond, 0)}
				/>
				<StatItem
					fullValue={`${gameManager.globalMultiplier.toFixed(2)}×`}
					icon={TrendingUp}
					label="Global Multiplier"
					prefix="×"
					value={formatNumber(gameManager.globalMultiplier)}
				/>
				{#if gameManager.bonusMultiplier > 1}
					<StatItem
						fullValue={`${gameManager.bonusMultiplier.toFixed(2)}×`}
						icon={Zap}
						label="Active Bonus"
						prefix="×"
						value={formatNumber(gameManager.bonusMultiplier)}
					/>
				{/if}
				<StatItem
					fullValue={`${gameManager.xpGainMultiplier.toFixed(2)}×`}
					icon={Sparkles}
					label="XP Multiplier"
					prefix="×"
					value={formatNumber(gameManager.xpGainMultiplier)}
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
					fullValue={formatNumberFull(gameManager.totalClicksRun)}
					icon={MousePointerClick}
					label="Clicks"
					value={formatNumber(gameManager.totalClicksRun, 0)}
				/>
				<StatItem
					description="All time"
					fullValue={formatNumberFull(gameManager.totalClicksAllTime)}
					icon={MousePointerClick}
					label="Clicks (Total)"
					value={formatNumber(gameManager.totalClicksAllTime, 0)}
				/>
				<StatItem
					currency={CurrenciesTypes.ATOMS}
					description="This run"
					fullValue={formatNumberFull(gameManager.totalAtomsEarnedRun)}
					label="Atoms Earned"
					value={formatNumber(gameManager.totalAtomsEarnedRun)}
				/>
				<StatItem
					currency={CurrenciesTypes.ATOMS}
					description="All time"
					fullValue={formatNumberFull(gameManager.totalAtomsEarnedAllTime)}
					label="Atoms (Total)"
					value={formatNumber(gameManager.totalAtomsEarnedAllTime)}
				/>
				<StatItem
					currency={CurrenciesTypes.ATOMS}
					fullValue={formatNumberFull(gameManager.atoms)}
					label="Current Atoms"
					value={formatNumber(gameManager.atoms)}
				/>
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
					fullValue={formatNumberFull(gameManager.totalBuildingsPurchasedAllTime)}
					icon={Building2}
					label="Buildings Purchased"
					value={formatNumber(gameManager.totalBuildingsPurchasedAllTime, 0)}
				/>
				<StatItem
					description="Currently owned"
					fullValue={gameManager.upgrades.length.toString()}
					icon={Package}
					label="Upgrades Owned"
					value={gameManager.upgrades.length}
				/>
				<StatItem
					description="All time"
					fullValue={formatNumberFull(gameManager.totalUpgradesPurchasedAllTime)}
					icon={Package}
					label="Upgrades Purchased"
					value={formatNumber(gameManager.totalUpgradesPurchasedAllTime, 0)}
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
					fullValue={formatNumberFull(gameManager.powerUpsCollected)}
					icon={Zap}
					label="Power-ups Collected"
					value={formatNumber(gameManager.powerUpsCollected, 0)}
				/>
				<StatItem
					currency={CurrenciesTypes.HIGGS_BOSON}
					description="This run"
					fullValue={formatNumberFull(gameManager.totalBonusHiggsBosonClickedRun)}
					label="Bonus Higgs Clicked"
					value={formatNumber(gameManager.totalBonusHiggsBosonClickedRun, 0)}
				/>
				<StatItem
					currency={CurrenciesTypes.HIGGS_BOSON}
					description="All time"
					fullValue={formatNumberFull(gameManager.totalBonusHiggsBosonClickedAllTime)}
					label="Bonus Higgs Clicked (Total)"
					value={formatNumber(gameManager.totalBonusHiggsBosonClickedAllTime, 0)}
				/>
				<StatItem
					fullValue={`${gameManager.powerUpDurationMultiplier.toFixed(2)}×`}
					icon={Timer}
					label="Duration Multiplier"
					prefix="×"
					value={formatNumber(gameManager.powerUpDurationMultiplier)}
				/>
				<StatItem
					fullValue={`${gameManager.powerUpEffectMultiplier.toFixed(2)}×`}
					icon={TrendingUp}
					label="Effect Multiplier"
					prefix="×"
					value={formatNumber(gameManager.powerUpEffectMultiplier)}
				/>
			</div>
		</section>

		<!-- Prestige Stats -->
		{#if gameManager.protons > 0 || gameManager.electrons > 0 || gameManager.totalProtonisesRun > 0 || gameManager.totalElectronizesAllTime > 0}
			<section>
				<h3 class="mb-2 flex items-center gap-2 border-b border-white/20 pb-1.5 text-base font-semibold text-white/90">
					<RotateCcw size={18} />
					Prestige
				</h3>
				<div class="grid gap-1.5 lg:grid-cols-2">
					<!-- Protons Column -->
					{#if gameManager.protons > 0 || gameManager.totalProtonisesRun > 0 || gameManager.totalElectronizesAllTime > 0}
						<div class="flex flex-col gap-1.5">
							<StatItem
								currency={CurrenciesTypes.PROTONS}
								fullValue={formatNumberFull(gameManager.protons)}
								label="Current Protons"
								value={formatNumber(gameManager.protons)}
							/>
							<StatItem
								currency={CurrenciesTypes.PROTONS}
								description="This run"
								fullValue={formatNumberFull(gameManager.totalProtonsEarnedRun)}
								label="Protons Earned"
								value={formatNumber(gameManager.totalProtonsEarnedRun)}
							/>
							<StatItem
								currency={CurrenciesTypes.PROTONS}
								description="All time"
								fullValue={formatNumberFull(gameManager.totalProtonsEarnedAllTime)}
								label="Protons Earned (Total)"
								value={formatNumber(gameManager.totalProtonsEarnedAllTime)}
							/>
							<StatItem
								fullValue={formatNumberFull(gameManager.totalProtonisesRun)}
								icon={RotateCcw}
								label="Times Protonised"
								value={gameManager.totalProtonisesRun}
							/>
							<StatItem
								fullValue={formatNumberFull(gameManager.totalProtonisesAllTime)}
								icon={RotateCcw}
								label="Times Protonised (Total)"
								value={gameManager.totalProtonisesAllTime}
							/>
						</div>
					{/if}
					<!-- Electrons Column -->
					{#if gameManager.electrons > 0 || gameManager.totalElectronizesAllTime > 0}
						<div class="flex flex-col gap-1.5">
							<StatItem
								currency={CurrenciesTypes.ELECTRONS}
								fullValue={formatNumberFull(gameManager.electrons)}
								label="Current Electrons"
								value={formatNumber(gameManager.electrons)}
							/>
							<StatItem
								currency={CurrenciesTypes.ELECTRONS}
								description="This run"
								fullValue={formatNumberFull(gameManager.totalElectronsEarnedRun)}
								label="Electrons Earned"
								value={formatNumber(gameManager.totalElectronsEarnedRun)}
							/>
							<StatItem
								currency={CurrenciesTypes.ELECTRONS}
								description="All time"
								fullValue={formatNumberFull(gameManager.totalElectronsEarnedAllTime)}
								label="Electrons Earned (Total)"
								value={formatNumber(gameManager.totalElectronsEarnedAllTime)}
							/>
							<StatItem
								fullValue={formatNumberFull(gameManager.totalElectronizesRun)}
								icon={RotateCcw}
								label="Times Electronized"
								value={gameManager.totalElectronizesRun}
							/>
							<StatItem
								fullValue={formatNumberFull(gameManager.totalElectronizesAllTime)}
								icon={RotateCcw}
								label="Times Electronized (Total)"
								value={gameManager.totalElectronizesAllTime}
							/>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Photon Realm Stats -->

		{#if gameManager.photons > 0 || gameManager.excitedPhotons > 0 || gameManager.totalPhotonsEarnedAllTime > 0}
			<section>
				<h3 class="mb-2 flex items-center gap-2 border-b border-white/20 pb-1.5 text-base font-semibold text-white/90">
					<Sparkles size={18} />
					Photon Realm
				</h3>
				<div class="grid gap-1.5 sm:grid-cols-2">
					<StatItem
						currency={CurrenciesTypes.PHOTONS}
						fullValue={formatNumberFull(gameManager.photons)}
						label="Current Photons"
						value={formatNumber(gameManager.photons)}
					/>
					<StatItem
						currency={CurrenciesTypes.PHOTONS}
						description="This run"
						fullValue={formatNumberFull(gameManager.totalPhotonsEarnedRun)}
						label="Photons Earned"
						value={formatNumber(gameManager.totalPhotonsEarnedRun)}
					/>
					<StatItem
						currency={CurrenciesTypes.PHOTONS}
						description="All time"
						fullValue={formatNumberFull(gameManager.totalPhotonsEarnedAllTime)}
						label="Photons Earned (Total)"
						value={formatNumber(gameManager.totalPhotonsEarnedAllTime)}
					/>
					<StatItem
						currency={CurrenciesTypes.EXCITED_PHOTONS}
						fullValue={formatNumberFull(gameManager.excitedPhotons)}
						label="Current Excited Photons"
						value={formatNumber(gameManager.excitedPhotons)}
					/>
					<StatItem
						currency={CurrenciesTypes.EXCITED_PHOTONS}
						description="This run"
						fullValue={formatNumberFull(gameManager.totalExcitedPhotonsEarnedRun)}
						label="Excited Photons Earned"
						value={formatNumber(gameManager.totalExcitedPhotonsEarnedRun)}
					/>
					<StatItem
						currency={CurrenciesTypes.EXCITED_PHOTONS}
						description="All time"
						fullValue={formatNumberFull(gameManager.totalExcitedPhotonsEarnedAllTime)}
						label="Excited Photons Earned (Total)"
						value={formatNumber(gameManager.totalExcitedPhotonsEarnedAllTime)}
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
