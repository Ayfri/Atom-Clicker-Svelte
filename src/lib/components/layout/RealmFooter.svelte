<script lang="ts">
	import Discord from '@components/icons/Discord.svelte';
	import GitHub from '@components/icons/GitHub.svelte';
	import { Coffee } from 'lucide-svelte';

	export interface FooterTheme {
		baseClass: string;
		hoverClass: string;
		mutedClass: string;
		mutedHoverClass: string;
	}

	interface Props {
		footerTheme: FooterTheme;
	}

	let { footerTheme }: Props = $props();
</script>

<footer class="px-4 py-2 text-xs {footerTheme.baseClass}">
	<div class="mx-auto max-w-4xl flex flex-col items-center gap-1.5">
		<div class="flex flex-wrap items-center justify-center gap-3">
			<a
				class="group flex items-center gap-1 transition-colors {footerTheme.hoverClass}"
				href="https://discord.gg/BySjRNQ9Je"
				rel="noopener noreferrer"
				target="_blank"
				title="Join our Discord community"
			>
				<Discord class="w-3.5 h-3.5" />
			</a>
			<a
				class="flex items-center gap-1 transition-colors {footerTheme.hoverClass}"
				href="https://github.com/Ayfri/Atom-Clicker-Svelte"
				rel="noopener noreferrer"
				target="_blank"
				title="View source code on GitHub"
			>
				<GitHub class="w-3.5 h-3.5" />
			</a>
			<a
				class="transition-colors {footerTheme.hoverClass}"
				href="https://ayfri.com"
				rel="noopener noreferrer"
				target="_blank"
				title="Visit creator's website"
			>
				ayfri.com
			</a>
			<a
				class="group flex items-center gap-1 rounded-sm bg-yellow-500 px-2 py-0.5 text-black transition-colors hover:bg-yellow-300"
				href="https://buymeacoffee.com/ayfri"
				rel="noopener noreferrer"
				target="_blank"
				title="Support the creator"
			>
				<Coffee class="w-3 h-3 fill-transparent group-hover:fill-black duration-200 transition-all" />
				<span>Buy me a coffee</span>
			</a>
		</div>
		<div class="{footerTheme.mutedClass} text-[0.7rem]">
			Atom Clicker © {new Date().getFullYear()} • Made with ❤️ by
			<a
				href="https://ayfri.com"
				class="transition-colors {footerTheme.mutedHoverClass}"
				target="_blank"
				rel="noopener noreferrer"
			>
				Ayfri
			</a>
		</div>
	</div>
</footer>
