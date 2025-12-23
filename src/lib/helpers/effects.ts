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

export function calculateEffects(upgrades: (Upgrade | SkillUpgrade)[], manager: GameManager, defaultValue: number = 0): number {
    return upgrades.reduce((currentValue, upgrade) => {
        if ('effects' in upgrade && Array.isArray(upgrade.effects)) {
            return upgrade.effects.reduce((value, effect) => effect.apply(value, manager), currentValue);
        }
        return currentValue;
    }, defaultValue);
}
