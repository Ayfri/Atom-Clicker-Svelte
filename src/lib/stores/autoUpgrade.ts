import { derived } from "svelte/store";
import { currentUpgradesBought, settings } from "$stores/gameStore";
import { gameManager } from "$helpers/gameManager";
import { UPGRADES } from "$data/upgrades";
import { browser } from "$app/environment";
import { getUpgradesWithEffects } from "$lib/helpers/effects";

// Set up auto-upgrade intervals
export const autoUpgradeInterval = derived(currentUpgradesBought, ($currentUpgradesBought) => {
    const autoUpgradeUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'auto_upgrade' });
    let interval = 0;

    autoUpgradeUpgrades.forEach(upgrade => {
        if (!upgrade.effects) return;
        upgrade.effects.forEach(effect => {
            if (effect.type === 'auto_upgrade') {
                interval = effect.apply(interval || 30000, gameManager.getCurrentState());
            }
        });
    });

    return interval;
});

// Set up auto-upgrade timer
if (browser) {
    const UPGRADE_CHECK_INTERVAL = 1000; // Check every second

    setInterval(() => {
        const state = gameManager.getCurrentState();
        if (!state.settings.automation.upgrades) return;

        // Get all available upgrades that we can afford
        Object.values(UPGRADES)
            .filter(upgrade => {
                const condition = upgrade.condition?.(state) ?? true;
                const notPurchased = !state.upgrades.includes(upgrade.id);
                return condition && notPurchased && gameManager.canAfford(upgrade.cost);
            })
            .sort((a, b) => a.cost.amount - b.cost.amount)
            .forEach(upgrade => {
                try {
                    gameManager.purchaseUpgrade(upgrade.id);
                } catch (error) {
                    console.error(`Error auto-buying upgrade ${upgrade.id}:`, error);
                }
            });
    }, UPGRADE_CHECK_INTERVAL);
}
