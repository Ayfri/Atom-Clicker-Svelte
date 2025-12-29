<script lang="ts">
	import type { SvelteHTMLElements } from 'svelte/elements';
	import {CURRENCIES, type CurrencyName} from '$data/currencies';
	import AtomIcon from '@components/icons/Atom.svelte';
	import ElectronIcon from '@components/icons/Electron.svelte';
	import ProtonIcon from '@components/icons/Proton.svelte';
	import PhotonIcon from '@components/icons/Photon.svelte';

	type SvgProps = SvelteHTMLElements['svg'];

	interface Props extends SvgProps {
		color?: string;
		class?: string;
		icon?: boolean;
		name: CurrencyName;
	}

	let { name, icon = true, class: className = '', ...rest }: Props = $props();

	const currency = $derived(CURRENCIES[name]);
</script>

{#if icon}
	{#if currency.icon === 'atom'}
		<AtomIcon class="inline {className}" color={currency.color} {...rest} />
	{:else if currency.icon === 'electron'}
		<ElectronIcon class="inline {className}" color={currency.color} {...rest} />
	{:else if currency.icon === 'proton'}
		<ProtonIcon class="inline {className}" color={currency.color} {...rest} />
	{:else if currency.icon === 'photon'}
		<PhotonIcon class="inline {className}" color={currency.color} {...rest} />
	{/if}
{:else}
	<span class="currency">{currency.name}</span>
{/if}
