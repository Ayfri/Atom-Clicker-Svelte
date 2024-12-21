import {SKILL_UPGRADES} from '$data/skillTree';
import {gameManager} from '$helpers/gameManager';
import {ACHIEVEMENTS} from '$data/achievements';
import {BUILDINGS} from '$data/buildings';
import {UPGRADES} from '$data/upgrades';
import {formatNumber} from '$lib/utils';

export function setGlobals() {
	window.ACHIEVEMENTS = ACHIEVEMENTS;
	window.BUILDINGS = BUILDINGS;
	window.SKILL_UPGRADES = SKILL_UPGRADES;
	window.UPGRADES = UPGRADES;
	window.gameManager = gameManager;
	window.formatNumber = formatNumber;
}
