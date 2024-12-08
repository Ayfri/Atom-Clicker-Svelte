<script lang="ts">
	import '@xyflow/svelte/dist/style.css';
	import { X } from 'lucide-svelte';
	import {mobile} from '$stores/window';
	import {onDestroy, onMount} from 'svelte';
	import { SKILL_UPGRADES } from '$data/skillTree';
	import { gameManager } from '$helpers/gameManager';
	import {skillPointsAvailable, skillUpgrades} from '$stores/gameStore';
	import type { SkillUpgrade } from '$lib/types';
	import { fade, fly } from 'svelte/transition';
	import { SvelteFlow, Background, Controls, type Node, type Edge, Position } from '@xyflow/svelte';
	import {writable} from 'svelte/store';
	import SkillNode from './SkillNode.svelte';

	export let onClose: () => void;

	const nodeTypes = {
		skill: SkillNode,
	};

	let nodes = writable<Node[]>([]);
	let edges = writable<Edge[]>([]);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	// Skill management
	function canUnlockSkill(skill: SkillUpgrade): boolean {
		if (!$skillUpgrades) return false;
		if ($skillUpgrades.includes(skill.id)) return false;
		if ($skillPointsAvailable < 1) return false;

		if (skill.condition !== undefined && !skill.condition(gameManager.getCurrentState())) return false;
		return skill.requires?.every((req) => $skillUpgrades?.includes(req)) ?? true;
	}

	function unlockSkill(skill: SkillUpgrade) {
		if (!canUnlockSkill(skill)) return;
		skillUpgrades.update((skills) => [...(skills ?? []), skill.id]);
	}

	let interval: number;
	onMount(() => {
		updateTree();
		interval = setInterval(() => updateTree(), 300);
	});

	onDestroy(() => clearInterval(interval));

	function updateTree() {
		// Convert skills to nodes
		$nodes = Object.values(SKILL_UPGRADES).map((skill) => ({
			id: skill.id,
			type: 'skill',
			position: skill.position,
			data: {
				...skill,
				unlocked: $skillUpgrades.includes(skill.id),
				available: canUnlockSkill(skill),
			},
		}));

		// Convert skill requirements to edges
		$edges = Object.values(SKILL_UPGRADES).flatMap((skill) =>
			(skill.requires ?? []).map<Edge>((requireId) => {
				const require = SKILL_UPGRADES[requireId];
				const targetPositionDiff = {
					x: skill.position.x - require.position.x,
					y: skill.position.y - require.position.y,
				};

				// Calculate which direction is more dominant (horizontal or vertical)
				const isHorizontalDominant = Math.abs(targetPositionDiff.x) > Math.abs(targetPositionDiff.y);

				let sourceDirection: Position;
				let targetDirection: Position;

				if (isHorizontalDominant) {
					// Horizontal connection
					if (targetPositionDiff.x > 0) {
						sourceDirection = Position.Right;
						targetDirection = Position.Left;
					} else {
						sourceDirection = Position.Left;
						targetDirection = Position.Right;
					}
				} else {
					// Vertical connection
					if (targetPositionDiff.y > 0) {
						sourceDirection = Position.Bottom;
						targetDirection = Position.Top;
					} else {
						sourceDirection = Position.Top;
						targetDirection = Position.Bottom;
					}
				}

				return {
					id: `${requireId}-${skill.id}`,
					source: requireId,
					target: skill.id,
					sourceHandle: `${requireId}-${sourceDirection}`,
					targetHandle: `${skill.id}-${targetDirection}`,
					type: 'smoothstep',
					class: canUnlockSkill(skill) || $skillUpgrades.includes(skill.id) ? 'unlocking' : '',
				};
			}),
		);
	}
</script>

<div class="overlay" on:click={onClose} on:keypress|stopPropagation|capture={onKeydown} transition:fade={{ duration: 300 }}>
	<div class="skill-tree" on:click|stopPropagation transition:fly={{ y: -100, duration: 300 }}>
		<div class="header">
			<h2>Skill Tree</h2>
			<div class="points-counter">Available Points: {$skillPointsAvailable}</div>
			<div class="exit" on:click={onClose}>
				<X />
			</div>
		</div>

		<div class="graph-container">
			<SvelteFlow
				{nodes}
				{edges}
				{nodeTypes}
				colorMode="dark"
				minZoom={0.3}
				maxZoom={2}
				initialViewport={{ x: $mobile ? 100 : 500, y: 200, zoom: 0.8 }}
				translateExtent={[
					[-10000, -10000],
					[10000, 10000],
				]}
				elementsSelectable={false}
				nodesConnectable={false}
				nodesDraggable={false}
				panOnScroll={false}
				preventScrolling={true}
				zoomOnPinch={true}
				zoomOnScroll={true}
				on:nodeclick={({ detail }) => {
					/** @type {SkillUpgrade} */
					const data = detail.node.data;
					unlockSkill(data);
				}}
			>
				<Background bgColor="#222" gap={35} lineWidth={1} />
				{#if !$mobile}
					<Controls showZoom={true} showFitView={false} showLock={false} position="bottom-right" />
				{/if}
			</SvelteFlow>
		</div>
	</div>
</div>

<svelte:window on:keydown={onKeydown} />

<style>
	:global(.svelte-flow) {
		--background-color: transparent;
		--bg-color: #222;
		--xy-edge-stroke: #444;
		--xy-edge-stroke-width: 5;
		--xy-controls-button-background-color: #333;
		--xy-controls-button-border-color: #444;
		--xy-controls-button-color: #fff;
		--xy-attribution-background-color-default: transparent;
	}

	.overlay {
		align-items: center;
		backdrop-filter: blur(4px);
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		inset: 0;
		justify-content: center;
		position: fixed;
		z-index: 1000;
	}

	.skill-tree {
		background: #1a1a1a;
		border-radius: 16px;
		box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
		height: 85vh;
		overflow: hidden;
		position: relative;
		width: 85vw;

		@media (max-width: 768px) {
			border-radius: 0;
			position: fixed;
			height: 100dvh;
			width: 100vw;
		}
	}

	.header {
		align-items: center;
		background: rgba(0, 0, 0, 0.3);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.5rem 1rem 1.5rem 2rem;
	}

	.header h2 {
		color: #fff;
		flex: 1;
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
	}

	.points-counter {
		background: color-mix(in oklab, transparent, var(--accent-color) 20%);
		border-radius: 8px;
		border: 1px solid color-mix(in oklab, transparent, var(--accent-color) 20%);
		color: var(--accent-color);
		font-weight: 500;
		padding: 0.75rem 1.25rem;
	}

	.exit {
		display: flex;
		cursor: pointer;
		justify-content: center;
		align-items: center;
		width: 3rem;
		height: 3rem;
	}

	.graph-container {
		flex: 1;
		background: #222;
		border-radius: 12px;
		margin: 0.75rem;
		overflow: hidden;
		position: relative;
	}

	:global(.svelte-flow__edge.unlocking path) {
		--xy-edge-stroke: var(--accent-color);
	}

	:global(.svelte-flow__attribution) {
		display: none;
	}
</style>
