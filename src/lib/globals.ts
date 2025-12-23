import {SKILL_UPGRADES} from '$data/skillTree';
import {gameManager} from '$helpers/GameManager.svelte';
import {ACHIEVEMENTS} from '$data/achievements';
import {BUILDINGS} from '$data/buildings';
import {UPGRADES} from '$data/upgrades';
import {formatNumber} from '$lib/utils';

export function setGlobals() {
	window.ACHIEVEMENTS = ACHIEVEMENTS;
	window.BUILDINGS = BUILDINGS;
	window.SKILL_UPGRADES = SKILL_UPGRADES;
	window.UPGRADES = UPGRADES;
	if (import.meta.env.DEV) window.gameManager = gameManager;
	window.formatNumber = formatNumber;
}
