import { derived } from "svelte/store";
import { protons, currentUpgradesBought } from "$stores/gameStore";
import { calculateEffects, getUpgradesWithEffects } from "$helpers/effects";
import { gameManager } from "$helpers/gameManager";
import { ELECTRONS_PROTONS_REQUIRED } from "$lib/constants";

export const electronizeElectronsGain = derived([protons, currentUpgradesBought], ([$protons, $currentUpgradesBought]) => {
    if ($protons < ELECTRONS_PROTONS_REQUIRED) return 0;

    // Get all electron gain multiplier upgrades
    const electronGainUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'electron_gain' });

    // Start with base gain of 1 and apply multipliers
    return calculateEffects(electronGainUpgrades, gameManager.getCurrentState(), 1);
});
