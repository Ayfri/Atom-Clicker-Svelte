<script lang="ts">
	import ControlRods from '@components/radiation/ControlRods.svelte';
	import MassSpectrometer from '@components/radiation/MassSpectrometer.svelte';
	import RadiationUpgrades from '@components/radiation/RadiationUpgrades.svelte';
	import UnstableNucleus from '@components/radiation/UnstableNucleus.svelte';
	import CurrencyLabel from '@components/ui/CurrencyLabel.svelte';
	import HelpIcon from '@components/ui/HelpIcon.svelte';
	import Value from '@components/ui/Value.svelte';
	import { CurrenciesTypes } from '$data/currencies';
	import { getQuarkShopItem } from '$data/quarkShop';
	import { RealmTypes } from '$data/realms';
	import { currenciesManager } from '$helpers/CurrenciesManager.svelte';
	import { quarksManager } from '$helpers/QuarksManager.svelte';
	import { radiationManager } from '$helpers/RadiationManager.svelte';
	import { Lock, Zap } from '@lucide/svelte';

	let bombardAmount = $state(10);

	const themeAccent = $derived.by(() => {
		const themeId = quarksManager.equippedThemes[RealmTypes.RADIATION];
		return themeId ? getQuarkShopItem(themeId)?.theme?.accent : undefined;
	});
	const electronBalance = $derived(currenciesManager.getAmount(CurrenciesTypes.ELECTRONS));
	const mass = $derived(radiationManager.mass);
	const cpm = $derived(radiationManager.currentCpm);
	const multiplier = $derived(radiationManager.radiationMultiplier);
	const controlLevel = $derived(radiationManager.controlRodLevel);

	// Mass that will be added (for preview)
	const massToAdd = $derived(bombardAmount * 0.1);

	// Progressive unlock stages
	const hasBombarded = $derived(radiationManager.unlocked);
	const hasMass = $derived(mass > 0);
	const hasRaisedPower = $derived(controlLevel > 0 || Object.keys(radiationManager.upgradeLevels).length > 0);
	const hasCpm = $derived(cpm > 0);
	const hasGoodCpm = $derived(cpm >= 10 || Object.keys(radiationManager.upgradeLevels).length > 0);

	function handleBombard() {
		if (!radiationManager.unlocked) {
			radiationManager.unlock();
		}
		radiationManager.bombardCore(bombardAmount);
	}
</script>

<div class="relative pt-20 lg:pt-12 min-h-screen">
	<!-- Ambient glow -->
	{#if mass > 0}
		<div class="fixed inset-0 -z-50 pointer-events-none overflow-hidden">
			<div
				class="absolute h-100 -left-20 rounded-full top-[20%] w-100"
				style="background: radial-gradient(circle, rgba(57, 255, 20, {0.05 + controlLevel * 0.1}) 0%, transparent 60%);"
			></div>
		</div>
	{/if}

	<div class="flex flex-col lg:flex-row px-3 lg:px-6 pt-4 pb-6 max-w-375 mx-auto gap-5">
		<!-- Left: Nucleus + Add Fuel -->
		<div class="lg:w-[42%] flex flex-col items-center gap-4">
			<!-- Nucleus container with fixed size -->
			<div class="w-full max-w-105 lg:max-w-120 aspect-square shrink-0">
				<UnstableNucleus />
			</div>

			<!-- Add Fuel Panel -->
			<div class="w-full max-w-sm bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
				<h3 class="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
					<Zap class="w-4 h-4" />
					Add Fuel
					<HelpIcon position="top">
						{#snippet content()}
							<div class="text-left text-xs">
								<p class="font-semibold text-green-400 mb-1">How it works:</p>
								<p class="text-white/70">
									1. Add fuel (<CurrencyLabel name={CurrenciesTypes.ELECTRONS} size={12} /> = mass)
								</p>
								<p class="text-white/70">2. Raise power level</p>
								<p class="text-white/70">3. Get production multiplier!</p>
								<p class="text-white/50 mt-2">Higher power = more bonus but burns fuel faster</p>
							</div>
						{/snippet}
					</HelpIcon>
				</h3>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between text-xs">
						<span class="text-white/50">Available:</span>
						<Value
							class="text-green-400"
							value={electronBalance}
							currency={CurrenciesTypes.ELECTRONS}
						/>
					</div>
					<input
						type="range"
						min="1"
						max={Math.max(1, Math.floor(electronBalance))}
						bind:value={bombardAmount}
						class="w-full accent-green-500"
					/>
					<div class="flex items-center justify-between text-xs">
						<span class="text-white/50">Amount:</span>
						<span class="text-green-400 font-mono"
							>{bombardAmount} <span class="text-white/30">(+{massToAdd.toFixed(1)}u)</span></span
						>
					</div>
					<button
						onclick={handleBombard}
						disabled={electronBalance < bombardAmount}
						class="w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all
							{electronBalance >= bombardAmount ?
							'text-white cursor-pointer hover:brightness-110'
						:	'bg-white/10 text-white/40 cursor-not-allowed'}"
						style={electronBalance >= bombardAmount ? `background-color: ${themeAccent ?? '#16a34a'};` : ''}
					>
						Add Fuel
					</button>
				</div>
			</div>
		</div>

		<!-- Right: Controls & Stats -->
		<div class="lg:w-[58%] flex flex-col gap-3">
			<!-- Multiplier (always visible after first use) -->
			{#if hasBombarded}
				<div class="bg-linear-to-r from-green-500/10 to-transparent backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-semibold text-green-400">Production Bonus</h3>
							<p class="text-xs text-white/40">From radiation</p>
						</div>
						<div class="text-right">
							<div class="text-3xl font-mono font-bold text-green-400">x{multiplier.toFixed(2)}</div>
							{#if cpm > 0}
								<div class="text-xs text-white/50">{cpm.toFixed(0)} CPM</div>
							{:else if mass > 0}
								<div class="text-xs text-yellow-400/70">Raise power to generate CPM</div>
							{:else}
								<div class="text-xs text-white/30">Add fuel to start</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Step 1: Fuel display with preview -->
			{#if hasMass || hasBombarded}
				<MassSpectrometer previewMass={massToAdd} />
			{/if}

			<!-- Step 2: Power control -->
			{#if hasMass}
				<ControlRods />
				{#if !hasRaisedPower}
					<div class="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/30 text-center">
						<p class="text-yellow-400 text-xs">Raise the power level above 0% to start generating CPM</p>
					</div>
				{/if}
			{:else if hasBombarded}
				<div class="flex items-center justify-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
					<Lock class="w-4 h-4 text-white/30" />
					<span class="text-white/40 text-sm">Add fuel to unlock Power Level</span>
				</div>
			{/if}

			<!-- Step 3: Upgrades -->
			{#if hasGoodCpm}
				<RadiationUpgrades />
			{:else if hasCpm}
				<div class="flex items-center justify-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
					<Lock class="w-4 h-4 text-white/30" />
					<span class="text-white/40 text-sm">Reach 10 CPM to unlock upgrades ({cpm.toFixed(0)}/10)</span>
				</div>
			{/if}
		</div>
	</div>
</div>
