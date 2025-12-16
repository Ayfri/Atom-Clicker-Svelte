<script lang="ts">
	import {CURRENCIES, type CurrencyName} from '$data/currencies';

	interface Props {
		class?: string;
		icon?: boolean;
		name: CurrencyName;
		[key: string]: any
	}

	let { name, icon = true, class: className = '', ...rest }: Props = $props();


	const currency = $derived(CURRENCIES[name]);
</script>

{#if icon}
	<img src={`/currencies/${currency.icon}.png`} alt={name} class="size-3.5 {className} object-contain inline" {...rest} />
{:else}
	<span class="currency">{currency.name}</span>
{/if}
