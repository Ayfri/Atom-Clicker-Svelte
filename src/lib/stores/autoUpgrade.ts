import { derived } from "svelte/store";
import { currentUpgradesBought } from "$stores/gameStore";
import { getUpgradesWithEffects } from "$lib/helpers/effects";
import { gameManager } from "$lib/helpers/gameManager";
import { browser } from "$app/environment";
import { UPGRADES } from "$data/upgrades";

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
    let timer: ReturnType<typeof setInterval>;

    autoUpgradeInterval.subscribe(interval => {
        if (timer) clearInterval(timer);
        if (interval > 0) {
            timer = setInterval(() => {
                const state = gameManager.getCurrentState();
                const availableUpgrades = Object.values(UPGRADES)
                    .filter(upgrade => {
                        const condition = upgrade.condition?.(state) ?? true;
                        const notPurchased = !state.upgrades.includes(upgrade.id);
                        return condition && notPurchased && gameManager.canAfford(upgrade.cost);
                    })
                    .sort((a, b) => a.cost.amount - b.cost.amount);

                if (availableUpgrades.length > 0) {
                    gameManager.purchaseUpgrade(availableUpgrades[0].id);
                }
            }, interval);
        }
    });
}
