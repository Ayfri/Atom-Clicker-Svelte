import { innerWidth } from 'svelte/reactivity/window';

export const mobile = {
	get current() {
		return (innerWidth.current ?? 0) <= 900;
	}
};
