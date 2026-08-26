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
	// Most folds have no grouped effect at all, and this runs on every derived read, so the map is allocated on demand.
	let groupContributions: Map<string, number> | null = null;
	const wantedType = options.type;
	const wantedTarget = options.target;

	for (const upgrade of upgrades) {
		const effects = (upgrade as { effects?: Effect[] }).effects;
		if (!Array.isArray(effects)) continue;

		for (const effect of effects) {
			if (wantedType && effect.type !== wantedType) continue;
			if (wantedTarget && effect.target !== wantedTarget) continue;

			if (effect.group) {
				const contribution = effect.apply(0, manager);
				groupContributions ??= new Map();
				groupContributions.set(effect.group, (groupContributions.get(effect.group) ?? 0) + contribution);
				continue;
			}

			value = effect.apply(value, manager);
		}
	}

	if (groupContributions) {
		for (const contribution of groupContributions.values()) {
			value *= 1 + contribution;
		}
	}

	return value;
}

export function calculateEffects(upgrades: (Upgrade | SkillUpgrade)[], manager: GameManager, defaultValue: number = 0, options?: SearchEffectsOptions): number {
	return foldEffects(upgrades, manager, defaultValue, options ?? {});
}
