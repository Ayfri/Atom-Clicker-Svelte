/** Headless simulation engine (chunked with scheduler.yield). */
import { ACHIEVEMENTS } from '$data/achievements';
import { BUILDINGS, BUILDING_TYPES, type BuildingType } from '$data/buildings';
import { CurrenciesTypes, type CurrencyName } from '$data/currencies';
import { ALL_PHOTON_UPGRADES, getPhotonUpgradeCost } from '$data/photonUpgrades';
import { POWER_UPS } from '$data/powerUp';
import { RADIATION_UPGRADES, getRadiationUpgradePrice } from '$data/radiationUpgrades';
import { RealmTypes } from '$data/realms';
import { SKILL_UPGRADES } from '$data/skillTree';
import { UPGRADES } from '$data/upgrades';
import { currenciesManager } from '$helpers/CurrenciesManager.svelte';
import { calculateEffects, getUpgradesWithEffects } from '$helpers/effects';
import { gameManager } from '$helpers/GameManager.svelte';
import { radiationManager } from '$helpers/RadiationManager.svelte';
import {
	MILESTONES,
	MILESTONE_CHECKS,
	type BenchmarkConfig,
	type MilestoneHit,
	type SimulationAction,
	type SimulationResult,
	type SimulationSnapshot,
	type SpikeEvent,
} from './types';

const CHUNK_SIZE = 500;
const YIELD_INTERVAL = 10;

const ACHIEVEMENT_ENTRIES = Object.entries(ACHIEVEMENTS);
const UPGRADE_ENTRIES = Object.entries(UPGRADES);
const SKILL_ENTRIES = Object.entries(SKILL_UPGRADES);
const PHOTON_UPGRADE_ENTRIES = Object.entries(ALL_PHOTON_UPGRADES);

/** Progress state of a running simulation. */
export interface SimulationProgress {
	currentHour: number;
	estimatedTimeLeft: number;
	milestoneCount: number;
	percent: number;
	recentMilestones: MilestoneHit[];
	recentSpikes: SpikeEvent[];
	snapshots: SimulationSnapshot[];
	ticksPerSecond: number;
	totalHours: number;
}

export type ProgressCallback = (progress: SimulationProgress) => void;

// Yields to main thread so UI stays responsive; uses scheduler.yield when available.
async function yieldToMain(): Promise<void> {
	if ('scheduler' in globalThis && typeof (globalThis as any).scheduler?.yield === 'function') {
		return (globalThis as any).scheduler.yield();
	}
	return new Promise(resolve => setTimeout(resolve, 0));
}

const SPIKE_WINDOW_MS = 60_000;
const SPIKE_MIN_HISTORY = 5;
const SPIKE_MULTIPLIER = 4;
const SPIKE_MIN_RATE = 50;

export class SimulationEngine {
	private abortController: AbortController | null = null;
	private actions: SimulationAction[] = [];
	private config: BenchmarkConfig;
	private everPurchasedBuildings = new Set<string>();
	private hitMilestones = new Set<string>();
	private lastWasActive = false;
	private milestones: MilestoneHit[] = [];
	private nextPowerUpTime = 0;
	private powerUpCounter = 0;
	private prestigesThisActiveWindow = 0;
	private recentMilestones: MilestoneHit[] = [];
	private recentSpikes: SpikeEvent[] = [];
	private savedState: string | null = null;
	private snapshots: SimulationSnapshot[] = [];
	private spikeRateHistory: number[] = [];
	private spikes: SpikeEvent[] = [];
	private spikeWindowActions: SimulationAction[] = [];
	private spikeWindowAps = 0;
	private spikeWindowStart = 0;

	constructor(config: BenchmarkConfig) {
		this.config = config;
	}

	cancel() {
		this.abortController?.abort();
	}

