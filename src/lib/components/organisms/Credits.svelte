<script lang="ts">
	import GitHub from '@components/icons/GitHub.svelte';
	import Discord from '@components/icons/Discord.svelte';
	import { ArrowRight, SquareArrowOutUpRight, X } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	export let onClose: () => void;

	const creator = {
		name: 'Ayfri',
		url: 'https://ayfri.com',
		description: 'Visit website',
	};

	const socials = [
		{
			name: 'GitHub',
			url: 'https://github.com/Ayfri/Atom-Clicker-Svelte',
			description: 'View source code',
			icon: GitHub,
		},
		{
			name: 'Discord',
			url: 'https://discord.gg/BySjRNQ9Je',
			description: 'Join our community',
			icon: Discord,
		},
	];

	const technologies = [
		{
			name: 'Svelte 4',
			url: 'https://svelte.dev',
		},
		{
			name: 'Tailwind CSS',
			url: 'https://tailwindcss.com',
		},
		{
			name: 'Lucide Icons',
			url: 'https://lucide.dev',
		},
		{
			name: 'Svelte Flow',
			url: 'https://svelteflow.dev',
		},
	];

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={onKeydown} />

<div class="overlay" on:click={onClose} transition:fade={{ duration: 200 }}>
	<div class="modal bg-gradient-to-br from-accent-900 to-accent-800" on:click|stopPropagation transition:fly={{ y: -100, duration: 300 }}>
		<div class="flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 p-6 sm:px-8">
			<h2 class="flex-1 text-2xl font-bold text-white">Credits</h2>
			<button class="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:*:stroke-[3]" on:click={onClose}>
				<X class="transition-all duration-300" />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-4 sm:p-8">
			<div class="flex flex-col gap-8 md:flex-row md:gap-12">
				<div class="flex-1 flex flex-col gap-6">
					<h3 class="border-b border-accent/50 pb-2 text-lg font-bold text-accent">Created by</h3>
					<div class="flex flex-col gap-4">
						<a
							href={creator.url}
							target="_blank"
							rel="noopener noreferrer"
							class="group flex flex-row items-baseline gap-2 rounded-lg bg-black/20 p-4 transition-colors hover:bg-black/30 w-full"
						>
							<span class="text-lg font-semibold text-white group-hover:text-accent">{creator.name}</span>
							<span class="text-sm text-white/60 flex-1">{creator.description}</span>
							<SquareArrowOutUpRight size={16} />
						</a>

						<h3 class="border-b border-accent/50 pb-2 text-lg font-bold text-accent mt-6">Links</h3>
						<div class="flex flex-col gap-4">
							{#each socials as social}
								<a
									href={social.url}
									target="_blank"
									rel="noopener noreferrer"
									class="group flex items-baseline gap-2 rounded-lg bg-black/20 p-4 transition-colors hover:bg-black/30"
								>
									<svelte:component this={social.icon} class="size-6 self-center mr-1" />
									<span class="text-lg font-semibold text-white group-hover:text-accent">{social.name}</span>
									<span class="text-sm text-white/60 flex-1">{social.description}</span>
									<SquareArrowOutUpRight size={16} />
								</a>
							{/each}
						</div>
					</div>
				</div>

				<div class="flex-1 flex flex-col gap-6">
					<h3 class="border-b border-accent/50 pb-2 text-lg font-bold text-accent">Thanks to</h3>
					<div class="flex flex-col gap-4">
						{#each technologies as tech}
							<a
								href={tech.url}
								target="_blank"
								rel="noopener noreferrer"
								class="group flex items-baseline gap-2 rounded-lg bg-black/20 p-4 transition-colors hover:bg-black/30"
							>
								<span class="text-lg font-semibold text-white group-hover:text-accent">{tech.name}</span>
								<span class="text-sm text-white/60 flex-1">Learn more</span>
								<SquareArrowOutUpRight size={16} />
							</a>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	.overlay {
		@apply fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm;
	}

	.modal {
		@apply flex h-[85vh] w-[85vw] max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl;
	}

	@media (width <= 768px) {
		.modal {
			@apply h-[100dvh] w-screen rounded-none;
		}
	}
</style>
