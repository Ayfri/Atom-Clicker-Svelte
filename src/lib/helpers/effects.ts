import type { Effect, SkillUpgrade, Upgrade } from "$lib/types";
import type { GameManager } from '$helpers/GameManager.svelte';

interface SearchEffectsOptions {
    target?: Effect['target'];
    type?: Effect['type'];
}

export function getUpgradesWithEffects(upgrades: (Upgrade | SkillUpgrade)[], options: SearchEffectsOptions) {
    return upgrades.filter((upgrade): upgrade is (Upgrade | SkillUpgrade) => {
        if ('effects' in upgrade && Array.isArray(upgrade.effects)) {
            const effects = upgrade.effects;
            let isType = true;
            let isTarget = true;

            if (options.type) {
                isType = effects.some(effect => effect.type === options.type);
            }
            if (options.target) {
                isTarget = effects.some(effect => effect.target === options.target);
            }
            return isType && isTarget;
        }

        return false;
    });
}

/**
 * Fused `getUpgradesWithEffects` + `calculateEffects`: the filter pass only exists to drop sources the fold
 * would skip anyway, so the hot derived stats walk the effects once and skip the intermediate array.
 */
export function foldEffects(upgrades: (Upgrade | SkillUpgrade)[], manager: GameManager, defaultValue: number, options: SearchEffectsOptions): number {
	let value = defaultValue;
	const groupContributions = new Map<string, number>();

	for (const upgrade of upgrades) {
		if (!('effects' in upgrade) || !Array.isArray(upgrade.effects)) continue;

		for (const effect of upgrade.effects) {
			if (options.type && effect.type !== options.type) continue;
			if (options.target && effect.target !== options.target) continue;

			if (effect.group) {
				const contribution = effect.apply(0, manager);
				groupContributions.set(effect.group, (groupContributions.get(effect.group) ?? 0) + contribution);
				continue;
			}

			value = effect.apply(value, manager);
		}
	}

	for (const contribution of groupContributions.values()) {
		value *= 1 + contribution;
	}

	return value;
}

export function calculateEffects(upgrades: (Upgrade | SkillUpgrade)[], manager: GameManager, defaultValue: number = 0, options?: SearchEffectsOptions): number {
	return foldEffects(upgrades, manager, defaultValue, options ?? {});
}
