<script lang="ts">
	import type { BannerDefinition } from '$data/quarkShop';

	interface Props {
		banner: BannerDefinition;
		class?: string;
	}

	let { banner, class: className = '' }: Props = $props();
</script>

<div
	aria-hidden="true"
	class="pointer-events-none absolute inset-0 overflow-hidden {className}"
	style="background: linear-gradient(120deg, {banner.gradient.join(', ')})"
>
	<svg class="absolute inset-0 size-full opacity-60" viewBox="0 0 240 72" preserveAspectRatio="none" fill="none">
		{#if banner.pattern === 'rays'}
			<!-- Up quark: accelerating arrows travelling upward. -->
			<path d="M0 72 68 4m-34 68L102 4m-34 68L136 4m-34 68L170 4m-34 68L204 4m-34 68L238 4" stroke="white" stroke-width="3" opacity=".45" />
			<path d="m54 18 14-14 14 14m20 0 14-14 14 14m20 0 14-14 14 14" stroke="white" stroke-width="3" opacity=".8" />
		{:else if banner.pattern === 'cells'}
			<!-- Down quark: dense layered matter settling downward. -->
			<path d="M0 16c24-8 48 8 72 0s48-8 72 0 48 8 96-2M0 38c24-8 48 8 72 0s48-8 72 0 48 8 96-2M0 60c24-8 48 8 72 0s48-8 72 0 48 8 96-2" stroke="white" stroke-width="2" opacity=".5" />
			<path d="M12 0v72m32-72v72m32-72v72m32-72v72m32-72v72m32-72v72m32-72v72" stroke="white" stroke-width="1" opacity=".22" />
		{:else if banner.pattern === 'waves'}
			<!-- Charm quark: bright orbiting charm traces. -->
			<ellipse cx="66" cy="38" rx="52" ry="18" stroke="white" stroke-width="2" opacity=".5" transform="rotate(-18 66 38)" />
			<ellipse cx="160" cy="34" rx="62" ry="22" stroke="white" stroke-width="2" opacity=".42" transform="rotate(16 160 34)" />
			<circle cx="66" cy="38" r="5" fill="white" opacity=".8" /><circle cx="160" cy="34" r="4" fill="white" opacity=".75" />
		{:else if banner.pattern === 'constellation'}
			<!-- Strange quark: an unfamiliar constellation in deep space. -->
			<path d="m22 54 38-30 34 16 40-28 42 22 38-18" stroke="white" stroke-width="1.5" opacity=".45" />
			<g fill="white"><circle cx="22" cy="54" r="3" /><circle cx="60" cy="24" r="4" /><circle cx="94" cy="40" r="2.5" /><circle cx="134" cy="12" r="4" /><circle cx="176" cy="34" r="3" /><circle cx="214" cy="16" r="3.5" /></g>
		{:else if banner.pattern === 'chevrons'}
			<!-- Top quark: a crown of dominant peaks. -->
			<path d="M0 62 26 14l28 28L82 4l30 38 32-28 28 48H0Z" fill="white" opacity=".25" />
			<path d="M0 62 26 14l28 28L82 4l30 38 32-28 28 48" stroke="white" stroke-width="2.5" opacity=".75" />
		{:else if banner.pattern === 'hazard'}
			<!-- Bottom quark: heavy descending warning chevrons. -->
			<path d="m0 12 20 18L40 12m0 24 20 18 20-18m0-24 20 18 20-18m0 24 20 18 20-18m0-24 20 18 20-18m0 24 20 18 20-18m0-24 20 18 20-18" stroke="white" stroke-width="4" opacity=".58" />
		{:else if banner.pattern === 'lattice'}
			<!-- Gluon: red, green and blue colour charge connections. -->
			<path d="M22 52 82 18l58 36 72-40M22 20l60 34 58-36 72 34" stroke="white" stroke-width="2" opacity=".45" />
			<circle cx="22" cy="52" r="7" fill="#ef4444" /><circle cx="82" cy="18" r="7" fill="#22c55e" /><circle cx="140" cy="54" r="7" fill="#3b82f6" /><circle cx="212" cy="14" r="7" fill="#ef4444" />
		{:else if banner.pattern === 'rings'}
			<!-- Higgs boson: concentric field ripples around a massive core. -->
			<circle cx="172" cy="36" r="10" fill="white" opacity=".9" /><circle cx="172" cy="36" r="22" stroke="white" stroke-width="2" opacity=".65" /><circle cx="172" cy="36" r="36" stroke="white" stroke-width="2" opacity=".42" /><circle cx="172" cy="36" r="52" stroke="white" stroke-width="2" opacity=".22" />
		{:else if banner.pattern === 'aurora'}
			<!-- Neutrino: nearly invisible particle tracks passing through matter. -->
			<path d="M-12 66 76 2m-24 70L140 8m-12 58L252-4" stroke="white" stroke-width="1.5" stroke-dasharray="3 8" opacity=".75" />
			<circle cx="76" cy="2" r="3" fill="white" opacity=".8" /><circle cx="140" cy="8" r="2.5" fill="white" opacity=".75" />
		{:else if banner.pattern === 'stripes'}
			<!-- Hadron jet: a composite collision breaking into fast fragments. -->
			<path d="M18 36h96m-54 0L152 8m-92 28 92 28M114 36l104-20m-104 20 104 20" stroke="white" stroke-width="2.5" opacity=".65" />
			<circle cx="60" cy="36" r="9" fill="white" opacity=".7" /><circle cx="114" cy="36" r="5" fill="white" opacity=".9" />
		{/if}
	</svg>
	<div class="absolute -right-8 top-1/2 size-32 -translate-y-1/2 rounded-full bg-white/25 blur-2xl"></div>
	<div class="absolute inset-x-0 top-0 h-px bg-white/60"></div>
</div>
