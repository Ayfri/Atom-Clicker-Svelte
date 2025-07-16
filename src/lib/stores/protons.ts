import { derived } from "svelte/store";
import { atoms, protons, currentUpgradesBought } from "$stores/gameStore";
import { calculateEffects, getUpgradesWithEffects } from "$helpers/effects";
import { gameManager } from "$helpers/gameManager";
import { PROTONS_ATOMS_REQUIRED } from "$lib/constants";

export const protoniseProtonsGain = derived([atoms, protons, currentUpgradesBought], ([$atoms, $protons, $currentUpgradesBought]) => {
    if ($atoms < PROTONS_ATOMS_REQUIRED) return 0;

    // Calculate base proton gain
    const baseGain = Math.floor(Math.sqrt($atoms / PROTONS_ATOMS_REQUIRED));

    // Get all proton gain multiplier upgrades
    const protonGainUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'proton_gain' });

    // Apply multipliers to base gain
    return calculateEffects(protonGainUpgrades, gameManager.getCurrentState(), baseGain);
});
