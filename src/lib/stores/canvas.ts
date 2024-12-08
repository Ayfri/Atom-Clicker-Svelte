import {writable} from 'svelte/store';
import type {Particle} from '$helpers/particles';

export let particles = writable<Particle[]>([]);
