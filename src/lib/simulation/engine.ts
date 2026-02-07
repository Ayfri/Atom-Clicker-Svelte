/**
 * @file Headless simulation engine for game benchmarking.
 * Runs in chunks to avoid blocking the main thread using scheduler.yield().
 */

import { ACHIEVEMENTS } from '$data/achievements';
import { BUILDINGS, BUILDING_TYPES, type BuildingType } from '$data/buildings';
import { CurrenciesTypes, type CurrencyName } from '$data/currencies';
import { ALL_PHOTON_UPGRADES, getPhotonUpgradeCost } from '$data/photonUpgrades';
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

/**
 * Ticks per processing chunk before yielding to the main thread.
 * Larger values = faster simulation but less responsive UI updates.
 */
const CHUNK_SIZE = 500;

/**
 * How often to check achievements (every N ticks) for performance.
 */
const ACHIEVEMENT_CHECK_INTERVAL = 100;

/**
 * How often to check milestones (every N ticks).
 */
const MILESTONE_CHECK_INTERVAL = 50;

/**
 * Current progress state of a running simulation.
 */
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

/**
 * Callback function for simulation progress updates.
 */
export type ProgressCallback = (progress: SimulationProgress) => void;

/**
 * Yields control back to the main thread using scheduler.yield() or fallback.
 */
