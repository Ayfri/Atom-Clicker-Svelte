import {get} from 'svelte/store';
import type {SkillUpgrade} from '$lib/types';
import {BUILDINGS, type BuildingData, type BuildingType, BUILDING_TYPES} from '$data/buildings';
import {playerLevel} from '$stores/gameStore';

// Update constants for positioning
export const GRID_SIZE = {
	x: 400,
	y: 200,
};

function gridPos(x: number, y: number) {
	return {
		x: x * GRID_SIZE.x,
		y: y * GRID_SIZE.y,
	};
}

function createBuildingsSkillUpgrades(
	skillData: (buildingType: BuildingType, building: BuildingData, i: number) => SkillUpgrade,
): Record<string, SkillUpgrade> {
	return Object.fromEntries(Object.entries(BUILDINGS).map(([buildingType, building], i) => {
		const builtSkillData = skillData?.(buildingType as BuildingType, building, i);
		return [builtSkillData.id, builtSkillData];
	}));
}

export const SKILL_UPGRADES: Record<string, SkillUpgrade> = {
	globalMultiplier: {
		id: 'globalMultiplier',
		name: 'Global Multiplier',
		description: '2x atoms production',
		position: gridPos(0, 0),
		effects: [{
			type: 'global',
			description: 'Multiply all production by 2',
			apply: (currentValue) => currentValue * 2
		}],
	},
	...createBuildingsSkillUpgrades(
		(buildingType, building, i) => {
			const previousBuildingType = BUILDING_TYPES[i - 1];

			return {
				id: `${buildingType}Multiplier`,
				name: `${building.name} Multiplier`,
				description: `2x ${building.name} production`,
				condition: state => (state.buildings[buildingType]?.count ?? 0) >= 100,
				position: gridPos(-(i + 0.5), 1),
				effects: [{
					type: 'building',
					target: buildingType,
					description: `Multiply ${building.name} production by 2`,
					apply: (currentValue) => currentValue * 2
				}],
				requires: previousBuildingType ? [`${previousBuildingType}Multiplier`] : ['globalMultiplier'],
			} satisfies SkillUpgrade;
		},
	),
	bonusPhotonSpeed0: {
		id: 'bonusPhotonSpeed0',
		name: 'Bonus Photon Speed',
		description: '0.9x power up interval',
		position: gridPos(0.5, 1),
		effects: [{
			type: 'power_up_interval',
			description: 'Multiply power up interval by 0.9',
			apply: (currentValue) => currentValue * 0.9
		}],
		requires: ['globalMultiplier'],
	},
	bonusPhotonSpeed1: {
		id: 'bonusPhotonSpeed1',
		name: 'Bonus Photon Speed',
		description: '0.8x power up interval',
		position: gridPos(1.5, 1),
		effects: [{
			type: 'power_up_interval',
			description: 'Multiply power up interval by 0.8',
			apply: (currentValue) => currentValue * 0.8
		}],
		requires: ['bonusPhotonSpeed0'],
	},
	clickPowerBoost0: {
		id: 'clickPowerBoost0',
		name: 'Click Power Boost',
		description: '2x click power',
		position: gridPos(0.5, -1),
		effects: [{
			type: 'click',
			description: 'Multiply click power by 2',
			apply: (currentValue) => currentValue * 2
		}],
		requires: ['globalMultiplier'],
	},
	clickPowerBoost1: {
		id: 'clickPowerBoost1',
		name: 'Click Power Master',
		description: '3x click power',
		position: gridPos(1.5, -1),
		effects: [{
			type: 'click',
			description: 'Multiply click power by 3',
			apply: (currentValue) => currentValue * 3
		}],
		requires: ['clickPowerBoost0'],
	},
	powerUpBoost0: {
		id: 'powerUpBoost0',
		name: 'Power-up Enhancement',
		description: '1.2x power-up duration',
		position: gridPos(2.5, 1),
		effects: [{
			type: 'power_up_duration',
			description: 'Multiply power-up duration by 1.2',
			apply: (currentValue) => currentValue * 1.2
		}],
		requires: ['bonusPhotonSpeed1'],
	},
	powerUpBoost1: {
		id: 'powerUpBoost1',
		name: 'Power-up Mastery',
		description: '1.5x power-up multiplier',
		position: gridPos(3.5, 1),
		effects: [{
			type: 'power_up_multiplier',
			description: 'Multiply power-up effects by 1.5',
			apply: (currentValue) => currentValue * 1.5
		}],
		requires: ['powerUpBoost0'],
	},
	xpBoost0: {
		id: 'xpBoost0',
		name: 'XP Boost',
		description: '1.5x XP gain',
		position: gridPos(-0.5, -1),
		effects: [{
			type: 'xp_gain',
			description: 'Multiply XP gain by 1.5',
			apply: (currentValue) => currentValue * 1.5
		}],
		requires: ['globalMultiplier'],
	},
	xpBoost1: {
		id: 'xpBoost1',
		name: 'XP Master',
		description: '2x XP gain',
		position: gridPos(-1.5, -1),
		effects: [{
			type: 'xp_gain',
			description: 'Multiply XP gain by 2',
			apply: (currentValue) => currentValue * 2
		}],
		requires: ['xpBoost0'],
	},
	levelBoost0: {
		id: 'levelBoost0',
		name: 'Level Power',
		description: '+1% production per level',
		position: gridPos(-2.5, -1),
		effects: [{
			type: 'global',
			description: 'Add 1% production per level',
			apply: (currentValue, state) => {
				const level = get(playerLevel);
				return currentValue * (1 + level * 0.01);
			}
		}],
		requires: ['xpBoost1'],
	},
	atomicFusion: {
		id: 'atomicFusion',
		name: 'Atomic Fusion',
		description: '2x atoms from clicks',
		position: gridPos(2.5, -1),
		effects: [{
			type: 'click',
			description: 'Multiply click atoms by 2',
			apply: (currentValue) => currentValue * 2
		}],
		requires: ['clickPowerBoost1'],
	},
	electronHarvester: {
		id: 'electronHarvester',
		name: 'Electron Harvester',
		description: '2x electron gain',
		position: gridPos(-3.5, -1),
		effects: [{
			type: 'electron_gain',
			description: 'Multiply electron gain by 2',
			apply: (currentValue) => currentValue * 2
		}],
		requires: ['levelBoost0'],
	},
	protonCollector: {
		id: 'protonCollector',
		name: 'Proton Collector',
		description: '1.5x proton gain',
		position: gridPos(-4.5, -1),
		effects: [{
			type: 'proton_gain',
			description: 'Multiply proton gain by 1.5',
			apply: (currentValue) => currentValue * 1.5
		}],
		requires: ['electronHarvester'],
	},
	molecularBoost: {
		id: 'molecularBoost',
		name: 'Molecular Boost',
		description: '3x Molecule and Crystal production',
		position: gridPos(0, 2),
		effects: [
			{
				type: 'building',
				target: 'molecule',
				description: 'Multiply Molecule production by 3',
				apply: (currentValue) => currentValue * 3
			},
			{
				type: 'building',
				target: 'crystal',
				description: 'Multiply Crystal production by 3',
				apply: (currentValue) => currentValue * 3
			}
		],
		requires: ['globalMultiplier'],
	},
	nanoEnhancement: {
		id: 'nanoEnhancement',
		name: 'Nano Enhancement',
		description: '2.5x Nanostructure production',
		position: gridPos(1, 2),
		effects: [{
			type: 'building',
			target: 'nanostructure',
			description: 'Multiply Nanostructure production by 2.5',
			apply: (currentValue) => currentValue * 2.5
		}],
		requires: ['molecularBoost'],
	},
	biologicalAmplifier: {
		id: 'biologicalAmplifier',
		name: 'Biological Amplifier',
		description: '2.5x Micro-organism production',
		position: gridPos(2, 2),
		effects: [{
			type: 'building',
			target: 'microorganism',
			description: 'Multiply Micro-organism production by 2.5',
			apply: (currentValue) => currentValue * 2.5
		}],
		requires: ['nanoEnhancement'],
	},
	geologicalForce: {
		id: 'geologicalForce',
		name: 'Geological Force',
		description: '2x Rock and Planet production',
		position: gridPos(3, 2),
		effects: [
			{
				type: 'building',
				target: 'rock',
				description: 'Multiply Rock production by 2',
				apply: (currentValue) => currentValue * 2
			},
			{
				type: 'building',
				target: 'planet',
				description: 'Multiply Planet production by 2',
				apply: (currentValue) => currentValue * 2
			}
		],
		requires: ['biologicalAmplifier'],
	},
	cosmicSynergy: {
		id: 'cosmicSynergy',
		name: 'Cosmic Synergy',
		description: '+5% production per building type owned',
		position: gridPos(4.5, 1),
		effects: [{
			type: 'global',
			description: 'Add 5% production per building type owned',
			apply: (currentValue, state) => {
				const ownedBuildings = Object.values(state.buildings || {}).filter(b => b && b.count > 0).length;
				return currentValue * (1 + ownedBuildings * 0.05);
			}
		}],
		requires: ['powerUpBoost1'],
	},
	quantumResonance: {
		id: 'quantumResonance',
		name: 'Quantum Resonance',
		description: '+20% production per 100 buildings owned',
		position: gridPos(-5.5, -2),
		effects: [{
			type: 'global',
			description: 'Add 20% production per 100 buildings owned',
			apply: (currentValue, state) => {
				const totalBuildings = Object.values(state.buildings || {})
					.reduce((sum, building) => sum + (building?.count || 0), 0);
				const bonus = Math.floor(totalBuildings / 100) * 0.2;
				return currentValue * (1 + bonus);
			}
		}],
		requires: ['protonCollector'],
	},
	clickMastery: {
		id: 'clickMastery',
		name: 'Click Mastery',
		description: '+10% production per 100 total clicks',
		position: gridPos(3.5, -1),
		effects: [{
			type: 'global',
			description: 'Add 10% production per 100 total clicks',
			apply: (currentValue, state) => {
				const clickBonus = Math.floor((state.totalClicks || 0) / 100) * 0.1;
				return currentValue * (1 + clickBonus);
			}
		}],
		requires: ['atomicFusion'],
	},
	prestigeBonus: {
		id: 'prestigeBonus',
		name: 'Prestige Bonus',
		description: '+1% production per Electronize',
		position: gridPos(-3.5, 0),
		effects: [{
			type: 'global',
			description: 'Add 1% production per Electronize performed',
			apply: (currentValue, state) => {
				const electronizeBonus = (state.totalElectronizes || 0) * 0.01;
				return currentValue * (1 + electronizeBonus);
			}
		}],
		requires: ['electronHarvester'],
	},
	stellarCore: {
		id: 'stellarCore',
		name: 'Stellar Core',
		description: '2x production for Star and higher buildings',
		position: gridPos(-4.5, 0),
		effects: [
			{
				type: 'building',
				target: 'star',
				description: 'Multiply Star production by 2',
				apply: (currentValue) => currentValue * 2
			},
			{
				type: 'building',
				target: 'neutronStar',
				description: 'Multiply Neutron Star production by 2',
				apply: (currentValue) => currentValue * 2
			},
			{
				type: 'building',
				target: 'blackHole',
				description: 'Multiply Black Hole production by 2',
				apply: (currentValue) => currentValue * 2
			}
		],
		condition: state => (state.buildings.star?.count ?? 0) >= 5,
		requires: ['prestigeBonus'],
	},
	powerUpMastery: {
		id: 'powerUpMastery',
		name: 'Power-up Mastery',
		description: '0.9x power-up interval, 1.1x duration',
		position: gridPos(4.5, 2),
		effects: [
			{
				type: 'power_up_interval',
				description: 'Multiply power-up interval by 0.9',
				apply: (currentValue) => currentValue * 0.9
			},
			{
				type: 'power_up_duration',
				description: 'Multiply power-up duration by 1.1',
				apply: (currentValue) => currentValue * 1.1
			}
		],
		requires: ['geologicalForce'],
	},
	levelBoost1: {
		id: 'levelBoost1',
		name: 'Advanced Level Power',
		description: '+1.5% production per level',
		position: gridPos(-2.5, -2),
		effects: [{
			type: 'global',
			description: 'Add 1.5% production per level',
			apply: (currentValue, state) => {
				const level = get(playerLevel);
				return currentValue * (1 + level * 0.015);
			}
		}],
		requires: ['levelBoost0'],
	},
	xpBoost2: {
		id: 'xpBoost2',
		name: 'XP Grandmaster',
		description: '1.5x XP gain',
		position: gridPos(-1.5, -2),
		effects: [{
			type: 'xp_gain',
			description: 'Multiply XP gain by 1.5',
			apply: (currentValue) => currentValue * 1.5
		}],
		requires: ['xpBoost1'],
	},
	clickPowerBoost2: {
		id: 'clickPowerBoost2',
		name: 'Click Power Grandmaster',
		description: '2x click power',
		position: gridPos(1.5, -2),
		effects: [{
			type: 'click',
			description: 'Multiply click power by 2',
			apply: (currentValue) => currentValue * 2
		}],
		requires: ['clickPowerBoost1'],
	},
	bonusPhotonSpeed2: {
		id: 'bonusPhotonSpeed2',
		name: 'Ultimate Photon Speed',
		description: '0.7x power up interval',
		position: gridPos(1.5, 0),
		effects: [{
			type: 'power_up_interval',
			description: 'Multiply power up interval by 0.7',
			apply: (currentValue) => currentValue * 0.7
		}],
		requires: ['bonusPhotonSpeed1'],
	},
	atomicStability: {
		id: 'atomicStability',
		name: 'Atomic Stability',
		description: '1.5x production for first 3 building types',
		position: gridPos(0, -2),
		effects: [
			{
				type: 'building',
				target: 'molecule',
				description: 'Multiply Molecule production by 1.5',
				apply: (currentValue) => currentValue * 1.5
			},
			{
				type: 'building',
				target: 'crystal',
				description: 'Multiply Crystal production by 1.5',
				apply: (currentValue) => currentValue * 1.5
			},
			{
				type: 'building',
				target: 'nanostructure',
				description: 'Multiply Nanostructure production by 1.5',
				apply: (currentValue) => currentValue * 1.5
			}
		],
		requires: ['globalMultiplier'],
	},
	particleAccelerator: {
		id: 'particleAccelerator',
		name: 'Particle Accelerator',
		description: '+25% production per Protonise',
		position: gridPos(-5.5, 0),
		effects: [{
			type: 'global',
			description: 'Add 25% production per Protonise performed',
			apply: (currentValue, state) => {
				const protoniseBonus = (state.totalProtonises || 0) * 0.25;
				return currentValue * (1 + protoniseBonus);
			}
		}],
		requires: ['stellarCore'],
	},
	photonEfficiency: {
		id: 'photonEfficiency',
		name: 'Photon Efficiency',
		description: '+1% all production per photon upgrade owned',
		position: gridPos(5.5, 1),
		effects: [{
			type: 'global',
			description: 'Add 1% production per photon upgrade owned',
			apply: (currentValue, state) => {
				const photonUpgradeCount = Object.values(state.photonUpgrades || {}).reduce((sum, level) => sum + level, 0);
				return currentValue * (1 + photonUpgradeCount * 0.01);
			}
		}],
		condition: state => Object.keys(state.photonUpgrades || {}).length >= 3,
		requires: ['cosmicSynergy'],
	},
	photonProtonBoost: {
		id: 'photonProtonBoost',
		name: 'Photon Proton Boost',
		description: 'Add 1% protons per photon upgrade owned',
		position: gridPos(5.5, 2),
		effects: [{
			type: 'global',
			description: 'Add 1% protons per photon upgrade owned',
			apply: (currentValue, state) => {
				const photonUpgradeCount = Object.values(state.photonUpgrades || {}).reduce((sum, level) => sum + level, 0);
				return currentValue * (1 + photonUpgradeCount * 0.01);
			}
		}],
		requires: ['photonEfficiency'],
	},
};
