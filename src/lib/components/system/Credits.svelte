<script lang="ts">
	import GitHub from '@components/icons/GitHub.svelte';
	import Discord from '@components/icons/Discord.svelte';
	import { SquareArrowOutUpRight } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { gameManager } from '$helpers/gameManager';
	import { achievements } from '$stores/gameStore';
	import Modal from '@components/ui/Modal.svelte';

	export let onClose: () => void;

	let hiddenAtomClicked = false;

	// Check if achievement is already unlocked
	$: isAlreadyUnlocked = $achievements.includes('hidden_atom_clicked');

	function handleHiddenAtomClick() {
		if (!hiddenAtomClicked && !isAlreadyUnlocked) {
			hiddenAtomClicked = true;
			gameManager.unlockAchievement('hidden_atom_clicked');
		}
	}

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
</script>

<Modal {onClose}>
	<div slot="header" class="flex items-center gap-3 flex-1">
		<h2 class="text-2xl font-bold text-white">Credits</h2>
		{#if !hiddenAtomClicked && !isAlreadyUnlocked}
			<button
				class="opacity-10 hover:opacity-50 transition-opacity duration-1000"
				on:click={handleHiddenAtomClick}
				transition:fade={{ duration: 1000 }}
				aria-label="Hidden secret"
				title="?"
			>
				<img src="/atom.png" alt="Hidden atom" class="size-5" />
			</button>
		{/if}
	</div>

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
</Modal>
