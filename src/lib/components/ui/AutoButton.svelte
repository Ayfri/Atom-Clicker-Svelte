<script lang="ts">
	export let onClick: (e: MouseEvent) => void;
	export let toggled: boolean = false;
</script>

<button
	class="px-1.5 py-0.5 rounded-sm text-[0.7rem] leading-[0.9rem] font-medium transition-colors duration-200 {toggled ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300' : 'bg-red-500/20 hover:bg-red-500/30 text-red-300'}"
	on:click={onClick}
>
	Auto
</button>
