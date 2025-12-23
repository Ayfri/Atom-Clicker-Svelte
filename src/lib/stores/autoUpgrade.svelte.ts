import { gameManager } from '$helpers/GameManager.svelte';
import { UPGRADES } from '$data/upgrades';
import { browser } from '$app/environment';
import { getUpgradesWithEffects } from '$helpers/effects';
import { SvelteSet } from 'svelte/reactivity';

class AutoUpgradeManager {
	recentlyAutoPurchased = new SvelteSet<string>();
	private timer: ReturnType<typeof setInterval> | null = null;

	get autoUpgradeInterval() {
		if (!gameManager.settings.automation.upgrades) return 0;

		const autoUpgrades = getUpgradesWithEffects(gameManager.currentUpgradesBought, { type: 'auto_upgrade' });
		let interval = 30000; // Default: 30 seconds

		autoUpgrades.forEach((upgrade) => {
			upgrade.effects?.forEach((effect) => {
				if (effect.type === 'auto_upgrade') {
					interval = effect.apply(interval, gameManager);
				}
			});
		});

		return interval;
	}

	purchaseAvailableUpgrades() {
		if (!gameManager.settings.automation.upgrades) return;

		const availableUpgrades = Object.values(UPGRADES)
			.filter((upgrade) => {
				const meetsCondition = upgrade.condition?.(gameManager) ?? true;
				const notPurchased = !gameManager.upgrades.includes(upgrade.id);
				return meetsCondition && notPurchased;
			})
			.sort((a, b) => a.cost.amount - b.cost.amount);

		for (const upgrade of availableUpgrades) {
			if (!gameManager.canAfford(upgrade.cost)) continue;

			gameManager.purchaseUpgrade(upgrade.id);

			// Add visual feedback
			this.recentlyAutoPurchased.add(upgrade.id);
			setTimeout(() => {
				this.recentlyAutoPurchased.delete(upgrade.id);
			}, 2000);
		}
	}

	init() {
		if (browser) {
			$effect(() => {
				const interval = this.autoUpgradeInterval;

				if (this.timer) clearInterval(this.timer);
				this.timer = interval > 0 ? setInterval(() => this.purchaseAvailableUpgrades(), interval) : null;

				return () => {
					if (this.timer) clearInterval(this.timer);
				};
			});
		}
	}
}

export const autoUpgradeManager = new AutoUpgradeManager();
