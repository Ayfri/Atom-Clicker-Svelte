import {Application} from 'pixi.js';
import {writable} from 'svelte/store';

export const app = writable<Application | null>(null);