	async runAsync(onProgress?: ProgressCallback): Promise<SimulationResult> {
		this.abortController = new AbortController();
		const { signal } = this.abortController;

		const startRealTime = performance.now();
		// Simulation mutates global game state; save and restore so main game is unchanged.
		this.savedState = JSON.stringify(gameManager.getCurrentState());
		gameManager.resetAll();
		currenciesManager.hardReset();

		// A real engaged player turns auto-click on as soon as upgrades unlock it; the derived returns 0 if no upgrade.
		if (!gameManager.settings.automation.autoClick) gameManager.toggleAutoClick();
		if (!gameManager.settings.automation.autoClickPhotons) gameManager.toggleAutoClickPhotons();
		this.actions = [];
		this.everPurchasedBuildings.clear();
		this.hitMilestones.clear();
		this.lastWasActive = false;
		this.milestones = [];
		this.nextPowerUpTime = this.rollPowerUpInterval();
		this.powerUpCounter = 0;
		this.prestigesThisActiveWindow = 0;
		this.recentMilestones = [];
		this.recentSpikes = [];
		this.snapshots = [];
		this.spikeRateHistory = [];
		this.spikes = [];
		this.spikeWindowActions = [];
		this.spikeWindowAps = gameManager.atomsPerSecond;
		this.spikeWindowStart = 0;

		const totalGameTimeMs = this.config.targetHours * 3600 * 1000;
		const totalTicks = Math.floor(totalGameTimeMs / this.config.tickRate);
		const snapshotIntervalTicks = Math.floor((this.config.snapshotInterval * 1000) / this.config.tickRate);
		// Scale check intervals to simulated time: achievements every ~1s, milestones every ~5s.
		const achievementCheckInterval = Math.max(1, Math.round(1000 / this.config.tickRate));
		const milestoneCheckInterval = Math.max(1, Math.round(5000 / this.config.tickRate));
		this.takeSnapshot();

		let lastProgressUpdate = startRealTime;
		let ticksSinceLastUpdate = 0;
		let lastTicksPerSecond = 0;
		let cancelled = false;
		const tickRate = this.config.tickRate;

		try {
			for (let tick = 0; tick < totalTicks; tick++) {
				if (tick % YIELD_INTERVAL === 0) {
					await yieldToMain();
					if (signal.aborted) {
						cancelled = true;
						break;
					}
				}
				gameManager.tick(tickRate, true);
				this.simulateClicks();
				this.simulatePhotonRealmClicks();
				this.tickPowerUps();
				const activeNow = this.isInActiveWindow();
				if (activeNow && !this.lastWasActive) {
					this.prestigesThisActiveWindow = 0;
				}
				this.lastWasActive = activeNow;
				if (activeNow) {
					this.executeBotBehavior();
				}
				this.flushSpikeWindowIfNeeded();
				if (tick % achievementCheckInterval === 0) {
					this.checkAchievements();
				}
				if (tick % milestoneCheckInterval === 0) {
					this.checkMilestones();
				}

				if ((tick + 1) % snapshotIntervalTicks === 0) {
					this.takeSnapshot();
				}

				ticksSinceLastUpdate++;
				if (tick % CHUNK_SIZE === 0 && tick > 0) {
					const now = performance.now();
					const elapsed = now - lastProgressUpdate;

					if (elapsed > 0) {
						lastTicksPerSecond = (ticksSinceLastUpdate / elapsed) * 1000;
					}

					const remainingTicks = totalTicks - tick;
					const estimatedTimeLeft = lastTicksPerSecond > 0 ? (remainingTicks / lastTicksPerSecond) * 1000 : 0;

					onProgress?.({
						currentHour: gameManager.inGameTime / (3600 * 1000),
						estimatedTimeLeft,
						milestoneCount: this.milestones.length,
						percent: (tick / totalTicks) * 100,
						recentMilestones: [...this.recentMilestones],
						recentSpikes: [...this.recentSpikes],
						snapshots: this.snapshots,
						ticksPerSecond: lastTicksPerSecond,
						totalHours: this.config.targetHours,
					});

					this.recentMilestones = [];
					this.recentSpikes = [];
					lastProgressUpdate = now;
					ticksSinceLastUpdate = 0;
				}
			}

			if (!cancelled) {
				this.takeSnapshot();
			}
		} finally {
			// Restore main game state after simulation (see savedState at start of runAsync).
			if (this.savedState) {
				const originalState = JSON.parse(this.savedState);
				gameManager.loadSaveData(originalState);
			}
		}

		const durationMs = performance.now() - startRealTime;

		return {
			cancelled,
			config: this.config,
			durationMs,
			milestones: this.milestones,
			snapshots: this.snapshots,
			spikes: this.spikes,
		};
	}

