<script lang="ts">
	import Modal from '@components/ui/Modal.svelte';

	export let onClose: () => void;
</script>

<Modal {onClose} title="Feedback" containerClass="m-2 !p-0 rounded-xl">
	<iframe
		src="https://tally.so/r/mO8OxM"
		width="100%"
		height="100%"
		title="Feedback Form"
	/>
</Modal>
