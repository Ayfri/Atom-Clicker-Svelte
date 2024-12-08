export const BuildingTypes = {
	MOLECULE: 'molecule',
	CRYSTAL: 'crystal',
	NANOSTRUCTURE: 'nanostructure',
	MICROORGANISM: 'microorganism',
	ROCK: 'rock',
	PLANET: 'planet',
	STAR: 'star',
	NEUTRON_STAR: 'neutronStar',
	BLACK_HOLE: 'blackHole'
} as const;

export type BuildingType = typeof BuildingTypes[keyof typeof BuildingTypes];

export interface BuildingData {
	name: string;
	description: string;
	cost: number;
	rate: number;
}

export const BUILDINGS: Record<BuildingType, BuildingData> = {
	[BuildingTypes.MOLECULE]: {
		name: 'Molecule',
		description: 'Basic building block of matter',
		cost: 20,
		rate: 0.1,
	},
	[BuildingTypes.CRYSTAL]: {
		name: 'Crystal',
		description: 'Organized structure of molecules',
		cost: 300,
		rate: 1.5,
	},
	[BuildingTypes.NANOSTRUCTURE]: {
		name: 'Nanostructure',
		description: 'Engineered atomic arrangements',
		cost: 9000,
		rate: 16,
	},
	[BuildingTypes.MICROORGANISM]: {
		name: 'Micro-organism',
		description: 'Living atomic factories',
		cost: 251_000,
		rate: 100,
	},
	[BuildingTypes.ROCK]: {
		name: 'Rock',
		description: 'Solid mass of atoms',
		cost: 8_808_080,
		rate: 4000,
	},
	[BuildingTypes.PLANET]: {
		name: 'Planet',
		description: 'Celestial body of atoms',
		cost: 450_200_000,
		rate: 35_000,
	},
	[BuildingTypes.STAR]: {
		name: 'Star',
		description: 'Cosmic atom forge',
		cost: 9_850_000_000,
		rate: 245_000,
	},
	[BuildingTypes.NEUTRON_STAR]: {
		name: 'Neutron Star',
		description: 'Ultra-dense atomic core',
		cost: 77_700_000_000,
		rate: 1_700_000,
	},
	[BuildingTypes.BLACK_HOLE]: {
		name: 'Black Hole',
		description: 'Cosmic atom collector',
		cost: 1_000_000_000_000,
		rate: 12_000_000,
	}
};

export const BUILDING_LEVEL_UP_COST = 100;

export const BUILDING_COLORS = [
	"#4a90e2",
	"#e34b4b",
	"#f9c80e",
	"#6b4ae2",
	"#45d945",
	"#4ae2c6",
	"#b441ae",
	"#4a4ae2",
	"#e36d31",
] as const;

export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];