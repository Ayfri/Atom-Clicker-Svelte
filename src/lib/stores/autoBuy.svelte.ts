import { gameManager } from '$helpers/GameManager.svelte';
import { getUpgradesWithEffects } from '$helpers/effects';
import type { BuildingType } from '$data/buildings';
import { browser } from '$app/environment';

class AutoBuyManager {
	recentlyAutoPurchasedBuildings = $state(new Map<BuildingType, number>());
	private timers: Record<string, ReturnType<typeof setInterval>> = {};

	get autoBuyIntervals() {
		const autoBuyUpgrades = getUpgradesWithEffects(gameManager.currentUpgradesBought, { type: 'auto_buy' });
		const intervals: Partial<Record<BuildingType, number>> = {};

		autoBuyUpgrades.forEach((upgrade) => {
			if (!upgrade.effects) return;

			upgrade.effects.forEach((effect) => {
				if (effect.type === 'auto_buy' && effect.target) {
					const buildingType = effect.target as BuildingType;
					// Only set up interval if automation is enabled for this building
					if (gameManager.settings.automation.buildings.includes(buildingType)) {
						intervals[buildingType] = effect.apply(intervals[buildingType] || 30000, gameManager);
					}
				}
			});
		});

		return intervals;
	}

	init() {
		if (browser) {
			$effect(() => {
				const intervals = this.autoBuyIntervals;

				// Clear existing timers
				Object.values(this.timers).forEach(clearInterval);
				this.timers = {};

				Object.entries(intervals).forEach(([buildingType, interval]) => {
					this.timers[buildingType] = setInterval(() => {
						try {
							const type = buildingType as BuildingType;
							const success = gameManager.purchaseBuilding(type, 1);

							if (success) {
								// Add visual feedback
								const current = this.recentlyAutoPurchasedBuildings.get(type) || 0;
								this.recentlyAutoPurchasedBuildings.set(type, current + 1);

								setTimeout(() => {
									const current = this.recentlyAutoPurchasedBuildings.get(type) || 0;
									if (current <= 1) {
										this.recentlyAutoPurchasedBuildings.delete(type);
									} else {
										this.recentlyAutoPurchasedBuildings.set(type, current - 1);
									}
								}, 2000);
							}
						} catch (error) {
							// Silent fail for auto-buy
						}
					}, interval);
				});

				return () => {
					Object.values(this.timers).forEach(clearInterval);
				};
			});
		}
	}
}

export const autoBuyManager = new AutoBuyManager();
