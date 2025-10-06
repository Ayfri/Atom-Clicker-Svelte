<script lang="ts">
	interface Props {
		label: string;
		prefix?: string;
		suffix?: string;
		value: string | number;
	}

	let {
		label,
		prefix = '',
		suffix = '',
		value,
	}: Props = $props();
</script>

<div class="flex justify-between items-center rounded-lg bg-black/20 p-3 hover:bg-black/30 transition-colors">
	<span class="text-white/90">{label}</span>
	<span class="font-medium text-accent">{prefix}{value}{suffix}</span>
</div>
