<script lang="ts">
	import {CURRENCIES, type CurrencyName} from '$data/currencies';

	export let name: CurrencyName;
	export let icon: boolean = true;
	let className: string = '';
	export {className as class};

	const currency = CURRENCIES[name];
</script>

{#if icon}
	<img src={`/currencies/${currency.icon}.png`} alt={name} class="size-3.5 {className} inline" {...$$restProps} />
{:else}
	<span class="currency">{currency.name}</span>
{/if}
