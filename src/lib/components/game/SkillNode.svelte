<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import type { SkillUpgrade } from '$lib/types';

	interface SkillNode extends SkillUpgrade {
		available: boolean;
		onClick?: () => void;
		unlocked: boolean;
	}

	let { data, id }: NodeProps = $props();

	// Use $derived to make skillData reactive
	const skillData = $derived(data as unknown as SkillNode);
</script>

<Handle id="{id}-{Position.Bottom}" type="source" position={Position.Bottom} class="hidden-handle" />
<Handle id="{id}-{Position.Bottom}" type="target" position={Position.Bottom} class="hidden-handle" />

<Handle id="{id}-{Position.Top}" type="source" position={Position.Top} class="hidden-handle" />
<Handle id="{id}-{Position.Top}" type="target" position={Position.Top} class="hidden-handle" />

<Handle id="{id}-{Position.Left}" type="source" position={Position.Left} class="hidden-handle" />
<Handle id="{id}-{Position.Left}" type="target" position={Position.Left} class="hidden-handle" />

<Handle id="{id}-{Position.Right}" type="source" position={Position.Right} class="hidden-handle" />
<Handle id="{id}-{Position.Right}" type="target" position={Position.Right} class="hidden-handle" />

<div
	aria-label="Unlock {skillData.name}"
	title="Unlock {skillData.name}"
	class="skill-node"
	class:unlocked={skillData.unlocked}
	class:available={skillData.available}
	onclick={() => skillData.onClick?.()}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			skillData.onClick?.();
		}
	}}
	tabindex="0"
	role="button"
>
	<div class="skill-content">
		<h3>{skillData.name}</h3>
		<p>{skillData.description}</p>
	</div>
</div>

<style>
	.skill-node {
		background: var(--color-accent-800);
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		box-sizing: border-box;
		color: #ccc;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		height: 8rem;
		justify-content: center;
		padding: 1.25rem;
		pointer-events: none;
		transition: all 0.2s;
		width: 16rem;
	}

	.skill-node.available {
		background: #444;
		color: white;
		pointer-events: all;
	}

	.skill-node.available:hover {
		box-shadow: 0 0 10px color-mix(in oklab, var(--color-accent-400), #000 20%);
		background-color: color-mix(in oklab, #444, var(--color-accent-400) 10%);
	}

	.skill-node.unlocked {
		background: var(--color-accent-400);
		color: white;
	}

	.skill-content h3 {
		font-size: 1.2rem;
		margin: 0 0 0.75rem;
	}

	.skill-content p {
		font-size: 0.95rem;
		line-height: 1.4;
		margin: 0;
	}

	:global(.hidden-handle) {
		opacity: 0;
		transform: none;
		inset: 50%;
	}
</style>
