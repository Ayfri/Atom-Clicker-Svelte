import {writable} from 'svelte/store';

export const app = writable<any | null>(null);
