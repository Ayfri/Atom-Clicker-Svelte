import { CurrenciesTypes } from '$data/currencies';
import { RADIATION_UPGRADES, getRadiationUpgradePrice } from '$data/radiationUpgrades';
import { currenciesManager } from '$helpers/CurrenciesManager.svelte';
import type { RadiationState } from '$lib/types';

// SIMPLIFIED MECHANICS:
// - Add mass to the reactor core (fuel)
// - Control rods determine BOTH output AND consumption
// - Low control = stable but low output
// - High control = high output but burns fuel fast
// - Goal: balance between sustainability and output

// Base decay rate: % of mass lost per second at 100% control
const BASE_DECAY_PERCENT = 0.02; // 2% per second at max
// Mass per electron spent
const MASS_PER_ELECTRON = 0.1;

class RadiationManager {
	// State
	controlRodLevel = $state(0); // Start at 0 (safe)
	lastTick = $state(Date.now());
	mass = $state(0);
	unlocked = $state(false);

	// Upgrade levels (synced from GameManager)
	upgradeLevels = $state<Record<string, number>>({});

	// === DERIVED VALUES ===

	// Decay rate per second (% of mass)
	decayRatePercent = $derived.by(() => {
		// Exponential curve: low values have minimal decay
		// At 0%: ~0% decay, at 50%: ~0.5% decay, at 100%: 2% decay
		const controlEffect = Math.pow(this.controlRodLevel, 2);
		const baseRate = BASE_DECAY_PERCENT * controlEffect;

		// Graphite Moderators reduce decay rate
		const moderatorBonus = 1 - this.getUpgradeEffect('graphite_moderators') * 0.1;
		return baseRate * Math.max(0.2, moderatorBonus);
	});

	// Mass lost per second
	decayRate = $derived.by(() => {
		return this.mass * this.decayRatePercent;
	});

	// Mass regeneration per second (from Breeder Reactor)
	regenRate = $derived.by(() => {
		const level = this.upgradeLevels['breeder_reactor'] || 0;
		return level * 0.2; // 0.2 mass/sec per level
	});

	// Net mass change per second
	netMassChange = $derived.by(() => {
		return this.regenRate - this.decayRate;
	});

	// Maximum CPM (from Coolant Pumps)
	maxCpm = $derived.by(() => {
		const baseCpm = 1000;
		const level = this.upgradeLevels['coolant_pumps'] || 0;
		return baseCpm * (1 + level * 0.5);
	});

	// Enrichment bonus (from Isotopic Enrichment)
	enrichmentBonus = $derived.by(() => {
		const level = this.upgradeLevels['isotopic_enrichment'] || 0;
		return 1 + level * 0.25; // +25% per level
	});

	// Mass preservation chance (from Magnetic Confinement)
	preservationChance = $derived.by(() => {
		const level = this.upgradeLevels['magnetic_confinement'] || 0;
		return Math.min(0.5, level * 0.1); // 10% per level, cap at 50%
	});

	// Critical chance (from Cherenkov Glow)
	criticalChance = $derived.by(() => {
		const level = this.upgradeLevels['cherenkov_glow'] || 0;
		return level * 0.05; // 5% per level
	});

	// === MAIN OUTPUT CALCULATIONS ===

	// CPM = Mass × ControlLevel × 10 × Enrichment
	// Simple: more mass + higher control = more CPM
	currentCpm = $derived.by(() => {
		if (this.mass <= 0 || this.controlRodLevel <= 0) return 0;
		const rawCpm = this.mass * this.controlRodLevel * 10 * this.enrichmentBonus;
		return Math.min(rawCpm, this.maxCpm);
	});

	// Radiation Multiplier = 1 + (CPM / 50)
	// 100 CPM = x3, 500 CPM = x11, 1000 CPM = x21
	radiationMultiplier = $derived.by(() => {
		if (!this.unlocked || this.currentCpm <= 0) return 1;
		const critBonus = this.criticalChance > 0 ? 1 + this.criticalChance : 1;
		return 1 + (this.currentCpm / 50) * critBonus;
	});

	// Visual instability (0 to 1)
	instability = $derived.by(() => {
		if (this.mass <= 0) return 0;
		return Math.min(1, this.controlRodLevel * (this.mass / 100));
	});

	// Efficiency: how sustainable is the current setup?
	// >1 = gaining mass, <1 = losing mass
	efficiency = $derived.by(() => {
		if (this.decayRate <= 0) return Infinity;
		return this.regenRate / this.decayRate;
	});

	// Time until mass runs out at current rate
	timeToEmpty = $derived.by(() => {
		const netLoss = this.decayRate - this.regenRate;
		if (netLoss <= 0) return Infinity;
		return this.mass / netLoss;
	});

