<script lang="ts">
	import {CURRENCIES, type CurrencyName} from '$data/currencies';
	import {formatNumber} from '$lib/utils';
	import Currency from '@components/ui/Currency.svelte';

	interface Props {
		currency?: CurrencyName | undefined;
		currencyClass?: string;
		postfix?: string;
		precision?: number | undefined;
		prefix?: string;
		value: number;
		[key: string]: any
	}

	let {
		currency = undefined,
		currencyClass = '',
		postfix = '',
		precision = undefined,
		prefix = '',
		value,
		...rest
	}: Props = $props();

	let currencyObject = currency ? CURRENCIES[currency] : undefined;
</script>

<span title={currencyObject ? currencyObject.name : ''} {...rest}>
	{prefix}{formatNumber(value, precision)}
	{#if currency}
		<Currency name={currency} icon={true} class={currencyClass} />
	{/if}
	{postfix}
</span>
