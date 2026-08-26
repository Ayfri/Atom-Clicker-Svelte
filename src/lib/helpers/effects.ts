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

	for (const upgrade of upgrades) {
		if (!('effects' in upgrade) || !Array.isArray(upgrade.effects)) continue;

		for (const effect of upgrade.effects) {
			if (options.type && effect.type !== options.type) continue;
			if (options.target && effect.target !== options.target) continue;
			value = effect.apply(value, manager);
		}
	}

	return value;
}

export function calculateEffects(upgrades: (Upgrade | SkillUpgrade)[], manager: GameManager, defaultValue: number = 0, options?: SearchEffectsOptions): number {
	return upgrades.reduce((currentValue, upgrade) => {
		if ('effects' in upgrade && Array.isArray(upgrade.effects)) {
			return upgrade.effects.reduce((value, effect) => {
				if (options?.type && effect.type !== options.type) return value;
				if (options?.target && effect.target !== options.target) return value;
				return effect.apply(value, manager);
			}, currentValue);
		}
		return currentValue;
	}, defaultValue);
}