	getUpgradeEffect(upgradeId: string): number {
		return this.upgradeLevels[upgradeId] || 0;
	}

	// Add mass by spending Electrons
	bombardCore(electronAmount: number): boolean {
		if (!this.unlocked) return false;
		const electronBalance = currenciesManager.getAmount(CurrenciesTypes.ELECTRONS);
		if (electronBalance < electronAmount) return false;

		currenciesManager.remove(CurrenciesTypes.ELECTRONS, electronAmount);
		this.mass += electronAmount * MASS_PER_ELECTRON;
		return true;
	}

	// Set control rod level (0-1)
	setControlRodLevel(level: number) {
		this.controlRodLevel = Math.max(0, Math.min(1, level));
	}

	// Main tick - called every second from game loop
	tick(deltaMs: number) {
		if (!this.unlocked || this.mass <= 0) return;

		const seconds = deltaMs / 1000;

		// Apply regeneration
		this.mass += this.regenRate * seconds;

		// Apply decay
		let decay = this.decayRate * seconds;

		// Mass preservation chance
		if (this.preservationChance > 0 && Math.random() < this.preservationChance) {
			decay *= 0.5;
		}

		this.mass = Math.max(0, this.mass - decay);
		this.lastTick = Date.now();
	}

	// Offline simulation step
	tickOffline(seconds: number): number {
		if (!this.unlocked || this.mass <= 0) return 1;

		// Calculate effective decay constant (k)
		const k = this.decayRatePercent * (1 - 0.5 * this.preservationChance);
		const R = this.regenRate;

		let avgMass = this.mass;

		if (seconds > 0) {
			if (k > 0.000001) {
				// Analytical solution: m(t) = R/k + (m0 - R/k) * e^(-kt)
				const equilibrium = R / k;
				const m0 = this.mass;
				const expFactor = Math.exp(-k * seconds);
				const finalMass = equilibrium + (m0 - equilibrium) * expFactor;

				// Average mass over interval: (1/t) * ∫ m(t) dt
				// ∫ m(t) = (R/k)*t - (m0 - R/k)/k * e^(-kt)
				// Definite integral [0, t] = (R/k)*t + ((m0 - R/k)/k) * (1 - e^(-kt))
				avgMass = equilibrium + ((m0 - equilibrium) / (k * seconds)) * (1 - expFactor);
				this.mass = finalMass;
			} else {
				// Linear approximation for near-zero decay
				const finalMass = this.mass + R * seconds;
				avgMass = (this.mass + finalMass) / 2;
				this.mass = finalMass;
			}
		}

		// Calculate multiplier based on average mass
		// Replicate logic from currentCpm and radiationMultiplier derived values
		// but using avgMass instead of this.mass
		if (avgMass <= 0 || this.controlRodLevel <= 0) return 1;

		const rawCpm = avgMass * this.controlRodLevel * 10 * this.enrichmentBonus;
		const cpm = Math.min(rawCpm, this.maxCpm);

		const critBonus = this.criticalChance > 0 ? 1 + this.criticalChance : 1;
		return 1 + (cpm / 50) * critBonus;
	}

	// Purchase upgrade
	purchaseUpgrade(upgradeId: string): boolean {
		const upgrade = RADIATION_UPGRADES[upgradeId];
		if (!upgrade) return false;

		const currentLevel = this.upgradeLevels[upgradeId] || 0;
		if (currentLevel >= upgrade.maxLevel) return false;

		const price = getRadiationUpgradePrice(upgrade, currentLevel);
		const balance = currenciesManager.getAmount(price.currency);
		if (balance < price.amount) return false;

		currenciesManager.remove(price.currency, price.amount);
		this.upgradeLevels = {
			...this.upgradeLevels,
			[upgradeId]: currentLevel + 1,
		};
		return true;
	}

	// Load state
	loadState(state: RadiationState, upgrades: Record<string, number>) {
		this.controlRodLevel = state.controlRodLevel ?? 0;
		this.lastTick = state.lastTick ?? Date.now();
		this.mass = state.mass ?? 0;
		this.unlocked = state.unlocked ?? false;
		this.upgradeLevels = upgrades ?? {};
	}

	// Get state for saving
	getState(): RadiationState {
		return {
			controlRodLevel: this.controlRodLevel,
			lastTick: this.lastTick,
			mass: this.mass,
			unlocked: this.unlocked,
		};
	}

	// Reset
	reset() {
		this.controlRodLevel = 0;
		this.lastTick = Date.now();
		this.mass = 0;
	}

	// Unlock
	unlock() {
		this.unlocked = true;
	}
}

export const radiationManager = new RadiationManager();
