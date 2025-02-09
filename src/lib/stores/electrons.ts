import { derived } from "svelte/store";
import { protons } from "$stores/gameStore";

export const ELECTRONS_PROTONS_REQUIRED = 1_000_000_000;

export const electronizeElectronsGain = derived([protons], ([$protons]) => {
    return $protons >= ELECTRONS_PROTONS_REQUIRED ? 1 : 0;
});
