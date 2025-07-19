import { derived } from "svelte/store";
import { currentUpgradesBought, settings } from "$stores/gameStore";
import { getUpgradesWithEffects } from "$helpers/effects";
import { gameManager } from "$helpers/gameManager";
import type { BuildingType } from "$data/buildings";
import { browser } from "$app/environment";

// Set up auto-buy intervals for each building
export const autoBuyIntervals = derived([currentUpgradesBought, settings], ([$currentUpgradesBought, $settings]) => {
    const autoBuyUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'auto_buy' });
    const intervals: Partial<Record<BuildingType, number>> = {};

    autoBuyUpgrades.forEach(upgrade => {
        if (!upgrade.effects) return;

        upgrade.effects.forEach(effect => {
            if (effect.type === 'auto_buy' && effect.target) {
                const buildingType = effect.target as BuildingType;
                // Only set up interval if automation is enabled for this building
                if ($settings.automation.buildings.includes(buildingType)) {
                    intervals[buildingType] = effect.apply(intervals[buildingType] || 30000, gameManager.getCurrentState());
                }
            }
        });
    });

    return intervals;
});

// Set up auto-buy timers
if (browser) {
    const timers: Record<string, ReturnType<typeof setInterval>> = {};

    autoBuyIntervals.subscribe(intervals => {
        Object.values(timers).forEach(clearInterval);

        Object.entries(intervals).forEach(([buildingType, interval]) => {
            timers[buildingType] = setInterval(() => {
                try {
                    gameManager.purchaseBuilding(buildingType as BuildingType, 1);
                } catch (error) {
                    console.error(`Error auto-buying ${buildingType}:`, error);
                }
            }, interval);
        });
    });
}
