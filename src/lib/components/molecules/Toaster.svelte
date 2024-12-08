<script lang="ts">
	import {removeToast, toasts} from '$stores/toasts';
	import {fade} from 'svelte/transition';
</script>

<div class="toaster">
	{#each $toasts as toast}
		<div class="toast" class:type={toast.type} transition:fade={{duration: 400}}>
			<div class="top">
				<h3>{toast.title}</h3>
				<button class="close" on:click={() => removeToast(toast.id)}>
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
						<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
					</svg>
				</button>
			</div>
			<p>{@html toast.message}</p>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 100;
	}

	.toast {
		background: #333;
		border-radius: 8px;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
		color: white;
		margin-bottom: 1rem;
		padding: 1rem;
		position: relative;
	}

	.top {
		align-items: start;
		display: flex;
		gap: 1rem;
		justify-content: space-between;
	}

	h3 {
		margin: 0 0 0.5rem;
		font-size: 1.05rem;
		line-height: 0.85;
	}

	p {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.close {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.75);
		cursor: pointer;
		vertical-align: center;
		padding: 0.375rem;
		font-weight: lighter;
		height: 2rem;
		width: 2rem;
		margin: -0.5rem -0.5rem 1rem 0;

		& svg {
			height: 0.75rem;
			width: 0.75rem;
		}

		&:hover {
			background: rgba(255, 255, 255, 0.1);
		}

		&:focus {
			outline: none;
		}
	}
</style>
