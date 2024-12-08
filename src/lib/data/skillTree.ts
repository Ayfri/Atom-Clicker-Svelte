import type {SkillUpgrade} from '$lib/types';
import {BUILDINGS, type BuildingData, type BuildingType, BUILDING_TYPES} from '$data/buildings';

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
		description: 'Multiply by 2 the atoms production.',
		position: gridPos(0, 0),
		effects: [{ type: 'global', value: 2, value_type: 'multiply' }],
	},
	...createBuildingsSkillUpgrades(
		(buildingType, building, i) => {
			const previousBuildingType = BUILDING_TYPES[i - 1];

			return {
				id: `${buildingType}Multiplier`,
				name: `${building.name} Multiplier`,
				description: `Multiply by 2 the ${building.name} production.`,
				condition: state => (state.buildings[buildingType]?.count ?? 0) >= 100,
				position: gridPos(-(i + 0.5), 1),
				effects: [
					{
						target: building.name,
						type: 'building',
						value: 2,
						value_type: 'multiply',
					} as const,
				],
				requires: previousBuildingType ? [`${previousBuildingType}Multiplier`] : ['globalMultiplier'],
			};
		},
	),
	bonusPhotonSpeed0: {
		id: 'bonusPhotonSpeed0',
		name: 'Bonus Photon Speed',
		description: 'Reduce the power up interval by 10%',
		position: gridPos(0.5, 1),
		effects: [{ type: 'power_up_interval', value: 0.9, value_type: 'multiply' }],
		requires: ['globalMultiplier'],
	},
	bonusPhotonSpeed1: {
		id: 'bonusPhotonSpeed1',
		name: 'Bonus Photon Speed',
		description: 'Reduce the power up interval by 20%',
		position: gridPos(1.5, 1),
		effects: [{ type: 'power_up_interval', value: 0.8, value_type: 'multiply' }],
		requires: ['bonusPhotonSpeed0'],
	},
};
