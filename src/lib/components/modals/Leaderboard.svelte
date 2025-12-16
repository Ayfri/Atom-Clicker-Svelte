<script lang="ts">
	import Login, {getAuthConnection} from '@components/modals/Login.svelte';
	import Modal from '@components/ui/Modal.svelte';
	import type { LeaderboardEntry } from '$lib/types/leaderboard';
	import {capitalize, formatNumber} from '$lib/utils';
	import {startDate} from '$stores/gameStore';
	import {leaderboard, leaderboardStats, fetchLeaderboard} from '$stores/leaderboard';
	import {supabaseAuth} from '$stores/supabaseAuth';
	import {Info, LogOut, Edit2, Save, Search, Users, Trophy, Medal, Crown} from 'lucide-svelte';
	import {onDestroy, onMount} from 'svelte';
	import {fade} from 'svelte/transition';
	import {VList} from 'virtua/svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	function getDisplayUsername(user: LeaderboardEntry | undefined): string {
		return user?.username || 'Anonymous';
	}

	let editError: string | null = $state(null);
	let isEditingUsername = $state(false);
	let isSavingUsername = $state(false);
	let newUsername = $state('');
	let refreshInterval: ReturnType<typeof setInterval>;
	let searchQuery = $state('');
	let selectedFilter: 'all' | 'top10' | 'top50' | 'top100' = $state('all');
	let showLoginModal = $state(false);

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
		fetchLeaderboard();
		refreshInterval = setInterval(() => fetchLeaderboard(), 60_000);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});

	let currentUserId = $derived($supabaseAuth.user?.id);
	let username = $derived($supabaseAuth.profile?.username || $supabaseAuth.user?.user_metadata?.full_name || $supabaseAuth.user?.user_metadata?.username || $supabaseAuth.user?.email?.split('@')[0] || 'Anonymous');
	let userRank = $derived($leaderboard.findIndex(entry => entry.userId === currentUserId) + 1);
	let stats = $derived($leaderboardStats);

	// Filter and search leaderboard
	let filteredLeaderboard = $derived.by(() => {
		let filtered = [...$leaderboard];

		// Apply search
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(entry =>
				entry.username.toLowerCase().includes(query)
			);
		}

		// Apply filter
		switch (selectedFilter) {
			case 'top10':
				return filtered.slice(0, 10);
			case 'top50':
				return filtered.slice(0, 50);
			case 'top100':
				return filtered.slice(0, 100);
			default:
				return filtered;
		}
	});

	// Calculate user percentile
	let userPercentile = $derived.by(() => {
		if (userRank <= 0 || stats.totalUsers === 0) return null;
		const percentile = ((stats.totalUsers - userRank) / stats.totalUsers) * 100;
		return Math.round(percentile);
	});

	function getRankIcon(rank: number) {
		switch (rank) {
			case 1:
				return Crown;
			case 2:
				return Trophy;
			case 3:
				return Medal;
			default:
				return null;
		}
	}

	function getRankColor(rank: number) {
		switch (rank) {
			case 1:
				return 'text-yellow-400';
			case 2:
				return 'text-gray-300';
			case 3:
				return 'text-amber-600';
			default:
				return 'text-accent';
		}
	}

	function cancelEditing() {
		editError = null;
		isEditingUsername = false;
		isSavingUsername = false;
		newUsername = '';
	}

	async function handleUsernameUpdate(event: SubmitEvent) {
		event.preventDefault();

		// Prevent multiple submissions
		if (isSavingUsername || !$supabaseAuth.supabase) return;

		const trimmedUsername = newUsername.trim();
		if (!trimmedUsername || trimmedUsername === username) {
			cancelEditing();
			return;
		}

		isSavingUsername = true;
		editError = null;

		try {
			await supabaseAuth.updateProfile({ username: trimmedUsername });
			cancelEditing();
			// No need to fetch leaderboard immediately, it will be fetched on next interval
		} catch (error) {
			editError = 'Failed to update username. Please try again.';
			isSavingUsername = false;
		}
	}

	function startEditing() {
		editError = null;
		isEditingUsername = true;
		isSavingUsername = false;
		newUsername = username;
	}
</script>

