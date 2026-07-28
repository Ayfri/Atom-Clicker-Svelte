import type { RealmType } from '$data/realms';
import type { TutorialState } from '$lib/types';

export function createDefaultTutorialState(): TutorialState {
	return { active: false, completed: false, seenRealmSteps: [], step: 0 };
}

function realmStepKey(realm: RealmType, stepId: string) {
	return `${realm}:${stepId}`;
}

export class TutorialManager {
	state = $state<TutorialState>(createDefaultTutorialState());

	start() {
		this.state = { ...this.state, active: true, completed: false, step: 0 };
	}

	next(stepCount: number) {
		if (this.state.step + 1 >= stepCount) {
			this.complete();
			return;
		}
		this.state = { ...this.state, step: this.state.step + 1 };
	}

	skip() {
		this.state = { ...this.state, active: false, completed: true, step: 0 };
	}

	complete() {
		this.state = { ...this.state, active: false, completed: true, step: 0 };
	}

	hasSeenRealmStep(realm: RealmType, stepId: string) {
		return this.state.seenRealmSteps.includes(realmStepKey(realm, stepId));
	}

	markRealmStepSeen(realm: RealmType, stepId: string) {
		const key = realmStepKey(realm, stepId);
		if (this.state.seenRealmSteps.includes(key)) return;
		this.state = { ...this.state, seenRealmSteps: [...this.state.seenRealmSteps, key] };
	}

	forgetRealmSteps(realm: RealmType) {
		this.state = { ...this.state, seenRealmSteps: this.state.seenRealmSteps.filter(key => !key.startsWith(`${realm}:`)) };
	}

	reset() {
		this.state = createDefaultTutorialState();
	}
}
