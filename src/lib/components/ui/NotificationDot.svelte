<script lang="ts">
	export let hasNotification = false;
</script>

<span
	class="
		relative
		{
			hasNotification ?
			'after:absolute after:-top-1 after:-right-1 after:size-2 after:bg-accent-400 after:rounded-full after:shadow-[0_0_10px] after:shadow-accent-400 after:animate-pulse' :
			''
		}
	"
	{...$$restProps}
>
	<slot/>
</span>
