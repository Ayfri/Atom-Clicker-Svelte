<script lang="ts">
	import '@xyflow/svelte/dist/style.css';
	import { mobile } from '$stores/window';
	import { onDestroy, onMount } from 'svelte';
	import { SKILL_UPGRADES } from '$data/skillTree';
	import { gameManager } from '$helpers/gameManager';
	import { skillPointsAvailable, skillUpgrades } from '$stores/gameStore';
	import type { SkillUpgrade } from '$lib/types';
	import { SvelteFlow, Background, Controls, type Node, type Edge, Position } from '@xyflow/svelte';
	import { writable } from 'svelte/store';
	import SkillNode from '@components/organisms/SkillNode.svelte';
	import Modal from '@components/atoms/Modal.svelte';

	export let onClose: () => void;

	const nodeTypes = {
		skill: SkillNode,
	};

	let nodes = writable<Node[]>([]);
	let edges = writable<Edge[]>([]);

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

	let interval: ReturnType<typeof setInterval>;
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

<Modal {onClose} containerClass="m-2 !p-0 rounded-xl" width="lg">
	<div slot="header" class="flex w-full items-center justify-between">
		<h2 class="text-2xl font-bold text-white">Skill Tree</h2>
		<div class="points-counter bg-accent-400/20 border border-accent-400/20 px-4 py-2 rounded-lg text-accent-400 font-medium">
			Available Points: {$skillPointsAvailable}
		</div>
	</div>

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
		<Background gap={35} lineWidth={1} />
		{#if !$mobile}
			<Controls showZoom={true} showFitView={false} showLock={false} position="bottom-right" />
		{/if}
	</SvelteFlow>
</Modal>

<style>
	:global(.svelte-flow) {
		--background-color: transparent;
		--xy-background-color: var(--color-accent-900);
		--xy-edge-stroke: var(--color-accent-800);
		--xy-edge-stroke-width: 5;
		--xy-controls-button-background-color: var(--color-accent-800);
		--xy-controls-button-border-color: var(--color-accent-800);
		--xy-controls-button-color: var(--color-accent-50);
		--xy-attribution-background-color-default: transparent;
	}

	:global(.svelte-flow__edge.unlocking path) {
		--xy-edge-stroke: var(--color-accent-400);
	}

	:global(.svelte-flow__attribution) {
		display: none;
	}
</style>
