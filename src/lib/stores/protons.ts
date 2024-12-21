import { derived } from "svelte/store";
import { atoms, protons } from "$stores/gameStore";

export const PROTONS_ATOMS_REQUIRED = 1_000_000_000;

export const protoniseProtonsGain = derived([atoms, protons], ([$atoms, $protons]) => {
    return Math.floor(Math.sqrt($atoms / PROTONS_ATOMS_REQUIRED));
});
