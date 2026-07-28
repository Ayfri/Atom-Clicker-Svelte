<script lang="ts">
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { QUARK_CHARGE_COLORS } from '$data/quarks';

	type SvgProps = SvelteHTMLElements['svg'];

	interface Props extends SvgProps {
		color?: string;
		size?: number;
	}

	// Unlike every other currency icon, `color` does NOT tint the whole icon: the three
	// circles are fixed to their QCD charge colours, and `color` only tints the bonds
	// (defaulting to a low-opacity white). This keeps the tri-colour identity intact
	// while still honouring the `color` prop signature every other icon exposes.
	let { color = 'rgba(255, 255, 255, 0.4)', size = 48, ...props }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	width={size}
	height={size}
	stroke-linecap="round"
	stroke-linejoin="round"
	{...props}
>
	<g stroke={color} stroke-width="1.5">
		<line x1="12" y1="5" x2="5.5" y2="17" />
		<line x1="12" y1="5" x2="18.5" y2="17" />
		<line x1="5.5" y1="17" x2="18.5" y2="17" />
	</g>

	<circle cx="12" cy="5" r="3.2" fill={QUARK_CHARGE_COLORS.blue} />
	<circle cx="5.5" cy="17" r="3.2" fill={QUARK_CHARGE_COLORS.green} />
	<circle cx="18.5" cy="17" r="3.2" fill={QUARK_CHARGE_COLORS.red} />
</svg>