	private flushSpikeWindowIfNeeded() {
		const simTime = gameManager.inGameTime;
		if (simTime - this.spikeWindowStart < SPIKE_WINDOW_MS) return;

		const windowDurationMs = simTime - this.spikeWindowStart;
		const ratePerMin = (this.spikeWindowActions.length / windowDurationMs) * 60_000;

		if (this.spikeRateHistory.length >= SPIKE_MIN_HISTORY && ratePerMin >= SPIKE_MIN_RATE) {
			const recentHistory = this.spikeRateHistory.slice(-SPIKE_MIN_HISTORY);
			const avgRate = recentHistory.reduce((a, b) => a + b, 0) / recentHistory.length;
			if (avgRate > 0 && ratePerMin > avgRate * SPIKE_MULTIPLIER) {
				const spike: SpikeEvent = {
					actions: [...this.spikeWindowActions],
					apsEnd: gameManager.atomsPerSecond,
					apsStart: this.spikeWindowAps,
					avgRatePerMin: avgRate,
					peakRatePerMin: ratePerMin,
					timestamp: this.spikeWindowStart,
				};
				this.spikes.push(spike);
				this.recentSpikes.push(spike);
			}
		}

		this.spikeRateHistory.push(ratePerMin);
		this.spikeWindowActions = [];
		this.spikeWindowAps = gameManager.atomsPerSecond;
		this.spikeWindowStart = simTime;
	}

	private pushAction(action: SimulationAction) {
		this.actions.push(action);
		this.spikeWindowActions.push(action);
	}

	private checkAchievements() {
		const owned = new Set(gameManager.achievements);
		const newlyEarned: string[] = [];

		for (const [id, achievement] of ACHIEVEMENT_ENTRIES) {
			if (owned.has(id)) continue;
			try {
				if (achievement.condition(gameManager)) {
					owned.add(id);
					newlyEarned.push(id);
					this.pushAction({
						details: achievement.name,
						timestamp: gameManager.inGameTime,
						type: 'achievement',
					});
				}
			} catch {
				// Some achievement conditions throw in simulation (e.g. DOM / optional deps).
			}
		}

		if (newlyEarned.length > 0) {
			gameManager.achievements = [...gameManager.achievements, ...newlyEarned];
		}
	}

	private checkMilestones() {
		const snapshot = this.createSnapshotData();

		for (const milestone of MILESTONES) {
			const checkFn = MILESTONE_CHECKS[milestone.id];
			if (checkFn && !this.hitMilestones.has(milestone.id) && checkFn(snapshot)) {
				this.hitMilestones.add(milestone.id);
				const hit: MilestoneHit = {
					dayReached: snapshot.dayNumber,
					milestone,
					timeReached: snapshot.timestamp,
				};
				this.milestones.push(hit);
				this.recentMilestones.push(hit);
			}
		}
	}

