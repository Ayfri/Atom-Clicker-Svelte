import { derived } from "svelte/store";
import { atoms, protons } from "$stores/gameStore";
import { PROTONS_ATOMS_REQUIRED } from "$lib/constants";

export const protoniseProtonsGain = derived([atoms, protons], ([$atoms, $protons]) => {
    return Math.floor(Math.sqrt($atoms / PROTONS_ATOMS_REQUIRED));
});
