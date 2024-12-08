<script lang="ts">
	import {atomsPerSecond, atoms, hasBonus} from '$stores/gameStore';
	import {formatNumber} from '$lib/utils';
</script>

<div class="counter" class:bonus={$hasBonus}>
	<div class="atoms">
		<span class="value">{formatNumber($atoms)}</span>
		<span class="label">atoms</span>
	</div>
	<div class="rate">
		<span class="rate-value">{formatNumber($atomsPerSecond)}</span> atoms per second
	</div>
</div>

<style>
	.counter {
		margin-bottom: 2rem;
		text-align: center;
		z-index: 1;

		@media screen and (width <= 900px) {
			margin-bottom: 1rem;

			& .atoms {
				font-size: 2.75rem;
				line-height: 1.35;
				margin-bottom: 0;
			}

			& .rate {
				font-size: 1rem;
			}
		}
	}

	.atoms {
		font-size: 3rem;
		margin-bottom: 0.5rem;
	}

	.value {
		color: #4a90e2;
		font-weight: bold;
		transition: filter 0.2s;
	}

	.label {
		font-size: 1.5rem;
		opacity: 0.8;
	}

	.rate {
		font-size: 1.2rem;
		opacity: 0.8;
	}

	.rate-value {
		font-weight: bold;
		transition: filter 0.2s;
	}

	.bonus {
		& .value {
			filter: drop-shadow(0 0 10px currentColor);
		}

		& .rate {
			opacity: 1;
		}

		& .rate-value {
			filter: drop-shadow(0 0 7px currentColor);
		}
	}
</style>
