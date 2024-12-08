/// <reference types="svelte" />
import {gameManager} from './helpers/gameManager';
import type {ACHIEVEMENTS} from './lib/data/achievements';
import type {BUILDINGS} from './lib/data/buildings';
import type {UPGRADES} from './lib/data/upgrades';
import type {formatNumber} from './lib/utils';
/// <reference types="vite/client" />

declare global {
	interface Window {
		formatNumber: typeof formatNumber;
		gameManager: typeof gameManager;
		ACHIEVEMENTS: typeof ACHIEVEMENTS;
		BUILDINGS: typeof BUILDINGS;
		SKILL_UPGRADES: typeof SKILL_UPGRADES;
		UPGRADES: typeof UPGRADES;
	}
}
