<script lang="ts">
	import {capitalize, formatNumber} from '$lib/utils';
	import {auth} from '$stores/auth';
	import {leaderboard} from '$stores/leaderboard';
	import {startDate} from '$stores/gameStore';
	import Login, {getAuthConnection} from '@components/organisms/Login.svelte';
	import {Info, LogOut, X, Edit2, Save} from 'lucide-svelte';
	import {onDestroy, onMount} from 'svelte';
	import {fade, fly} from 'svelte/transition';
	import type { LeaderboardEntry } from '$lib/types/leaderboard';

	function getDisplayUsername(user: LeaderboardEntry | undefined): string {
		return user?.user_metadata?.username ??
			user?.username ??
			'Anonymous';
	}

	export let onClose: () => void;
	let refreshInterval: ReturnType<typeof setInterval>;
	let showLoginModal = false;
	let isEditingUsername = false;
	let newUsername = '';
	let editError: string | null = null;

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
	$: currentUserEntry = $leaderboard.find(entry => entry.userId === currentUserId);
	$: username = getDisplayUsername(currentUserEntry);
	$: userRank = $leaderboard.findIndex(entry => entry.userId === currentUserId) + 1;

	async function handleUsernameUpdate() {
		if (!$auth.auth0Client || !newUsername) return;

		try {
			await auth.updateUserMetadata({
				username: newUsername
			});

			isEditingUsername = false;
			editError = null;

			await leaderboard.fetchLeaderboard();
		} catch (error) {
			editError = 'Failed to update username. Please try again.';
			console.error('Error updating username:', error);
		}
	}

	function startEditing() {
		newUsername = getDisplayUsername(currentUserEntry);
		isEditingUsername = true;
	}
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
				{@const authConnection = getAuthConnection($auth.provider)}

				<div class="mb-4 rounded-lg bg-black/20 p-6">
					<div class="flex items-center gap-6">
						<div class="relative">
							{#if $auth.user?.picture}
								<img
									src={$auth.user.picture}
									alt={username}
									class="size-16 rounded-full object-cover ring-2 ring-accent ring-offset-2 ring-offset-accent-900"
								/>
							{:else}
								<div
									class="size-16 rounded-full bg-accent-400/30 flex items-center justify-center text-xl font-bold ring-2 ring-accent ring-offset-2 ring-offset-accent-900"
								>
									{username[0].toUpperCase()}
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
									{#if isEditingUsername}
										<form
											on:submit|preventDefault={handleUsernameUpdate}
											class="flex items-center gap-2"
										>
											<input
												type="text"
												bind:value={newUsername}
												class="bg-black/20 rounded px-2 py-1 text-white border border-accent/50 focus:border-accent outline-none"
												placeholder="Enter new username"
												maxlength="30"
												minlength="3"
											/>
											<button
												type="submit"
												class="text-accent hover:text-accent-400 transition-colors"
												title="Save username"
											>
												<Save class="size-4" />
											</button>
											<button
												type="button"
												on:click={() => {
													isEditingUsername = false;
													editError = null;
												}}
												class="text-white/60 hover:text-white transition-colors"
												title="Cancel"
											>
												Cancel
											</button>
										</form>
									{:else}
										<div class="font-bold text-white text-lg capitalize">
											{username}
											<button
												on:click={startEditing}
												class="ml-2 text-accent/60 hover:text-accent inline-flex items-center transition-colors"
												title="Edit username"
											>
												<Edit2 class="size-4" />
											</button>
										</div>
									{/if}
									{#if authConnection}
										<img
											class="size-4 align-middle"
											src={authConnection.icon}
											alt={authConnection.name}
											title="Connected with {capitalize(authConnection.name)}"
										/>
									{/if}
								</div>
								<button
									on:click={() => auth.logout()}
									class="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition-colors"
									title="Log out"
								>
									<LogOut class="size-5"/>
								</button>
							</div>
							{#if editError}
								<div class="text-red-500 text-sm mt-1" transition:fade>
									{editError}
								</div>
							{/if}
							<div class="text-sm text-white/60 mt-1">
								Playing since {formatStartDate($startDate)}
							</div>
						</div>
					</div>
				</div>

				<div class="mb-4 rounded-lg bg-black/40 p-4 text-sm text-white/80">
					<div class="flex items-start gap-2">
						<Info class="mt-0.5 size-4 shrink-0 text-accent" />
						<p>
							Changes to your score and username are stored immediately, but the leaderboard updates every 5 minutes to ensure smooth performance. Your latest changes will be visible in the next refresh.
						</p>
					</div>
				</div>
			{/if}

			<hr class="border-white/10 mt-4 mb-8"/>

			<div class="flex flex-col gap-4">
				{#each $leaderboard as entry, i}
					{@const isCurrentUser = entry.self === true}
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
									alt={getDisplayUsername(entry)}
									class="size-10 rounded-full object-cover"
								/>
							{:else}
								<div
									class="size-10 rounded-full bg-accent-400/30 flex items-center justify-center text-sm font-bold"
								>
									{(getDisplayUsername(entry))[0].toUpperCase()}
								</div>
							{/if}
							<div>
								<div class="font-bold capitalize text-white">
									{getDisplayUsername(entry)}
								</div>
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