	private createSnapshotData(): SimulationSnapshot {
		const buildings: Record<BuildingType, number> = {} as Record<BuildingType, number>;
		const buildingLevelFactors: Partial<Record<BuildingType, number>> = {};
		const buildingUpgradeFactors: Partial<Record<BuildingType, number>> = {};
		let totalBuildings = 0;
		let buildingLevels = 0;

		for (const type of BUILDING_TYPES) {
			const building = gameManager.buildings[type];
			const count = building?.count ?? 0;
			buildings[type] = count;
			totalBuildings += count;
			buildingLevels += building?.level ?? 0;

			if (building && count > 0) {
				const options = { target: type, type: 'building' as const };
				const upgrades = getUpgradesWithEffects(gameManager.allEffectSources, options);
				const effectiveRate = calculateEffects(upgrades, gameManager, building.rate, options);
				buildingUpgradeFactors[type] = effectiveRate / building.rate;

				const oldMultiplier = Math.pow(count / 2, building.level + 1) / 5;
				const linearMultiplier = (building.level + 1) * 100;
				buildingLevelFactors[type] = building.level > 0 ? Math.sqrt(oldMultiplier * linearMultiplier) : 1;
			}
		}

		// Count photon upgrade levels
		const photonUpgradeLevels = Object.values(gameManager.photonUpgrades || {}).reduce((sum, level) => sum + (level || 0), 0);
		const skillPointsUsed = Object.values(gameManager.skillPointBoosts || {}).reduce((sum, points) => sum + (points ?? 0), 0);
		const playerLevel = gameManager.getLevelFromTotalXP(gameManager.totalXP);
		const radiationMultiplier = gameManager.radiationMultiplier;
		const baseGlobalMultiplier = radiationMultiplier > 0 ? gameManager.globalMultiplier / radiationMultiplier : gameManager.globalMultiplier;

		return {
			achievements: gameManager.achievements.length,
			actions: [...this.actions],
			atoms: currenciesManager.getAmount(CurrenciesTypes.ATOMS),
			atomsCurrencyBoost: gameManager.getCurrencyBoostMultiplier(CurrenciesTypes.ATOMS),
			atomsPerClick: gameManager.clickPower,
			atomsPerSecond: gameManager.atomsPerSecond,
			baseGlobalMultiplier,
			bonusMultiplier: gameManager.bonusMultiplier,
			buildingLevelFactors,
			buildingLevels,
			buildingProductions: { ...gameManager.buildingProductions },
			buildingUpgradeFactors,
			buildings,
			buildingsEverPurchased: [...this.everPurchasedBuildings],
			buildingsPurchased: gameManager.totalBuildingsPurchasedAllTime,
			clicks: gameManager.totalClicksAllTime,
			dayNumber: gameManager.inGameTime / (24 * 3600 * 1000),
			electrons: currenciesManager.getAmount(CurrenciesTypes.ELECTRONS),
			electronizes: gameManager.totalElectronizesAllTime,
			globalMultiplier: gameManager.globalMultiplier,
			photons: currenciesManager.getAmount(CurrenciesTypes.PHOTONS),
			photonUpgradeLevels,
			playerLevel,
			protons: currenciesManager.getAmount(CurrenciesTypes.PROTONS),
			protonises: gameManager.totalProtonisesAllTime,
			radiationMultiplier,
			skillPointsUsed,
			skills: gameManager.skillUpgrades.length,
			stabilityMultiplier: gameManager.stabilityMultiplier,
			timestamp: gameManager.inGameTime,
			totalBuildings,
			totalUpgrades: gameManager.totalUpgradesPurchasedAllTime,
			totalXP: gameManager.totalXP,
			upgrades: gameManager.upgrades.length,
		};
	}

