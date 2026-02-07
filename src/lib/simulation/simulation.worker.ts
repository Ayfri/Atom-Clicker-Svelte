/// <reference lib="webworker" />
import { currenciesManager } from '$helpers/CurrenciesManager.svelte';
import { gameManager } from '$helpers/GameManager.svelte';
import { SimulationEngine } from './engine';

let engine: SimulationEngine | null = null;

self.onmessage = async (e: MessageEvent) => {
	const data = e.data;

	if (data.type === 'stop') {
		engine?.cancel();
		return;
	}

	if (data.type === 'start') {
		const { config, initialState } = data;

		try {
			// Initialize the worker's isolated game instance
			if (initialState) {
				gameManager.loadSaveData(initialState);
			} else {
				gameManager.resetAll();
				currenciesManager.hardReset();
			}

			engine = new SimulationEngine(config);

			const result = await engine.runAsync(progress => {
				self.postMessage({ type: 'progress', payload: progress });
			});

			self.postMessage({ type: 'result', payload: result });
		} catch (err) {
			console.error('Simulation Worker Error:', err);
			self.postMessage({ type: 'error', payload: err instanceof Error ? err.message : String(err) });
		}
	}
};
