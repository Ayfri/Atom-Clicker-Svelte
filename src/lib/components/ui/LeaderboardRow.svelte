<script lang="ts">
	import Avatar from '@components/ui/Avatar.svelte';
	import LeaderboardBannerBackdrop from '@components/ui/LeaderboardBannerBackdrop.svelte';
	import { getQuarkShopItem, type BannerDefinition } from '$data/quarkShop';
	import { quarksManager } from '$helpers/QuarksManager.svelte';
	import type { LeaderboardEntry } from '$lib/types/leaderboard';
	import { formatNumber } from '$lib/utils';
	import { Crown, Medal, Trophy } from '@lucide/svelte';

	interface Props {
		entry: LeaderboardEntry;
	}

	let { entry }: Props = $props();

	function getBanner(entry: LeaderboardEntry): BannerDefinition | null {
		const bannerId = entry.self ? quarksManager.equippedBanner : entry.equippedBanner;
		if (!bannerId) return null;
		const item = getQuarkShopItem(bannerId);
		return item?.type === 'banner' && item.banner ? item.banner : null;
	}

	function getDisplayUsername(entry: LeaderboardEntry): string {
		return entry.username || 'Anonymous';
	}

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

	let isCurrentUser = $derived(entry.self === true);
	let banner = $derived(getBanner(entry));
	let RankIcon = $derived(getRankIcon(entry.rank));
	let rankColor = $derived(getRankColor(entry.rank));
	let userClass = $derived(isCurrentUser
		? 'flex items-center gap-3 rounded-lg p-4 transition-all hover:scale-[1.02] bg-linear-to-r from-accent/20 via-accent/10 to-transparent ring-2 ring-accent-400'
		: 'flex items-center gap-3 rounded-lg p-4 transition-all hover:scale-[1.02] bg-black/20');
	let borderClass = $derived(entry.rank === 1
		? 'border border-yellow-400/30'
		: entry.rank === 2
			? 'border border-gray-300/30'
			: entry.rank === 3
				? 'border border-amber-600/30'
				: '');
</script>

<div class="{userClass} {borderClass} relative isolate overflow-hidden">
	{#if banner}
		<LeaderboardBannerBackdrop {banner} />
	{/if}
	<div class="relative z-10 flex items-center gap-2">
		{#if RankIcon}
			<RankIcon size={24} class={rankColor} />
		{:else}
			<div class="flex size-7 items-center justify-center rounded-full bg-accent/30 text-sm font-bold text-white">
				{entry.rank}
			</div>
		{/if}
	</div>
	<div class="relative z-10 flex flex-1 items-center gap-3">
		<Avatar alt={getDisplayUsername(entry)} class="size-10 text-sm" src={entry.picture} />
		<div>
			<div class="flex items-center gap-2 font-bold capitalize text-white">
				{getDisplayUsername(entry)}
				{#if entry.is_online}
					<div class="size-2 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Online"></div>
				{/if}
			</div>
			<div class="text-sm text-white/60">
				Level {entry.level}
				{#if entry.lastUpdated}
					{@const daysAgo = Math.round((entry.lastUpdated - Date.now()) / (1000 * 60 * 60 * 24))}
					{@const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(daysAgo, 'day')}
					<span title="Last time played">· {relativeTime}</span>
				{/if}
			</div>
		</div>
	</div>
	<div class="relative z-10 text-right">
		<div class="font-bold text-white">{formatNumber(entry.atoms)}</div>
		<div class="text-sm text-white/60">Atoms</div>
	</div>
</div>
