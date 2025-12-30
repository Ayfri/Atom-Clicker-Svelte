<script lang="ts">
	import { gameManager } from '$helpers/GameManager.svelte';
	import { CurrenciesTypes, type CurrencyName } from '$data/currencies';
	import { UPGRADES } from '$data/upgrades';
	import { ACHIEVEMENTS } from '$data/achievements';
	import { BUILDING_TYPES, BUILDINGS } from '$data/buildings';
	import { ALL_PHOTON_UPGRADES } from '$data/photonUpgrades';
	import { SAVE_KEY } from '$helpers/saves';
	import { Save, Trash2, Zap, Unlock, Coins, Factory, Orbit, Download, Upload, ToggleLeft, Sparkles } from 'lucide-svelte';

	function toggleFeature(upgradeId: string) {
		if (gameManager.upgrades.includes(upgradeId)) {
			gameManager.upgrades = gameManager.upgrades.filter(u => u !== upgradeId);
		} else {
			gameManager.upgrades = [...gameManager.upgrades, upgradeId];
		}
	}

	function togglePurpleRealm() {
		gameManager.purpleRealmUnlocked = !gameManager.purpleRealmUnlocked;
		if (gameManager.purpleRealmUnlocked && !gameManager.upgrades.includes('feature_purple_realm')) {
			gameManager.upgrades = [...gameManager.upgrades, 'feature_purple_realm'];
		}
	}
</script>

<div class="space-y-4">
	<!-- Feature Toggles -->
	<div class="bg-white/5 rounded-xl p-3 border border-white/5">
		<h3 class="text-base font-bold mb-3 flex items-center gap-2 text-accent-300">
			<ToggleLeft size={18} />
			<span>Feature Toggles</span>
		</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
			<label class="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5 cursor-pointer hover:bg-black/30 transition-colors">
				<span class="text-sm text-white/80">Levels Feature</span>
				<input
					type="checkbox"
					checked={gameManager.upgrades.includes('feature_levels')}
					onchange={() => toggleFeature('feature_levels')}
					class="w-4 h-4 rounded border-white/10 bg-black/20 text-accent-500 focus:ring-accent-500/50 cursor-pointer"
				/>
			</label>
			<label class="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5 cursor-pointer hover:bg-black/30 transition-colors">
				<span class="text-sm text-white/80">Purple Realm</span>
				<input
					type="checkbox"
					checked={gameManager.purpleRealmUnlocked}
					onchange={togglePurpleRealm}
					class="w-4 h-4 rounded border-white/10 bg-black/20 text-accent-500 focus:ring-accent-500/50 cursor-pointer"
				/>
			</label>
		</div>
	</div>

	<!-- Game State Actions -->
	<div class="bg-white/5 rounded-xl p-3 border border-white/5">
		<h3 class="text-base font-bold mb-3 flex items-center gap-2 text-accent-300">
			<Save size={18} />
			<span>Game State Management</span>
		</h3>
		<div class="grid grid-cols-2 gap-2">
			<button
				class="flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-lg"
				onclick={() => {
					if (confirm('Are you sure you want to hard reset? This will delete ALL progress!')) {
						localStorage.removeItem(SAVE_KEY);
						location.reload();
					}
				}}
			>
				<Trash2 size={16} />
				<span>Hard Reset</span>
			</button>
			<button
				class="flex items-center justify-center gap-2 bg-green-600/80 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-lg"
				onclick={() => {
					gameManager.save();
					alert('Game saved successfully!');
				}}
			>
				<Save size={16} />
				<span>Force Save</span>
			</button>
		</div>
	</div>

	<!-- Quick Unlock Actions -->
	<div class="bg-white/5 rounded-xl p-3 border border-white/5">
		<h3 class="text-base font-bold mb-3 flex items-center gap-2 text-accent-300">
			<Zap size={18} />
			<span>Quick Unlock & Boost</span>
		</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
			<button
				class="flex items-center justify-center gap-2 bg-realm-600/80 hover:bg-realm-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-lg"
				onclick={() => {
					gameManager.upgrades = Object.keys(UPGRADES);
					gameManager.achievements = Object.keys(ACHIEVEMENTS);
					gameManager.photonUpgrades = Object.fromEntries(
						Object.keys(ALL_PHOTON_UPGRADES).map(key => [key, 100])
					);
					alert('Everything unlocked!');
				}}
			>
				<Unlock size={16} />
				<span>Unlock Everything</span>
			</button>
			<button
				class="flex items-center justify-center gap-2 bg-accent-600/80 hover:bg-accent-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-lg"
				onclick={() => {
					gameManager.currencies[CurrenciesTypes.ATOMS].amount = 1e15;
					gameManager.currencies[CurrenciesTypes.PROTONS].amount = 1000;
					gameManager.currencies[CurrenciesTypes.ELECTRONS].amount = 100;
					gameManager.currencies[CurrenciesTypes.PHOTONS].amount = 10;
					alert('Resources maxed!');
				}}
			>
				<Coins size={16} />
				<span>Max Resources</span>
			</button>
			<button
				class="flex items-center justify-center gap-2 bg-green-600/80 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-lg"
				onclick={() => {
					BUILDING_TYPES.forEach(id => {
						if (!gameManager.buildings[id]) {
							gameManager.buildings[id] = {
								count: 100,
								level: 10,
								unlocked: true,
								cost: { ...BUILDINGS[id].cost },
								rate: BUILDINGS[id].rate
							};
						} else {
							const b = gameManager.buildings[id]!;
							b.count += 100;
							b.level += 10;
						}
					});
					gameManager.buildings = { ...gameManager.buildings };
					alert('Buildings maxed!');
				}}
			>
				<Factory size={16} />
				<span>Max Buildings</span>
			</button>
			<button
				class="flex items-center justify-center gap-2 bg-yellow-600/80 hover:bg-yellow-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-lg"
				onclick={() => {
					window.dispatchEvent(new CustomEvent('force-bonus'));
					// alert('Bonus spawned!'); // Optional, maybe too annoying
				}}
			>
				<Sparkles size={16} />
				<span>Force Bonus</span>
			</button>
		</div>
	</div>

	<!-- Import/Export -->
	<div class="bg-white/5 rounded-xl p-3 border border-white/5">
		<h3 class="text-base font-bold mb-3 flex items-center gap-2 text-accent-300">
			<Download size={18} />
			<span>Import / Export</span>
		</h3>
		<div class="grid grid-cols-2 gap-2">
			<button
				class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
				onclick={() => {
					const data = localStorage.getItem(SAVE_KEY);
					if (data) {
						navigator.clipboard.writeText(data);
						alert('Save data copied to clipboard!');
					} else {
						alert('No save data found!');
					}
				}}
			>
				<Download size={16} />
				<span>Export Save</span>
			</button>
			<button
				class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
				onclick={() => {
					const data = prompt('Paste your save data here:');
					if (data) {
						try {
							JSON.parse(data); // Validate JSON
							localStorage.setItem(SAVE_KEY, data);
							location.reload();
						} catch (e) {
							alert('Invalid save data!');
						}
					}
				}}
			>
				<Upload size={16} />
				<span>Import Save</span>
			</button>
		</div>
	</div>
</div>
