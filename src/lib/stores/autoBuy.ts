import { derived, writable } from "svelte/store";
import { currentUpgradesBought, settings } from "$stores/gameStore";
import { getUpgradesWithEffects } from "$helpers/effects";
import { gameManager } from "$helpers/gameManager";
import type { BuildingType } from "$data/buildings";
import { browser } from "$app/environment";

// Track recently auto-purchased buildings for visual feedback
export const recentlyAutoPurchasedBuildings = writable<Map<BuildingType, number>>(new Map());

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
                    const type = buildingType as BuildingType;
                    const success = gameManager.purchaseBuilding(type, 1);
                    
                    if (success) {
                        // Add visual feedback
                        recentlyAutoPurchasedBuildings.update(map => {
                            const current = map.get(type) || 0;
                            map.set(type, current + 1);
                            return map;
                        });
                        
                        setTimeout(() => {
                            recentlyAutoPurchasedBuildings.update(map => {
                                const current = map.get(type) || 0;
                                if (current <= 1) {
                                    map.delete(type);
                                } else {
                                    map.set(type, current - 1);
                                }
                                return map;
                            });
                        }, 2000);
                    }
                } catch (error) {
                    // Silent fail for auto-buy
                }
            }, interval);
        });
    });
}