	private executeBotBehavior() {
		const { botBehavior, prestigeStrategy } = this.config;
		const maxActionsPerTick = botBehavior.maxActionsPerTick;
		const maxPrestigesPerActiveWindow = botBehavior.maxPrestigesPerActiveWindow;
		let actionsThisTick = 0;

		const canDoAction = (): boolean => maxActionsPerTick == null || actionsThisTick < maxActionsPerTick;
		const canPrestige = (): boolean =>
			maxPrestigesPerActiveWindow == null || this.prestigesThisActiveWindow < maxPrestigesPerActiveWindow;

		if (canDoAction() && canPrestige() && prestigeStrategy.autoProtonise && gameManager.protoniseProtonsGain >= prestigeStrategy.protoniseThreshold) {
			if (gameManager.protonise()) {
				this.pushAction({
					details: `+${gameManager.protoniseProtonsGain} protons`,
					timestamp: gameManager.inGameTime,
					type: 'protonise',
				});
				this.prestigesThisActiveWindow++;
				actionsThisTick++;
			}
		}

		if (canDoAction() && canPrestige() && prestigeStrategy.autoElectronize && gameManager.electronizeElectronsGain >= prestigeStrategy.electronizeThreshold) {
			if (gameManager.electronize()) {
				this.pushAction({
					details: `+${gameManager.electronizeElectronsGain} electrons`,
					timestamp: gameManager.inGameTime,
					type: 'electronize',
				});
				this.prestigesThisActiveWindow++;
				actionsThisTick++;
			}
		}

		if (!botBehavior.autoBuy) return;

		const ownedUpgrades = new Set(gameManager.upgrades);
		const ownedSkills = new Set(gameManager.skillUpgrades);

		if (canDoAction() && botBehavior.autoBuyBuildings) {
			const building = this.selectBuilding();
			if (building) {
				const maxAffordable = gameManager.getMaxAffordableBuilding(building);
				if (maxAffordable > 0) {
					const isFirstPurchase = !this.everPurchasedBuildings.has(building);
					const apsBeforeBuy = gameManager.atomsPerSecond;
					gameManager.purchaseBuilding(building, maxAffordable);
					this.everPurchasedBuildings.add(building);
					this.pushAction({
						apsDelta: gameManager.atomsPerSecond - apsBeforeBuy,
						details: `${building} x${maxAffordable}`,
						isFirstPurchase,
						timestamp: gameManager.inGameTime,
						type: 'building',
					});
					actionsThisTick++;
				}
			}
		}
		if (canDoAction() && botBehavior.autoBuyUpgrades) {
			const affordableUpgrade = this.getAffordableUpgrade(ownedUpgrades);
			if (affordableUpgrade) {
				gameManager.purchaseUpgrade(affordableUpgrade);
				this.pushAction({
					details: affordableUpgrade,
					timestamp: gameManager.inGameTime,
					type: 'upgrade',
				});
				actionsThisTick++;
			}
		}
		if (canDoAction() && botBehavior.autoBuySkills) {
			const affordableSkill = this.getAffordableSkill(ownedSkills);
			if (affordableSkill) {
				gameManager.purchaseSkill(affordableSkill);
				this.pushAction({
					details: affordableSkill,
					timestamp: gameManager.inGameTime,
					type: 'skill',
				});
				actionsThisTick++;
			}
		}
		if (canDoAction() && botBehavior.autoBuyPhotonUpgrades) {
			const photons = currenciesManager.getAmount(CurrenciesTypes.PHOTONS);
			const excitedPhotons = currenciesManager.getAmount(CurrenciesTypes.EXCITED_PHOTONS);
			const affordablePhotonUpgrade = this.getAffordablePhotonUpgrade(photons, excitedPhotons);
			if (affordablePhotonUpgrade) {
				gameManager.purchasePhotonUpgrade(affordablePhotonUpgrade);
				this.pushAction({
					details: affordablePhotonUpgrade,
					timestamp: gameManager.inGameTime,
					type: 'photon_upgrade',
				});
				actionsThisTick++;
			}
		}
		let availableSkillPoints = gameManager.skillPointsAvailable;
		if (canDoAction() && availableSkillPoints > 0) {
			const boostPriority: CurrencyName[] = [
				CurrenciesTypes.ATOMS,
				CurrenciesTypes.PROTONS,
				CurrenciesTypes.ELECTRONS,
				CurrenciesTypes.PHOTONS,
			];

			for (const currency of boostPriority) {
				if (availableSkillPoints <= 0 || !canDoAction()) break;
				if (gameManager.addCurrencyBoost(currency)) {
					availableSkillPoints--;
					actionsThisTick++;
				}
			}
		}

		if (radiationManager.unlocked) {
			// Passive: fuel the core - keep enough electrons for the next electronize, spend surplus on mass.
			const electrons = currenciesManager.getAmount(CurrenciesTypes.ELECTRONS);
			const electronizeReserve = gameManager.electronizeElectronsGain > 0
				? gameManager.electronizeElectronsGain * 3
				: 50;
			const surplus = electrons - electronizeReserve;
			if (surplus > 0 && (radiationManager.mass === 0 || radiationManager.timeToEmpty < 3_600_000)) {
				radiationManager.bombardCore(Math.min(Math.floor(surplus * 0.3), 20));
			}
			// Set control rods once the core has fuel.
			if (radiationManager.mass > 0 && radiationManager.controlRodLevel === 0) {
				radiationManager.setControlRodLevel(0.5);
			}
			// Buy cheapest radiation upgrade (costs electrons, counts as an action).
			if (canDoAction()) {
				const upgradeId = this.getAffordableRadiationUpgrade();
				if (upgradeId && radiationManager.purchaseUpgrade(upgradeId)) {
					actionsThisTick++;
				}
			}
		}
	}