async function yieldToMain(): Promise<void> {
	if ('scheduler' in globalThis && typeof (globalThis as any).scheduler?.yield === 'function') {
		return (globalThis as any).scheduler.yield();
	}
	return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Engine responsible for running the headless simulation.
 */
export class SimulationEngine {
	private abortController: AbortController | null = null;
	private actions: SimulationAction[] = [];
	private config: BenchmarkConfig;
	private hitMilestones = new Set<string>();
	private milestones: MilestoneHit[] = [];
	private recentMilestones: MilestoneHit[] = [];
	private savedState: string | null = null;
	private snapshots: SimulationSnapshot[] = [];

	constructor(config: BenchmarkConfig) {
		this.config = config;
	}

	/**
	 * Cancels the currently running simulation.
	 */
	cancel() {
		this.abortController?.abort();
	}

	/**
	 * Runs the simulation asynchronously with progress updates.
	 */
	async runAsync(onProgress?: ProgressCallback): Promise<SimulationResult> {
		this.abortController = new AbortController();
		const { signal } = this.abortController;

		const startRealTime = performance.now();

		// Save current game state before starting simulation
		this.savedState = JSON.stringify(gameManager.getCurrentState());

		// Initialize simulation state
		gameManager.resetAll();
		currenciesManager.hardReset();
		this.actions = [];
		this.hitMilestones.clear();
		this.milestones = [];
		this.recentMilestones = [];
		this.snapshots = [];

		const totalGameTimeMs = this.config.targetHours * 3600 * 1000;
		const totalTicks = Math.floor(totalGameTimeMs / this.config.tickRate);
		const snapshotIntervalTicks = Math.floor((this.config.snapshotInterval * 1000) / this.config.tickRate);

		// Initial state capture
		this.takeSnapshot();

		let lastProgressUpdate = startRealTime;
		let ticksSinceLastUpdate = 0;
		let lastTicksPerSecond = 0;
		let cancelled = false;

		// Batch processing to reduce overhead
		const tickRate = this.config.tickRate;

		try {
			for (let tick = 0; tick < totalTicks; tick++) {
				if (signal.aborted) {
					cancelled = true;
					break;
				}

				// Game logic step - skip achievements for performance, we do it manually
				gameManager.tick(tickRate, true);

				// Simulated inputs
				this.simulateClicks();
				this.executeBotBehavior();

				// Check achievements periodically
				if (tick % ACHIEVEMENT_CHECK_INTERVAL === 0) {
					this.checkAchievements();
				}

				// Goal tracking
				if (tick % MILESTONE_CHECK_INTERVAL === 0) {
					this.checkMilestones();
				}

				if ((tick + 1) % snapshotIntervalTicks === 0) {
					this.takeSnapshot();
				}

				ticksSinceLastUpdate++;

				// Periodic UI yielding - yield more frequently
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
						snapshots: this.snapshots, // Pass reference directly as we only append
						ticksPerSecond: lastTicksPerSecond,
						totalHours: this.config.targetHours,
					});

					this.recentMilestones = [];
					lastProgressUpdate = now;
					ticksSinceLastUpdate = 0;

					await yieldToMain();
				}
			}

			if (!cancelled) {
				this.takeSnapshot();
			}
		} finally {
			// Restore original game state
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

	/**
	 * Checks and unlocks achievements based on current game state.
	 */
	private checkAchievements() {
		for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
			if (!gameManager.achievements.includes(id)) {
				try {
					if (achievement.condition(gameManager)) {
						gameManager.achievements = [...gameManager.achievements, id];
						this.actions.push({
							details: achievement.name,
							timestamp: gameManager.inGameTime,
							type: 'achievement',
						});
					}
				} catch {
					// Some achievements may have conditions that fail in simulation context
				}
			}
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

		// Count skill points used
		const skillPointsUsed = Object.values(gameManager.skillPointBoosts || {}).reduce((sum, points) => sum + (points ?? 0), 0);

		// Player level
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
		const { botBehavior, prestigeStrategy } = this.config;

		// Handle Prestige
		if (prestigeStrategy.autoProtonise && gameManager.protoniseProtonsGain >= prestigeStrategy.protoniseThreshold) {
			if (gameManager.protonise()) {
				this.actions.push({
					details: `+${gameManager.protoniseProtonsGain} protons`,
					timestamp: gameManager.inGameTime,
					type: 'protonise',
				});
			}
		}

		if (prestigeStrategy.autoElectronize && gameManager.electronizeElectronsGain >= prestigeStrategy.electronizeThreshold) {
			if (gameManager.electronize()) {
				this.actions.push({
					details: `+${gameManager.electronizeElectronsGain} electrons`,
					timestamp: gameManager.inGameTime,
					type: 'electronize',
				});
			}
		}

		if (!botBehavior.autoBuy) return;

		// Handle Buildings
		if (botBehavior.autoBuyBuildings) {
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
				}
			}
		}

		// Handle Upgrades
		if (botBehavior.autoBuyUpgrades) {
			const affordableUpgrade = this.getAffordableUpgrade();
			if (affordableUpgrade) {
				gameManager.purchaseUpgrade(affordableUpgrade);
				this.actions.push({
					details: affordableUpgrade,
					timestamp: gameManager.inGameTime,
					type: 'upgrade',
				});
			}
		}

		// Handle Skills
		if (botBehavior.autoBuySkills) {
			const affordableSkill = this.getAffordableSkill();
			if (affordableSkill) {
				gameManager.purchaseSkill(affordableSkill);
				this.actions.push({
					details: affordableSkill,
					timestamp: gameManager.inGameTime,
					type: 'skill',
				});
			}
		}

		// Handle Photon Upgrades
		if (botBehavior.autoBuyPhotonUpgrades) {
			const affordablePhotonUpgrade = this.getAffordablePhotonUpgrade();
			if (affordablePhotonUpgrade) {
				gameManager.purchasePhotonUpgrade(affordablePhotonUpgrade);
				this.actions.push({
					details: affordablePhotonUpgrade,
					timestamp: gameManager.inGameTime,
					type: 'photon_upgrade',
				});
			}
		}

		// Handle Currency Boosts (Skill Points allocation)
		if (gameManager.skillPointsAvailable > 0) {
			// Prioritize Atoms boost, then distribute to other currencies
			const boostPriority: CurrencyName[] = [
				CurrenciesTypes.ATOMS,
				CurrenciesTypes.PROTONS,
				CurrenciesTypes.ELECTRONS,
				CurrenciesTypes.PHOTONS,
			];

			for (const currency of boostPriority) {
				if (gameManager.skillPointsAvailable > 0) {
					gameManager.addCurrencyBoost(currency);
				}
			}
		}
	}

	private getAffordablePhotonUpgrade(): string | null {
		const photons = currenciesManager.getAmount(CurrenciesTypes.PHOTONS);
		const excitedPhotons = currenciesManager.getAmount(CurrenciesTypes.EXCITED_PHOTONS);

		const upgrades = Object.entries(ALL_PHOTON_UPGRADES)
			.filter(([id, upgrade]) => {
				const currentLevel = gameManager.photonUpgrades[id] ?? 0;
				if (currentLevel >= upgrade.maxLevel) return false;
				if (upgrade.condition && !upgrade.condition(gameManager)) return false;

				const cost = getPhotonUpgradeCost(upgrade, currentLevel);
				const currency = upgrade.currency || CurrenciesTypes.PHOTONS;

				if (currency === CurrenciesTypes.EXCITED_PHOTONS) {
					return excitedPhotons >= cost;
				}
				return photons >= cost;
			})
			.sort((a, b) => {
				const costA = getPhotonUpgradeCost(a[1], gameManager.photonUpgrades[a[0]] ?? 0);
				const costB = getPhotonUpgradeCost(b[1], gameManager.photonUpgrades[b[0]] ?? 0);
				return costA - costB;
			});

		return upgrades[0]?.[0] ?? null;
	}

	private getAffordableSkill(): string | null {
		const skills = Object.entries(SKILL_UPGRADES)
			.filter(([id, skill]) => {
				// Already purchased
				if (gameManager.skillUpgrades.includes(id)) return false;

				// Check requirements
				if (skill.requires) {
					const hasAllRequirements = skill.requires.every(req => gameManager.skillUpgrades.includes(req));
					if (!hasAllRequirements) return false;
				}

				// Check condition if exists
				if (skill.condition && !skill.condition(gameManager)) return false;

				// Check affordability
				return gameManager.canAfford(skill.cost);
			})
			.sort((a, b) => a[1].cost.amount - b[1].cost.amount);

		return skills[0]?.[0] ?? null;
	}

	private getAffordableUpgrade(): string | null {
		const upgrades = Object.entries(UPGRADES)
			.filter(([id, upgrade]) => {
				if (gameManager.upgrades.includes(id)) return false;
				if (upgrade.condition && !upgrade.condition(gameManager)) return false;
				return gameManager.canAfford(upgrade.cost);
			})
			.sort((a, b) => a[1].cost.amount - b[1].cost.amount);

		return upgrades[0]?.[0] ?? null;
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

	private simulateClicks() {
		const { clicksPerSecond } = this.config.botBehavior;
		if (clicksPerSecond <= 0) return;

		const clicksThisTick = clicksPerSecond * (this.config.tickRate / 1000);
		const clickPower = gameManager.clickPower;

		gameManager.addAtoms(clickPower * clicksThisTick);
		gameManager.totalClicksAllTime += Math.floor(clicksThisTick);
		gameManager.totalClicksRun += Math.floor(clicksThisTick);
	}

	private takeSnapshot() {
		this.snapshots.push(this.createSnapshotData());
		this.actions = [];
	}
}
