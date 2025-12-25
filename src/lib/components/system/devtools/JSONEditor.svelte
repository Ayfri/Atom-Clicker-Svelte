<script lang="ts">
	import { Edit2, Save, X, Copy, Check } from 'lucide-svelte';

	let { value = $bindable(), onSave }: { value: unknown; onSave?: (newValue: unknown) => void } = $props();

	let isEditing = $state(false);
	let editText = $state('');
	let error = $state('');
	let copied = $state(false);

	function startEdit() {
		editText = JSON.stringify(value, null, 2);
		error = '';
		isEditing = true;
	}

	function cancelEdit() {
		isEditing = false;
		editText = '';
		error = '';
	}

	function saveEdit() {
		try {
			const parsed = JSON.parse(editText);
			value = parsed;
			onSave?.(parsed);
			isEditing = false;
			error = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON format';
		}
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(JSON.stringify(value, null, 2));
		copied = true;
		setTimeout(() => copied = false, 2000);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.ctrlKey && e.key === 'Enter') {
			saveEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	}
</script>

{#if !isEditing}
	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between gap-2">
			<pre class="flex-1 bg-accent-900/40 border border-white/10 px-3 py-2 rounded-lg text-xs font-mono overflow-auto max-h-40 text-white/80">{JSON.stringify(value, null, 2)}</pre>
			<div class="flex gap-2">
				<button
					class="flex items-center gap-1.5 bg-accent-700/50 hover:bg-accent-600/50 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border border-accent-600/30 hover:border-accent-500/50"
					onclick={copyToClipboard}
					title="Copy JSON"
				>
					{#if copied}
						<Check size={14} class="text-green-400" />
					{:else}
						<Copy size={14} />
					{/if}
				</button>
				<button
					class="flex items-center gap-1.5 bg-accent-700/50 hover:bg-accent-600/50 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border border-accent-600/30 hover:border-accent-500/50"
					onclick={startEdit}
					title="Edit JSON"
				>
					<Edit2 size={14} />
					<span>Edit</span>
				</button>
			</div>
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-2">
		<textarea
			class="w-full bg-accent-900/40 border border-white/10 px-3 py-2 rounded-lg text-xs font-mono resize-none text-white/90 focus:border-accent-500/50 focus:outline-none transition-colors"
			rows={15}
			bind:value={editText}
			onkeydown={handleKeyDown}
			placeholder="Enter valid JSON..."
		></textarea>
		{#if error}
			<div class="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
				<strong>Error:</strong> {error}
			</div>
		{/if}
		<div class="flex gap-2">
			<button
				class="flex-1 flex items-center justify-center gap-1.5 bg-green-600/80 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer shadow-lg"
				onclick={saveEdit}
			>
				<Save size={16} />
				<span>Save (Ctrl+Enter)</span>
			</button>
			<button
				class="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
				onclick={cancelEdit}
			>
				<X size={16} />
				<span>Cancel (Esc)</span>
			</button>
		</div>
		<div class="text-xs text-white/40 text-center">
			Tip: Use Ctrl+Enter to save, Esc to cancel
		</div>
	</div>
{/if}
