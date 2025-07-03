<script lang="ts">
	import {gameManager} from '$helpers/gameManager';
	import {ACHIEVEMENTS} from '$data/achievements';
	import {achievements} from '$stores/gameStore';

	$: unlockedAchievements = Object.entries(ACHIEVEMENTS).map(([name, achievement]) => ({
		...achievement,
		unlocked: $achievements.includes(name),
	}));
</script>

<div class="achievements">
	<h2>Achievements ({$achievements.length}/{Object.keys(ACHIEVEMENTS).length})</h2>
	<div class="achievement-grid">
		{#each unlockedAchievements as achievement}
			{@const hidden = achievement.hiddenCondition?.(gameManager.getCurrentState()) === true}
			<div class="achievement" class:locked={!achievement.unlocked}>
				<!-- <div class="icon">{achievement.icon}</div> -->
				<div class="info">
					<h3>{hidden && !achievement.unlocked ? '???' : achievement.name}</h3>
					<p>{hidden && !achievement.unlocked ? '???' : achievement.description}</p>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.achievements {
		background: rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(3px);
		border-radius: 8px;
		padding: 1rem;
	}

	.achievement-grid {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;
		max-height: 50rem;
		overflow-y: auto;
		scrollbar-width: none;
	}

	.achievement {
		align-items: center;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		display: flex;
		gap: 1rem;
		padding: 0.75rem;
		transition: all 0.2s;

		&.locked {
			cursor: not-allowed;
			opacity: 0.5;
		}

		&:not(.locked) {
			background: #486f9b;
		}
	}

	.info h3 {
		font-size: 1rem;
		margin: 0;
	}

	.info p {
		font-size: 0.8rem;
		margin: 0.25rem 0 0;
		opacity: 0.8;
	}
</style>
