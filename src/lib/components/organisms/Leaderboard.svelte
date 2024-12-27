<script lang="ts">
	import {formatNumber} from '$lib/utils';
	import {auth} from '$stores/auth';
	import {leaderboard} from '$stores/leaderboard';
	import {startDate} from '$stores/gameStore';
	import Login, {getAuthConnection} from '@components/organisms/Login.svelte';
	import {Info, LogOut, X} from 'lucide-svelte';
	import {onDestroy, onMount} from 'svelte';
	import {fade, fly} from 'svelte/transition';

	export let onClose: () => void;
	let refreshInterval: ReturnType<typeof setInterval>;
	let showLoginModal = false;

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function formatStartDate(timestamp: number) {
		return new Intl.DateTimeFormat('en-us', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(timestamp);
	}

	onMount(() => {
		leaderboard.fetchLeaderboard();
		refreshInterval = setInterval(() => leaderboard.fetchLeaderboard(), 60_000);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});

	$: currentUserId = $auth.user?.sub;
	$: userRank = $leaderboard.findIndex(entry => entry.userId === currentUserId) + 1;
</script>

<svelte:window on:keydown={onKeydown}/>

<div class="overlay" on:click={onClose} transition:fade={{ duration: 200 }}>
	<div
		class="modal bg-gradient-to-br from-accent-900 to-accent-800"
		on:click|stopPropagation
		transition:fly={{ y: -100, duration: 300 }}
	>
		<div
			class="flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 p-6 sm:px-8"
		>
			<div class="flex items-center gap-2">
				<h2 class="flex-1 text-2xl font-bold text-white">Global Leaderboard</h2>
				<div class="group relative">
					<Info size={20} class="cursor-help" />
					<div class="absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-lg bg-black/90 p-3 text-sm text-white/80 shadow-xl group-hover:block">
						Your progress is stored locally and not tied to your account yet. The leaderboard only shows your highest recorded value.
					</div>
				</div>
			</div>
			<button
				class="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:*:stroke-[3]"
				on:click={onClose}
			>
				<X class="transition-all duration-300"/>
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-4 sm:p-8">
			{#if !$auth.isAuthenticated}
				<div class="flex flex-col gap-4 text-center">
					<h3 class="text-lg font-bold text-accent">Login Required</h3>
					<p class="text-white/60">
						Please log in to participate in the global leaderboard.
					</p>
					<button
						on:click={() => showLoginModal = true}
						class="mx-auto rounded-lg bg-accent px-6 py-2 font-semibold text-white transition-colors hover:bg-accent-600"
					>
						Login
					</button>
				</div>
			{:else}
				<div class="mb-8 rounded-lg bg-black/20 p-6">
					<div class="flex items-center gap-6">
						<div class="relative">
							{#if $auth.user?.picture}
								<img
									src={$auth.user.picture}
									alt={$auth.user.name}
									class="size-16 rounded-full object-cover ring-2 ring-accent ring-offset-2 ring-offset-accent-900"
								/>
							{:else}
								<div
									class="size-16 rounded-full bg-accent-400/30 flex items-center justify-center text-xl font-bold ring-2 ring-accent ring-offset-2 ring-offset-accent-900"
								>
									{$auth.user?.name?.[0].toUpperCase()}
								</div>
							{/if}
							{#if userRank > 0}
								<div
									class="absolute -bottom-2 -right-2 flex size-7 items-center justify-center rounded-full bg-accent-600 font-bold text-white ring-2 ring-accent-900"
								>
									#{userRank}
								</div>
							{/if}
						</div>
						<div class="flex-1">
							<div class="mb-1 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="font-bold text-white text-lg capitalize">
										{$auth.user?.name}
									</div>
									<img
										class="size-4 align-middle"
										src={getAuthConnection($auth.provider)?.icon}
										alt={getAuthConnection($auth.provider)?.name}
									/>
								</div>
								<button
									on:click={() => auth.logout()}
									class="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition-colors"
								>
									<LogOut class="size-5"/>
								</button>
							</div>
							<div class="text-sm text-white/60 mt-1">
								Playing since {formatStartDate($startDate)}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<hr class="border-white/10 mt-4 mb-8"/>

			<div class="flex flex-col gap-4">
				{#each $leaderboard as entry, i}
					{@const isCurrentUser = entry.userId === currentUserId && $auth.isAuthenticated}
					<div
						class="flex items-center gap-3 rounded-lg bg-black/20 p-4 transition-colors"
						class:ring-2={isCurrentUser}
						class:ring-accent={isCurrentUser}
						class:ring-offset-2={isCurrentUser}
						class:ring-offset-accent-900={isCurrentUser}
					>
						<div
							class="flex w-6 items-center justify-center rounded-full bg-accent font-bold text-white"
						>
							{i + 1}
						</div>
						<div class="flex items-center gap-3 flex-1">
							{#if entry.picture}
								<img
									src={entry.picture}
									alt={entry.username}
									class="size-10 rounded-full object-cover"
								/>
							{:else}
								<div
									class="size-10 rounded-full bg-accent-400/30 flex items-center justify-center text-sm font-bold"
								>
									{entry.username[0].toUpperCase()}
								</div>
							{/if}
							<div>
								<div class="font-bold capitalize text-white">{entry.username}</div>
								<div class="text-sm text-white/60">Level {entry.level}</div>
							</div>
						</div>
						<div class="text-right">
							<div class="font-bold text-white">
								{formatNumber(entry.atoms)}
							</div>
							<div class="text-sm text-white/60">Atoms</div>
						</div>
					</div>
				{:else}
					<div class="text-center text-white/60">
						No entries yet. Be the first to join the leaderboard!
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

{#if showLoginModal}
	<Login onClose={() => showLoginModal = false}/>
{/if}

<style>
	.overlay {
		align-items: center;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		height: 100vh;
		justify-content: center;
		left: 0;
		position: fixed;
		top: 0;
		width: 100vw;
		z-index: 50;
	}

	.modal {
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		height: 90vh;
		max-width: 800px;
		overflow: hidden;
		position: relative;
		width: 90vw;
	}
</style>
