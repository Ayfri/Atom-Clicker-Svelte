<script lang="ts">
	import {CURRENCIES, type CurrencyName} from '$data/currencies';
	import {formatNumber} from '$lib/utils';
	import Currency from '@components/ui/Currency.svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

	type SpanAttributes = SvelteHTMLElements['span'];

	interface Props extends SpanAttributes {
		currency?: CurrencyName | undefined;
		currencyClass?: string;
		postfix?: string;
		precision?: number | undefined;
		prefix?: string;
		value: number;
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

	const currencyObject = $derived(currency ? CURRENCIES[currency] : undefined);
</script>

<span title={currencyObject?.name ?? ''} {...rest}>
	{prefix}{formatNumber(value, precision)}
	{#if currency}
		<Currency name={currency} icon={true} class={currencyClass} />
	{/if}
	{postfix}
</span>
