<script lang="ts">
	export let label: string;
	export let value: string | number;
	export let prefix = '';
	export let suffix = '';
</script>

<div class="flex justify-between items-center rounded-lg bg-black/20 p-3 hover:bg-black/30 transition-colors">
	<span class="text-white/90">{label}</span>
	<span class="font-medium text-accent">{prefix}{value}{suffix}</span>
</div>
