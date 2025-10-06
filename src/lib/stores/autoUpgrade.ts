import { derived, writable } from "svelte/store";
import { currentUpgradesBought, settings } from "$stores/gameStore";
import { gameManager } from "$helpers/gameManager";
import { UPGRADES } from "$data/upgrades";
import { browser } from "$app/environment";
import { getUpgradesWithEffects } from "$helpers/effects";

// Track recently auto-purchased upgrades for visual feedback
export const recentlyAutoPurchased = writable<Set<string>>(new Set());

// Auto-upgrade interval based on purchased upgrades
export const autoUpgradeInterval = derived(
    [currentUpgradesBought, settings],
    ([$upgrades, $settings]) => {
        if (!$settings.automation.upgrades) return 0;
        
        const autoUpgrades = getUpgradesWithEffects($upgrades, { type: 'auto_upgrade' });
        let interval = 30000; // Default: 30 seconds
        
        autoUpgrades.forEach(upgrade => {
            upgrade.effects?.forEach(effect => {
                if (effect.type === 'auto_upgrade') {
                    interval = effect.apply(interval, gameManager.getCurrentState());
                }
            });
        });
        
        return interval;
    }
);

// Attempt to purchase available upgrades automatically
function purchaseAvailableUpgrades() {
    const state = gameManager.getCurrentState();
    if (!state.settings.automation.upgrades) return;

    const availableUpgrades = Object.values(UPGRADES)
        .filter(upgrade => {
            const meetsCondition = upgrade.condition?.(state) ?? true;
            const notPurchased = !state.upgrades.includes(upgrade.id);
            return meetsCondition && notPurchased;
        })
        .sort((a, b) => a.cost.amount - b.cost.amount);

    for (const upgrade of availableUpgrades) {
        if (!gameManager.canAfford(upgrade.cost)) continue;
        
        gameManager.purchaseUpgrade(upgrade.id);
        
        // Add visual feedback
        recentlyAutoPurchased.update(set => {
            set.add(upgrade.id);
            setTimeout(() => {
                recentlyAutoPurchased.update(s => {
                    s.delete(upgrade.id);
                    return s;
                });
            }, 2000);
            return set;
        });
    }
}

// Setup auto-upgrade timer
if (browser) {
    let timer: ReturnType<typeof setInterval> | null = null;

    autoUpgradeInterval.subscribe(interval => {
        if (timer) clearInterval(timer);
        timer = interval > 0 ? setInterval(purchaseAvailableUpgrades, interval) : null;
    });
}
