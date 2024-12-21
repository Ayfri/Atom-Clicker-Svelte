<script lang="ts">
	import { playerLevel, currentLevelXP, nextLevelXP, xpProgress } from '$lib/stores/gameStore';
	import { formatNumber } from '$lib/utils';
</script>

<div class="levels-container">
	<div class="level-info">
		<span class="level">Level {$playerLevel}</span>
		<span class="xp-text">{formatNumber($currentLevelXP, 0)} / {formatNumber($nextLevelXP, 0)} XP</span>
	</div>
	<div class="xp-bar-container">
		<div class="xp-bar" style="width: {$xpProgress}%"></div>
	</div>
</div>

<style>
	.levels-container {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		left: 50%;
		padding: 0.5rem;
		position: fixed;
		transform: translateX(-50%);
		top: 0;
		width: 60vw;
		z-index: 10;

		@media (width < 768px) {
			padding: 0;
			width: 100%;
		}
	}

	.level-info {
		align-items: center;
		display: flex;
		font-size: 0.875rem;
		justify-content: space-between;
		padding: 0 0.5rem;
	}

	.level {
		font-weight: bold;
		color: var(--accent-color);
	}

	.xp-text {
		color: #d1d1d1;
	}

	.xp-bar-container {
		background: #4a4a4a;
		border-radius: 9999px;
		height: 0.5rem;
		overflow: hidden;
		width: 100%;
	}

	.xp-bar {
		background: var(--accent-color);
		height: 100%;
		transition: all 300ms ease-out;
	}

	@media (width < 768px) {
		.levels-container {
			flex-direction: column-reverse;
		}

		.xp-bar-container {
			border-radius: 0;
		}
	}
</style>
