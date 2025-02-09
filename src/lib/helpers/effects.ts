import type { Effect, GameState, SkillUpgrade, Upgrade } from "$lib/types";

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

export function calculateEffects(upgrades: (Upgrade | SkillUpgrade)[], state: GameState, defaultValue: number = 0): number {
    return upgrades.reduce((currentValue, upgrade) => {
        if ('effects' in upgrade && Array.isArray(upgrade.effects)) {
            return upgrade.effects.reduce((value, effect) => effect.apply(value, state), currentValue);
        }
        return currentValue;
    }, defaultValue);
}
