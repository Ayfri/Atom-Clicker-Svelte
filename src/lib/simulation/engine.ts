/** Headless simulation engine (chunked with scheduler.yield). */
import { ACHIEVEMENTS } from '$data/achievements';
import { BUILDINGS, BUILDING_TYPES, type BuildingType } from '$data/buildings';
import { CurrenciesTypes, type CurrencyName } from '$data/currencies';
import { ALL_PHOTON_UPGRADES, getPhotonUpgradeCost } from '$data/photonUpgrades';
import { RealmTypes } from '$data/realms';
import { SKILL_UPGRADES } from '$data/skillTree';
import { UPGRADES } from '$data/upgrades';
import { currenciesManager } from '$helpers/CurrenciesManager.svelte';
import { gameManager } from '$helpers/GameManager.svelte';
import {
	MILESTONES,
	MILESTONE_CHECKS,
	type BenchmarkConfig,
	type MilestoneHit,
	type SimulationAction,
	type SimulationResult,
	type SimulationSnapshot,
} from './types';

const ACHIEVEMENT_CHECK_INTERVAL = 100;
const CHUNK_SIZE = 500;
const MILESTONE_CHECK_INTERVAL = 50;
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

export class SimulationEngine {
	private abortController: AbortController | null = null;
	private actions: SimulationAction[] = [];
	private config: BenchmarkConfig;
	private hitMilestones = new Set<string>();
	private lastWasActive = false;
	private milestones: MilestoneHit[] = [];
	private prestigesThisActiveWindow = 0;
	private recentMilestones: MilestoneHit[] = [];
	private savedState: string | null = null;
	private snapshots: SimulationSnapshot[] = [];

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
		this.actions = [];
		this.hitMilestones.clear();
		this.lastWasActive = false;
		this.milestones = [];
		this.prestigesThisActiveWindow = 0;
		this.recentMilestones = [];
		this.snapshots = [];

		const totalGameTimeMs = this.config.targetHours * 3600 * 1000;
		const totalTicks = Math.floor(totalGameTimeMs / this.config.tickRate);
		const snapshotIntervalTicks = Math.floor((this.config.snapshotInterval * 1000) / this.config.tickRate);
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
				if (this.isInActiveWindow()) {
					this.executeBotBehavior();
				}
				if (tick % ACHIEVEMENT_CHECK_INTERVAL === 0) {
					this.checkAchievements();
				}
				if (tick % MILESTONE_CHECK_INTERVAL === 0) {
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
						snapshots: this.snapshots,
						ticksPerSecond: lastTicksPerSecond,
						totalHours: this.config.targetHours,
					});

					this.recentMilestones = [];
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
		};
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
					this.actions.push({
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
		let totalBuildings = 0;
		let buildingLevels = 0;

		for (const type of BUILDING_TYPES) {
			const building = gameManager.buildings[type];
			const count = building?.count ?? 0;
			buildings[type] = count;
			totalBuildings += count;
			buildingLevels += building?.level ?? 0;
		}

		// Count photon upgrade levels
		const photonUpgradeLevels = Object.values(gameManager.photonUpgrades || {}).reduce((sum, level) => sum + (level || 0), 0);
		const skillPointsUsed = Object.values(gameManager.skillPointBoosts || {}).reduce((sum, points) => sum + (points ?? 0), 0);
		const playerLevel = gameManager.getLevelFromTotalXP(gameManager.totalXP);

		return {
			achievements: gameManager.achievements.length,
			actions: [...this.actions],
			atoms: currenciesManager.getAmount(CurrenciesTypes.ATOMS),
			atomsPerSecond: gameManager.atomsPerSecond,
			buildingLevels,
			buildings,
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
			skillPointsUsed,
			skills: gameManager.skillUpgrades.length,
			timestamp: gameManager.inGameTime,
			totalBuildings,
			totalUpgrades: gameManager.totalUpgradesPurchasedAllTime,
			totalXP: gameManager.totalXP,
			upgrades: gameManager.upgrades.length,
		};
	}

	private executeBotBehavior() {
		const inActive = this.isInActiveWindow();
		if (inActive && !this.lastWasActive) {
			this.prestigesThisActiveWindow = 0;
		}
		this.lastWasActive = inActive;

		const { botBehavior, prestigeStrategy } = this.config;
		const maxActionsPerTick = botBehavior.maxActionsPerTick;
		const maxPrestigesPerActiveWindow = botBehavior.maxPrestigesPerActiveWindow;
		let actionsThisTick = 0;

		const canDoAction = (): boolean => maxActionsPerTick == null || actionsThisTick < maxActionsPerTick;
		const canPrestige = (): boolean =>
			maxPrestigesPerActiveWindow == null || this.prestigesThisActiveWindow < maxPrestigesPerActiveWindow;

		if (canDoAction() && canPrestige() && prestigeStrategy.autoProtonise && gameManager.protoniseProtonsGain >= prestigeStrategy.protoniseThreshold) {
			if (gameManager.protonise()) {
				this.actions.push({
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
				this.actions.push({
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
					gameManager.purchaseBuilding(building, 1);
					this.actions.push({
						details: building,
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
				this.actions.push({
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
				this.actions.push({
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
				this.actions.push({
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

		const clicksThisTick = clicksPerSecond * (this.config.tickRate / 1000);
		const clickPower = gameManager.clickPower;

		gameManager.addAtoms(clickPower * clicksThisTick);
		gameManager.totalClicksAllTime += Math.floor(clicksThisTick);
		gameManager.totalClicksRun += Math.floor(clicksThisTick);
	}

	/** Simulate photon gains when Photon (Purple) Realm is unlocked (headless equivalent of clicking realm circles). */
	private simulatePhotonRealmClicks() {
		if (!gameManager.realms[RealmTypes.PHOTONS]?.unlocked) return;
		if (!this.isInActiveWindow()) return;

		const { clicksPerSecond } = this.config.botBehavior;
		if (clicksPerSecond <= 0) return;

		const clicksThisTick = clicksPerSecond * (this.config.tickRate / 1000);
		const avgPhotonPerClick = (1 + 10) / 2;
		const multiplier = gameManager.getCurrencyBoostMultiplier(CurrenciesTypes.PHOTONS);
		const photonsThisTick = clicksThisTick * avgPhotonPerClick * multiplier;
		if (photonsThisTick > 0) {
			currenciesManager.add(CurrenciesTypes.PHOTONS, photonsThisTick);
		}
	}

	private takeSnapshot() {
		this.snapshots.push(this.createSnapshotData());
		this.actions = [];
	}
}