	private getAffordablePhotonUpgrade(photons: number, excitedPhotons: number): string | null {
		let bestId: string | null = null;
		let bestCost = Infinity;

		for (const [id, upgrade] of PHOTON_UPGRADE_ENTRIES) {
			const currentLevel = gameManager.photonUpgrades[id] ?? 0;
			if (currentLevel >= upgrade.maxLevel) continue;
			const cost = getPhotonUpgradeCost(upgrade, currentLevel);
			if (cost >= bestCost) continue;
			const available = upgrade.currency === CurrenciesTypes.EXCITED_PHOTONS ? excitedPhotons : photons;
			if (available < cost) continue;
			if (upgrade.condition && !upgrade.condition(gameManager)) continue;
			bestCost = cost;
			bestId = id;
		}

		return bestId;
	}

	private getAffordableRadiationUpgrade(): string | null {
		let bestId: string | null = null;
		let bestCost = Infinity;
		const electrons = currenciesManager.getAmount(CurrenciesTypes.ELECTRONS);

		for (const [id, upgrade] of Object.entries(RADIATION_UPGRADES)) {
			const currentLevel = radiationManager.upgradeLevels[id] ?? 0;
			if (currentLevel >= upgrade.maxLevel) continue;
			const price = getRadiationUpgradePrice(upgrade, currentLevel);
			if (price.amount >= bestCost) continue;
			if (electrons < price.amount) continue;
			bestCost = price.amount;
			bestId = id;
		}

		return bestId;
	}

	private getAffordableSkill(ownedSkills: Set<string>): string | null {
		let bestId: string | null = null;
		let bestCost = Infinity;

		for (const [id, skill] of SKILL_ENTRIES) {
			if (ownedSkills.has(id)) continue;
			const cost = skill.cost.amount;
			if (cost >= bestCost) continue;
			if (currenciesManager.getAmount(skill.cost.currency) < cost) continue;
			if (skill.requires && !skill.requires.every(req => ownedSkills.has(req))) continue;
			if (skill.condition && !skill.condition(gameManager)) continue;
			bestCost = cost;
			bestId = id;
		}

		return bestId;
	}

	private getAffordableUpgrade(ownedUpgrades: Set<string>): string | null {
		let bestId: string | null = null;
		let bestCost = Infinity;

		for (const [id, upgrade] of UPGRADE_ENTRIES) {
			if (ownedUpgrades.has(id)) continue;
			const cost = upgrade.cost.amount;
			if (cost >= bestCost) continue;
			if (currenciesManager.getAmount(upgrade.cost.currency) < cost) continue;
			if (upgrade.condition && !upgrade.condition(gameManager)) continue;
			bestCost = cost;
			bestId = id;
		}

		return bestId;
	}

