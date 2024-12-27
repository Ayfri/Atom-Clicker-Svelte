<script lang="ts">
	import {CURRENCIES, type CurrencyName} from '$data/currencies';
	import {formatNumber} from '$lib/utils';
	import Currency from '@components/atoms/Currency.svelte';

	export let value: number;
	export let precision: number | undefined = undefined;
	export let postfix: string = '';
	export let prefix: string = '';
	export let currency: CurrencyName | undefined = undefined;
	export let currencyClass = '';

	let currencyObject = currency ? CURRENCIES[currency] : undefined;
</script>

<span title={currencyObject ? currencyObject.name : ''} {...$$restProps}>
	{prefix}{formatNumber(value, precision)}
	{#if currency}
		<Currency name={currency} icon={true} class={currencyClass} />
	{/if}
	{postfix}
</span>