<Modal {onClose} containerClass="px-6">
	{#snippet header()}
		<div class="flex items-center gap-2">
			<h2 class="flex-1 text-2xl font-bold text-white">Global Leaderboard</h2>
			<div class="flex items-center gap-2 text-sm text-white/60">
				<Users size={16} />
				<span>{stats.totalUsers} players</span>
			</div>
		</div>
	{/snippet}

	{#if !$supabaseAuth.isAuthenticated}
		<div class="flex flex-col gap-2 text-center mb-3">
			<h3 class="text-lg font-bold text-accent">Login Required</h3>
			<p class="text-white/60">
				Please log in to participate in the global leaderboard.
			</p>
			<button
				onclick={() => showLoginModal = true}
				class="mx-auto rounded-lg bg-accent px-6 py-2 font-semibold text-white transition-colors hover:bg-accent-600"
			>
				Login
			</button>
		</div>
	{:else}
		{@const authConnection = getAuthConnection($supabaseAuth.user?.identities?.[0]?.provider)}

		<div class="mb-4 rounded-lg bg-black/20 p-4">
			<div class="flex items-center gap-4">
				<div class="group relative">
					{#if $supabaseAuth.profile?.picture || $supabaseAuth.user?.user_metadata?.avatar_url || $supabaseAuth.user?.user_metadata?.picture}
						<img
							src={$supabaseAuth.profile?.picture || $supabaseAuth.user?.user_metadata?.avatar_url || $supabaseAuth.user?.user_metadata?.picture}
							alt={username}
							class="size-16 rounded-full object-cover ring-2 ring-accent-400 ring-offset-2 ring-offset-accent-900"
						/>
					{:else}
						<div
							class="size-16 rounded-full bg-accent-400/30 flex items-center justify-center text-xl font-bold ring-2 ring-accent-400 ring-offset-2 ring-offset-accent-900"
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
						{#if userPercentile !== null}
							<div class="absolute left-1/2 top-full z-10 mt-2 hidden w-max -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-sm text-white shadow-xl group-hover:block">
								Top {userPercentile}% of all players
							</div>
						{/if}
					{/if}
				</div>
				<div class="flex-1">
					<div class="mb-1 flex items-center justify-between">
						<div class="flex items-center gap-2">
							{#if isEditingUsername}
								<form
									onsubmit={handleUsernameUpdate}
									class="flex items-center gap-2"
								>
									<!-- svelte-ignore a11y_autofocus -->
									<input
										type="text"
										bind:value={newUsername}
										disabled={isSavingUsername}
										class="bg-black/20 rounded-sm px-2 py-1 text-white border border-accent/50 focus:border-accent outline-hidden disabled:opacity-50 disabled:cursor-not-allowed"
										placeholder="Enter new username"
										maxlength="30"
										minlength="3"
										autofocus
									/>
									<button
										type="submit"
										disabled={isSavingUsername || !newUsername.trim()}
										class="text-accent hover:text-accent-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										title="Save username"
									>
										<Save class="size-4" />
									</button>
									<button
										type="button"
										onclick={cancelEditing}
										disabled={isSavingUsername}
										class="text-white/60 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										title="Cancel"
									>
										Cancel
									</button>
								</form>
							{:else}
								<div class="font-bold text-white text-lg capitalize">
									{username}
									<button
										onclick={startEditing}
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
							onclick={() => supabaseAuth.signOut()}
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
	{/if}

	<!-- Search and Filters -->
	<div class="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search players..."
				class="w-full rounded-lg bg-black/20 border border-white/10 py-2 pl-10 pr-4 text-white placeholder-white/40 outline-hidden focus:border-accent/50 transition-colors"
			/>
		</div>
		<div class="flex gap-2">
			<button
				onclick={() => selectedFilter = 'all'}
				class={selectedFilter === 'all'
					? 'rounded-lg px-4 py-2 text-sm font-medium transition-all bg-accent text-white'
					: 'rounded-lg px-4 py-2 text-sm font-medium transition-all bg-black/20 text-white/60 hover:bg-black/30'}
			>
				All
			</button>
			<button
				onclick={() => selectedFilter = 'top10'}
				class={selectedFilter === 'top10'
					? 'rounded-lg px-4 py-2 text-sm font-medium transition-all bg-accent text-white'
					: 'rounded-lg px-4 py-2 text-sm font-medium transition-all bg-black/20 text-white/60 hover:bg-black/30'}
			>
				Top 10
			</button>
			<button
				onclick={() => selectedFilter = 'top50'}
				class={selectedFilter === 'top50'
					? 'rounded-lg px-4 py-2 text-sm font-medium transition-all bg-accent text-white'
					: 'rounded-lg px-4 py-2 text-sm font-medium transition-all bg-black/20 text-white/60 hover:bg-black/30'}
			>
				Top 50
			</button>
			<button
				onclick={() => selectedFilter = 'top100'}
				class={selectedFilter === 'top100'
					? 'rounded-lg px-4 py-2 text-sm font-medium transition-all bg-accent text-white'
					: 'rounded-lg px-4 py-2 text-sm font-medium transition-all bg-black/20 text-white/60 hover:bg-black/30'}
			>
				Top 100
			</button>
		</div>
	</div>

	{#if searchQuery.trim() && filteredLeaderboard.length > 0 && filteredLeaderboard.length < $leaderboard.length}
		<div class="mb-4 text-center text-sm text-white/60">
			Found {filteredLeaderboard.length} of {$leaderboard.length} players
		</div>
	{/if}

	{#if filteredLeaderboard.length > 0}
		<VList
			data={filteredLeaderboard}
			style="height: 72.5%;"
		>
			{#snippet children(entry: LeaderboardEntry, index: number)}
				{@const isCurrentUser = entry.self === true}
				{@const RankIcon = getRankIcon(entry.rank)}
				{@const rankColor = getRankColor(entry.rank)}
				{@const userClass = isCurrentUser
					? 'flex items-center gap-3 rounded-lg p-4 transition-all hover:scale-[1.02] bg-linear-to-r from-accent/20 via-accent/10 to-transparent ring-2 ring-accent-400'
					: 'flex items-center gap-3 rounded-lg p-4 transition-all hover:scale-[1.02] bg-black/20'}
				{@const borderClass = entry.rank === 1
					? 'border border-yellow-400/30'
					: entry.rank === 2
						? 'border border-gray-300/30'
						: entry.rank === 3
							? 'border border-amber-600/30'
							: ''}

				{@const isHundredth = (index + 1) % 100 === 0 && (filteredLeaderboard.length !== index + 1)}
				<div class="px-3 py-1" class:pb-8={isHundredth}>
					<div class="{userClass} {borderClass}">
						<div class="flex items-center gap-2">
							{#if RankIcon}
								{@const Icon = RankIcon}
								<Icon class="size-6 {rankColor}" />
							{:else}
								<div class="flex size-7 items-center justify-center rounded-full bg-accent/30 font-bold text-white text-sm">
									{entry.rank}
								</div>
							{/if}
						</div>
						<div class="flex items-center gap-3 flex-1">
							{#if entry.picture}
								<img
									src={entry.picture}
									alt={getDisplayUsername(entry)}
									class="size-10 rounded-full object-cover"
								/>
							{:else}
								<div class="size-10 rounded-full bg-accent-400/30 flex items-center justify-center text-sm font-bold">
									{(getDisplayUsername(entry))[0].toUpperCase()}
								</div>
							{/if}
							<div>
								<div class="font-bold capitalize text-white">
									{getDisplayUsername(entry)}
								</div>
								<div class="text-sm text-white/60">
									Level {entry.level}
									{#if entry.lastUpdated}
										{@const daysAgo = Math.round((entry.lastUpdated - Date.now()) / (1000 * 60 * 60 * 24))}
										{@const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(daysAgo, 'day')}
										<span title="Last time played">
											· {relativeTime}
										</span>
									{/if}
								</div>
							</div>
						</div>
						<div class="text-right">
							<div class="font-bold text-white">
								{formatNumber(entry.atoms)}
							</div>
							<div class="text-sm text-white/60">Atoms</div>
						</div>
					</div>
				</div>
			{/snippet}
		</VList>
	{:else}
		<div class="text-center py-8 text-white/60">
			{#if searchQuery.trim()}
				<Search class="mx-auto mb-2 size-8 text-white/40" />
				<p>No players found matching "{searchQuery}"</p>
			{:else}
				<Users class="mx-auto mb-2 size-8 text-white/40" />
				<p>No entries yet. Be the first to join the leaderboard!</p>
			{/if}
		</div>
	{/if}
</Modal>

{#if showLoginModal}
	<Login onClose={() => showLoginModal = false}/>
{/if}