	private selectBuilding(): BuildingType | null {
		const { buyStrategy } = this.config.botBehavior;
		const atoms = currenciesManager.getAmount(CurrenciesTypes.ATOMS);

		const affordableBuildings = BUILDING_TYPES.filter(type => {
			const cost = gameManager.getBuildingCost(type, 1);
			return atoms >= cost;
		});

		if (affordableBuildings.length === 0) return null;

		switch (buyStrategy) {
			case 'cheapest': {
				return affordableBuildings.reduce((cheapest, type) => {
					const cheapestCost = gameManager.getBuildingCost(cheapest, 1);
					const typeCost = gameManager.getBuildingCost(type, 1);
					return typeCost < cheapestCost ? type : cheapest;
				});
			}
			case 'mostEfficient': {
				return affordableBuildings.reduce((best, type) => {
					const bestRate = BUILDINGS[best].rate / gameManager.getBuildingCost(best, 1);
					const typeRate = BUILDINGS[type].rate / gameManager.getBuildingCost(type, 1);
					return typeRate > bestRate ? type : best;
				});
			}
			case 'balanced':
			default: {
				const unowned = BUILDING_TYPES.filter(type => !gameManager.buildings[type] || gameManager.buildings[type]!.count === 0);
				const affordableUnowned = unowned.filter(type => atoms >= gameManager.getBuildingCost(type, 1));

				if (affordableUnowned.length > 0) {
					return affordableUnowned.reduce((cheapest, type) => {
						const cheapestCost = gameManager.getBuildingCost(cheapest, 1);
						const typeCost = gameManager.getBuildingCost(type, 1);
						return typeCost < cheapestCost ? type : cheapest;
					});
				}

				return affordableBuildings.reduce((best, type) => {
					const bestRate = BUILDINGS[best].rate / gameManager.getBuildingCost(best, 1);
					const typeRate = BUILDINGS[type].rate / gameManager.getBuildingCost(type, 1);
					return typeRate > bestRate ? type : best;
				});
			}
		}
	}

	private isInActiveWindow(): boolean {
		const { activityPattern } = this.config.botBehavior;
		if (!activityPattern) return true;
		const cycleMs = (activityPattern.activeMinutes + activityPattern.inactiveMinutes) * 60 * 1000;
		const activeMs = activityPattern.activeMinutes * 60 * 1000;
		const positionInCycle = gameManager.inGameTime % cycleMs;
		return positionInCycle < activeMs;
	}

	private simulateClicks() {
		const { clicksPerSecond } = this.config.botBehavior;
		if (!this.isInActiveWindow()) return;
		if (clicksPerSecond <= 0) return;
		// When another realm is active the player is clicking there, not the atom button.
		// Atom auto-click (via upgrades) still fires through gameManager.tick().
		if (gameManager.realms[RealmTypes.PHOTONS]?.unlocked) return;

		const clicksThisTick = clicksPerSecond * (this.config.tickRate / 1000);
		const clickPower = gameManager.clickPower;

		gameManager.addAtoms(clickPower * clicksThisTick);
		gameManager.totalClicksAllTime += Math.floor(clicksThisTick);
		gameManager.totalClicksRun += Math.floor(clicksThisTick);
	}

