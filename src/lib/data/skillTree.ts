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
};
