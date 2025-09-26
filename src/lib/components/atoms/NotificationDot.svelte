<script lang="ts">
	export let hasNotification = false;
</script>

<span class="dot-icon" on:click class:has-notification={hasNotification} {...$$restProps}>
	<slot/>
</span>

<style>
	.has-notification {
		position: relative;
	}

	.has-notification::after {
		animation: pulse 1s infinite;
		background: var(--color-accent-400);
		border-radius: 50%;
		box-shadow: 0 0 10px var(--color-accent-400);
		content: '';
		height: 0.5rem;
		position: absolute;
		right: -0.25rem;
		top: -0.25rem;
		width: 0.5rem;
	}
</style>
