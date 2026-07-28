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
	class="pointer-events-none absolute inset-0 overflow-hidden bg-[#080a0f] {className}"
	style="background-image: linear-gradient(90deg, rgba(3, 5, 9, 0.22), transparent 45%, rgba(3, 5, 9, 0.38)), linear-gradient(120deg, {banner.gradient.join(', ')})"
>
	<div
		class="absolute inset-0 opacity-12 mix-blend-soft-light"
		style="background-image: repeating-linear-gradient(105deg, transparent 0, transparent 12px, rgba(255, 255, 255, 0.18) 13px, transparent 14px)"
	></div>
	<svg class="absolute inset-0 size-full opacity-65 mix-blend-soft-light" viewBox="0 0 240 72" preserveAspectRatio="none" fill="none">
		{#if banner.pattern === 'rays'}
			<!-- Up quark: precise ascending particle trajectories. -->
			<path d="M8 68 62 14m-26 54 54-54M64 68l54-54M92 68l54-54m-26 54 54-54m-26 54 54-54" stroke="white" stroke-width="1.25" opacity=".34" />
			<path d="m52 25 10-11 11 10m35 1 10-11 11 10m35 1 10-11 11 10" stroke="white" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" opacity=".82" />
			<circle cx="42" cy="34" r="2" fill="white" opacity=".6" /><circle cx="136" cy="24" r="1.5" fill="white" opacity=".5" /><circle cx="194" cy="42" r="2" fill="white" opacity=".55" />
		{:else if banner.pattern === 'cells'}
			<!-- Down quark: matter settling into dense lower strata. -->
			<path d="M0 49c26-7 48 7 75 0s48 7 76 0 48 7 89-1M0 60c26-6 48 6 75 0s48 6 76 0 48 6 89-1" stroke="white" stroke-width="1.5" opacity=".38" />
			<path d="M32 8v27m-7-7 7 7 7-7M96 3v35m-7-7 7 7 7-7m57-23v27m-7-7 7 7 7-7m45-25v34m-7-7 7 7 7-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".74" />
			<circle cx="32" cy="8" r="2.5" fill="white" opacity=".62" /><circle cx="96" cy="3" r="2" fill="white" opacity=".5" /><circle cx="160" cy="8" r="2.5" fill="white" opacity=".58" /><circle cx="205" cy="4" r="2" fill="white" opacity=".46" />
		{:else if banner.pattern === 'waves'}
			<!-- Charm quark: elegant paired orbits around a shared core. -->
			<ellipse cx="120" cy="36" rx="84" ry="20" stroke="white" stroke-width="1.5" opacity=".38" transform="rotate(-9 120 36)" />
			<ellipse cx="120" cy="36" rx="84" ry="20" stroke="white" stroke-width="1.5" opacity=".38" transform="rotate(9 120 36)" />
			<path d="M48 36c22-28 50-28 72 0s50 28 72 0c-22-28-50-28-72 0s-50 28-72 0Z" stroke="white" stroke-width="1.75" opacity=".56" />
			<circle cx="120" cy="36" r="4.5" fill="white" opacity=".84" /><circle cx="57" cy="17" r="2.5" fill="white" opacity=".65" /><circle cx="183" cy="55" r="2.5" fill="white" opacity=".65" />
		{:else if banner.pattern === 'constellation'}
			<!-- Strange quark: an asymmetric, unfamiliar particle signature. -->
			<path d="m18 54 38-34 29 19 36-27 26 42 38-31 37 17" stroke="white" stroke-width="1.25" stroke-dasharray="2 4" opacity=".48" />
			<path d="m56 20 65-8 64 11M85 39l62 15 75-14" stroke="white" stroke-width=".75" opacity=".25" />
			<g fill="white"><circle cx="18" cy="54" r="2" opacity=".6" /><circle cx="56" cy="20" r="3.5" /><circle cx="85" cy="39" r="2" opacity=".75" /><circle cx="121" cy="12" r="3" /><circle cx="147" cy="54" r="2.5" opacity=".8" /><circle cx="185" cy="23" r="3.5" /><circle cx="222" cy="40" r="2" opacity=".65" /></g>
		{:else if banner.pattern === 'chevrons'}
			<!-- Top quark: the heaviest quark represented by a restrained crown. -->
			<path d="M45 55 34 20l35 17 21-27 30 25 30-25 21 27 35-17-11 35H45Z" fill="white" opacity=".12" />
			<path d="M45 55 34 20l35 17 21-27 30 25 30-25 21 27 35-17-11 35H45Z" stroke="white" stroke-width="1.75" stroke-linejoin="round" opacity=".68" />
			<path d="M54 62h132" stroke="white" stroke-width="3" stroke-linecap="round" opacity=".48" />
			<circle cx="90" cy="10" r="2.5" fill="white" /><circle cx="150" cy="10" r="2.5" fill="white" />
		{:else if banner.pattern === 'hazard'}
			<!-- Bottom quark: broad descending chevrons with a heavy base. -->
			<path d="m12 8 28 25L68 8m18 0 28 25 28-25m18 0 28 25 28-25" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".42" />
			<path d="m12 31 28 25 28-25m18 0 28 25 28-25m18 0 28 25 28-25" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".72" />
			<path d="M0 66h240" stroke="white" stroke-width="2" opacity=".28" />
		{:else if banner.pattern === 'lattice'}
			<!-- Gluon: flowing exchange lines between the three colour charges. -->
			<path d="M24 36c20-30 42-30 62 0s42 30 62 0 42-30 68 0M24 36c20 30 42 30 62 0s42-30 62 0 42 30 68 0" stroke="white" stroke-width="1.5" opacity=".48" />
			<path d="M24 36h192" stroke="white" stroke-width=".75" stroke-dasharray="3 5" opacity=".28" />
			<circle cx="24" cy="36" r="6" fill="#ef4444" /><circle cx="86" cy="36" r="6" fill="#22c55e" /><circle cx="148" cy="36" r="6" fill="#3b82f6" /><circle cx="216" cy="36" r="6" fill="#ef4444" />
			<g fill="white"><circle cx="24" cy="36" r="2" /><circle cx="86" cy="36" r="2" /><circle cx="148" cy="36" r="2" /><circle cx="216" cy="36" r="2" /></g>
		{:else if banner.pattern === 'rings'}
			<!-- Higgs boson: a field excitation around a dense central mass. -->
			<circle cx="168" cy="36" r="7" fill="white" opacity=".88" /><circle cx="168" cy="36" r="15" stroke="white" stroke-width="1.5" opacity=".72" /><circle cx="168" cy="36" r="27" stroke="white" stroke-width="1.25" opacity=".5" /><circle cx="168" cy="36" r="41" stroke="white" stroke-width="1" opacity=".32" /><circle cx="168" cy="36" r="58" stroke="white" stroke-width=".75" opacity=".18" />
			<path d="M16 36h94m116 0h14" stroke="white" stroke-width="1" stroke-dasharray="2 6" opacity=".38" />
			<circle cx="110" cy="36" r="2.5" fill="white" opacity=".7" /><circle cx="226" cy="36" r="2.5" fill="white" opacity=".7" />
		{:else if banner.pattern === 'aurora'}
			<!-- Neutrino: sparse tracks passing almost untouched through matter. -->
			<path d="M-8 62 72 5m-35 71L132 7m-10 64L246-5" stroke="white" stroke-width="1.25" stroke-dasharray="2 7" stroke-linecap="round" opacity=".72" />
			<path d="M0 19h240M0 51h240" stroke="white" stroke-width=".5" opacity=".14" />
			<circle cx="72" cy="5" r="2.5" fill="white" opacity=".78" /><circle cx="132" cy="7" r="2" fill="white" opacity=".68" /><circle cx="199" cy="22" r="1.5" fill="white" opacity=".62" />
		{:else if banner.pattern === 'stripes'}
			<!-- Hadron jet: two composite particles colliding into fragmented jets. -->
			<path d="M8 36h88m48 0h88" stroke="white" stroke-width="2" opacity=".58" />
			<path d="m96 36 88-28m-88 28 100-12M96 36l88 28m-88-28 100 12" stroke="white" stroke-width="1.5" opacity=".52" />
			<circle cx="96" cy="36" r="7" fill="white" opacity=".84" /><circle cx="82" cy="36" r="5" stroke="white" stroke-width="2" opacity=".55" />
			<g fill="white"><circle cx="152" cy="18" r="2.5" /><circle cx="176" cy="27" r="1.75" /><circle cx="161" cy="53" r="2" /><circle cx="206" cy="56" r="2.5" /><circle cx="216" cy="14" r="1.75" /></g>
		{/if}
	</svg>
	<div class="absolute inset-0 bg-linear-to-b from-white/8 via-transparent to-black/18"></div>
	<div class="absolute inset-x-0 top-0 h-px bg-white/20"></div>
	<div class="absolute inset-x-0 bottom-0 h-px bg-black/50"></div>
</div>