	/** Headless equivalent of clicking realm circles. Mirrors offlineProgress.ts photon math + adds auto-click. */
	private simulatePhotonRealmClicks() {
		if (!gameManager.realms[RealmTypes.PHOTONS]?.unlocked) return;

		const deltaSeconds = this.config.tickRate / 1000;
		const manualClicks = this.isInActiveWindow() ? this.config.botBehavior.clicksPerSecond * deltaSeconds : 0;
		const autoClicks = gameManager.photonAutoClicksPer5Seconds > 0 ? (gameManager.photonAutoClicksPer5Seconds / 5) * deltaSeconds : 0;
		const totalClicks = manualClicks + autoClicks;
		if (totalClicks <= 0) return;

		const photonValueBonus = this.getPhotonValueBonus();
		const doubleChance = this.getEffect('photon_double_chance');
		const excitedDoubleChance = this.getEffect('excited_photon_double');
		const excitedFromMaxBonus = this.getEffect('excited_photon_from_max');
		// Photon realm caps excited chance behind 'excited_auto_click' upgrade for auto-clicks only.
		const autoAllowsExcited = (gameManager.photonUpgrades['excited_auto_click'] || 0) > 0;
		const excitedChanceManual = gameManager.excitedPhotonChance;
		const excitedChanceAuto = autoAllowsExcited ? excitedChanceManual : 0;

		const basePhotonAvg = (1 + 10) / 2;
		const normalPhotonsPerClick = (basePhotonAvg + photonValueBonus) * (1 + doubleChance);
		const excitedPhotonsPerClick = (1 + excitedDoubleChance) + (10 + photonValueBonus) * excitedFromMaxBonus;

		const photonsMultiplier = gameManager.getCurrencyBoostMultiplier(CurrenciesTypes.PHOTONS);
		const excitedMultiplier = gameManager.getCurrencyBoostMultiplier(CurrenciesTypes.EXCITED_PHOTONS);

		const normalClicks = manualClicks * (1 - excitedChanceManual) + autoClicks * (1 - excitedChanceAuto);
		const excitedClicks = manualClicks * excitedChanceManual + autoClicks * excitedChanceAuto;

		const photonsGain = normalClicks * normalPhotonsPerClick * photonsMultiplier;
		const excitedGain = excitedClicks * excitedPhotonsPerClick * excitedMultiplier;

		if (photonsGain > 0) currenciesManager.add(CurrenciesTypes.PHOTONS, photonsGain);
		if (excitedGain > 0) currenciesManager.add(CurrenciesTypes.EXCITED_PHOTONS, excitedGain);
	}

	private getEffect(type: 'excited_photon_double' | 'excited_photon_from_max' | 'photon_double_chance'): number {
		const options = { type } as const;
		const upgrades = getUpgradesWithEffects(gameManager.allEffectSources, options);
		return calculateEffects(upgrades, gameManager, 0, options);
	}

	private getPhotonValueBonus(): number {
		const upgrade = gameManager.allEffectSources.find(source => source.id === 'photon_value');
		if (!upgrade) return 0;
		return calculateEffects([upgrade], gameManager, 0, { type: 'click' });
	}

	private rollPowerUpInterval(): number {
		const [min, max] = gameManager.powerUpInterval;
		return gameManager.inGameTime + min + Math.random() * (max - min);
	}

	/** Spawn power-ups at gameManager.powerUpInterval; if active window, "click" them (apply boost + Higgs Boson). */
	private tickPowerUps() {
		if (gameManager.inGameTime < this.nextPowerUpTime) return;

		this.nextPowerUpTime = this.rollPowerUpInterval();
		if (!this.isInActiveWindow()) return;

		const base = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
		const multiplier = base.multiplier * gameManager.powerUpEffectMultiplier;
		const duration = base.duration * gameManager.powerUpDurationMultiplier;

		gameManager.addPowerUp({
			description: `Multiplies atoms by ${multiplier} for ${duration / 1000}s`,
			duration,
			id: `sim_${this.powerUpCounter++}`,
			multiplier,
			name: base.name,
			startTime: gameManager.inGameTime,
		});
		gameManager.incrementBonusHiggsBosonClicks();

		this.pushAction({
			details: `×${multiplier.toFixed(1)} / ${(duration / 1000).toFixed(0)}s`,
			timestamp: gameManager.inGameTime,
			type: 'power_up',
		});
	}

	private takeSnapshot() {
		this.snapshots.push(this.createSnapshotData());
		this.actions = [];
	}
}
