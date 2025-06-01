import {get} from 'svelte/store';
import {atomsPerSecond, playerLevel} from '$stores/gameStore';
import type {Achievement, GameState} from '$lib/types';
import {formatNumber} from '$lib/utils';
import {BUILDING_TYPES, BUILDINGS, type BuildingType} from '$data/buildings';
import {SKILL_UPGRADES} from '$data/skillTree';

export const SPECIAL_ACHIEVEMENTS: Achievement[] = [
	{
		id: 'first_atom',
		name: 'Baby Steps',
		description: 'Click your first atom',
		condition: (state: GameState) => state.atoms >= 1,
	},
	{
		id: 'secret_achievement',
		name: 'Have more than 100 buildings',
		description: 'A mysterious achievement',
		hiddenCondition: (state: GameState) => {
			const totalBuildings = Object.values(state.buildings).reduce((sum, b) => sum + b.count, 0);
			return totalBuildings >= 100;
		},
		condition: (state: GameState) => {
			const totalBuildings = Object.values(state.buildings).reduce((sum, b) => sum + b.count, 0);
			return totalBuildings >= 100;
		},
	},
	{
		id: 'hidden_atom_clicked',
		name: 'Atomic Discoverer',
		description: 'Found the hidden atom in the credits',
		hiddenCondition: (state: GameState) => !state.achievements.includes('hidden_atom_clicked'),
		condition: (state: GameState) => state.achievements.includes('hidden_atom_clicked'),
	},
	{
		id: 'skill_tree_master',
		name: 'Skill Tree Master',
		description: 'Master of the atomic realm',
		hiddenCondition: (state: GameState) => state.skillUpgrades.length === 0,
		condition: (state: GameState) => {
			const totalSkillUpgrades = Object.keys(SKILL_UPGRADES).length;
			return state.skillUpgrades.length >= totalSkillUpgrades;
		},
	},
];

function createBuildingAchievements(buildingId: BuildingType): Achievement[] {
	const name = BUILDINGS[buildingId].name;

	function createBuildingCountAchievement(countName: string, number: number, description = `Own ${number} ${name} buildings`): Achievement {
		return {
			id: `${number}_${buildingId}`,
			name: `${countName} ${name}`,
			description,
			hiddenCondition: (state: GameState) => state.buildings[buildingId] === undefined || state.buildings[buildingId].count === 0,
			condition: (state: GameState) => state.buildings[buildingId] !== undefined && state.buildings[buildingId].count >= number,
		};
	}

	return [
		createBuildingCountAchievement('One', 1, `Buy your first ${name} building`),
		createBuildingCountAchievement('Ten', 10),
		createBuildingCountAchievement('Fifty', 50),
		createBuildingCountAchievement('Hundred',  100),
		createBuildingCountAchievement('Two hundred', 200),
		createBuildingCountAchievement('Three hundred', 300),
		createBuildingCountAchievement('Five hundred', 500),
	];
}

function createBuildingTotalAchievements(): Achievement[] {
	function createBuildingTotalAchievement(count: number): Achievement {
		return {
			id: `total_${count}`,
			name: `${count} Buildings`,
			description: `Own a total of ${count} buildings`,
			hiddenCondition: (state: GameState) => Object.values(state.buildings).every(b => b.count === 0),
			condition: (state: GameState) => {
				const totalBuildings = Object.values(state.buildings).reduce((sum, b) => sum + b.count, 0);
				return totalBuildings >= count;
			},
		};
	}

	return [50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1500, 2000, 2500, 3000].map(createBuildingTotalAchievement);
}

function createBuildingLevelsAchievements(): Achievement[] {
	function createBuildingLevelAchievement(level: number): Achievement {
		return {
			id: `buildings_levels_${level}`,
			name: `Levels ${level}`,
			description: `Have a total of ${level} buildings levels`,
			hiddenCondition: (state: GameState) => Object.values(state.buildings).every(b => b.level === 0),
			condition: (state: GameState) => {
				const totalLevels = Object.values(state.buildings).reduce((sum, b) => sum + b.level, 0);
				return totalLevels >= level;
			},
		}
	}

	return [1, 2, 3, 5, 7, 10, 15, 20, 30, 50].map(createBuildingLevelAchievement);
}

function createAtomsPerSecondAchievements(): Achievement[] {
	function createAtomsPerSecondAchievement(count: number): Achievement {
		const formattedCount = formatNumber(count);
		return {
			id: `aps_${formattedCount.toLowerCase()}`,
			name: `${formattedCount} Atoms per Second`,
			description: `Produce ${formattedCount} atoms per second`,
			condition: () => get(atomsPerSecond) >= count,
		};
	}
	const numbers = Array(10).fill(0).map((_, i) => 10 ** (i * 2) * 10);

	return numbers.map(createAtomsPerSecondAchievement);
}

function createTotalClicksAchievements(): Achievement[] {
	function createTotalClicksAchievement(count: number): Achievement {
		return {
			id: `clicks_${count}`,
			name: `${formatNumber(count)} Clicks`,
			description: `Click ${formatNumber(count)} times`,
			hiddenCondition: (state: GameState) => state.totalClicks === 0,
			condition: (state: GameState) => state.totalClicks >= count,
		};
	}

	return [1, 100, 500, 1000, 5000, 10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000].map(createTotalClicksAchievement);
}

function createTotalLevelsAchievements(): Achievement[] {
	function createTotalLevelsAchievement(count: number): Achievement {
		return {
			id: `levels_${count}`,
			name: `Level ${formatNumber(count, 0)}`,
			description: `Be at least ${formatNumber(count, 0)} xp level`,
			condition: (state: GameState) => get(playerLevel) >= count,
		};
	}

	return [1, 10, 25, 50, 100, 250, 500, 727, 1000, 2500, 5000, 10_000].map(createTotalLevelsAchievement);
}

function createProtonisesAchievements(): Achievement[] {
	function createProtonisesAchievement(count: number): Achievement {
		return {
			id: `protonises_${count}`,
			name: `${count} Protonises`,
			description: `Protonise ${count} times`,
			condition: (state: GameState) => state.totalProtonises >= count,
			hiddenCondition: (state: GameState) => state.totalProtonises === 0,
		};
	}

	return [1, 2, 3, 5, 10, 20, 50, 100, 250, 500, 1000].map(createProtonisesAchievement);
}

function createElectronizesAchievements(): Achievement[] {
	function createElectronizesAchievement(count: number): Achievement {
		return {
			id: `electronizes_${count}`,
			name: `${count} Electronizes`,
			description: `Electronize ${count} times`,
			condition: (state: GameState) => state.totalElectronizes >= count,
			hiddenCondition: (state: GameState) => state.totalElectronizes === 0,
		};
	}

	return [1, 2, 3, 5, 10, 20, 50, 100, 250, 500, 1000].map(createElectronizesAchievement);
}

const achievementsArray: Achievement[] = [
	...BUILDING_TYPES.map(createBuildingAchievements).flat(),
	...createBuildingTotalAchievements(),
	...createBuildingLevelsAchievements(),
	...createAtomsPerSecondAchievements(),
	...createTotalClicksAchievements(),
	...createTotalLevelsAchievements(),
	...createProtonisesAchievements(),
	...createElectronizesAchievements(),
	...SPECIAL_ACHIEVEMENTS,
];

export const ACHIEVEMENTS = Object.fromEntries(achievementsArray.map(achievement => [achievement.id, achievement]));
