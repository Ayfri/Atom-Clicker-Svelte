<script lang="ts">
	import type { Snippet } from 'svelte';
	import { innerWidth, innerHeight } from 'svelte/reactivity/window';

	interface Props {
		children: Snippet;
		content: Snippet;
		position?: 'top' | 'bottom' | 'left' | 'right';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let { children, content, position = 'top', size = 'md', class: className = '' }: Props = $props();

	const tooltipId = `tooltip-${Math.random().toString(36).substring(2, 11)}`;
	let triggerElement = $state<HTMLButtonElement>();
	let popoverElement = $state<HTMLDivElement>();
	let desktopTriggerElement = $state<HTMLDivElement>();
	let desktopTooltipElement = $state<HTMLDivElement>();

	function positionTooltip(trigger: HTMLElement, tooltip: HTMLElement) {
		if (!trigger || !tooltip) return;

		const triggerRect = trigger.getBoundingClientRect();
		const tooltipRect = tooltip.getBoundingClientRect();

		let top: number, left: number;

		switch (position) {
			case 'top':
				top = triggerRect.top - tooltipRect.height - 8;
				left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
				break;
			case 'bottom':
				top = triggerRect.bottom + 8;
				left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
				break;
			case 'left':
				top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
				left = triggerRect.left - tooltipRect.width - 8;
				break;
			case 'right':
				top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
				left = triggerRect.right + 8;
				break;
		}

		// Keep tooltip within viewport
		top = Math.max(8, Math.min(top, (innerHeight.current ?? window.innerHeight) - tooltipRect.height - 8));
		left = Math.max(8, Math.min(left, (innerWidth.current ?? window.innerWidth) - tooltipRect.width - 8));

		tooltip.style.top = `${top}px`;
		tooltip.style.left = `${left}px`;
	}

	function handleToggle(event: ToggleEvent) {
		if ((event.target as HTMLElement).matches(':popover-open')) {
			// Popover just opened, position it
			requestAnimationFrame(() => {
				if (!triggerElement || !popoverElement) return;
				positionTooltip(triggerElement, popoverElement);
			});
		}
	}

	function showDesktopTooltip() {
		desktopTooltipElement?.showPopover();
		requestAnimationFrame(() => {
			if (!desktopTriggerElement || !desktopTooltipElement) return;
			positionTooltip(desktopTriggerElement, desktopTooltipElement);
		});
	}

	function hideDesktopTooltip() {
		desktopTooltipElement?.hidePopover();
	}

	const positionClasses = $derived({
		top: 'bottom-full mb-2',
		bottom: 'top-full mt-2',
		left: 'right-full mr-2',
		right: 'left-full ml-2'
	}[position]);

	const sizeClasses = $derived({
		sm: 'min-w-[200px] text-xs p-2',
		md: 'min-w-[300px] text-sm p-3',
		lg: 'min-w-[400px] text-base p-4'
	}[size]);

	const arrowClasses = $derived({
			top: 'top-full left-1/2 transform -translate-x-1/2 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-black',
			bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-black',
			left: 'left-full top-1/2 transform -translate-y-1/2 border-t-[8px] border-b-[8px] border-l-[8px] border-t-transparent border-b-transparent border-l-black',
		right: 'right-full top-1/2 transform -translate-y-1/2 border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-black'
	}[position]);
</script>

<div class="relative inline-block {className}">
	<!-- Desktop: hover trigger -->
	<div bind:this={desktopTriggerElement} class="hidden sm:block h-full w-full" role="button" tabindex="0" onmouseenter={showDesktopTooltip} onmouseleave={hideDesktopTooltip}>
		{@render children()}

		<!-- Desktop tooltip (popover) -->
		<div bind:this={desktopTooltipElement} popover="manual" class="fixed bg-black/95 backdrop-blur-xs rounded-lg {sizeClasses} transition-all duration-200 z-50">
			<div class="text-white/90">
				{@render content()}
			</div>
			<!-- Arrow -->
			<div class="absolute size-0 {arrowClasses}"></div>
		</div>
	</div>

	<!-- Mobile: popover trigger -->
	<div class="sm:hidden">
		<button bind:this={triggerElement} popovertarget={tooltipId} class="flex items-center justify-center">
			{@render children()}
		</button>
	</div>
</div>

<!-- Popover tooltip for mobile -->
<div
	bind:this={popoverElement}
	id={tooltipId}
	popover="auto"
	ontoggle={handleToggle}
	class="fixed bg-black/95 backdrop-blur-xs rounded-lg p-3 border border-white/20 max-w-[90vw] min-w-50 text-white/90 text-sm"
>
	<div class="flex justify-between items-start">
		<div>
			{@render content()}
		</div>
		<button
			onclick={() => popoverElement?.hidePopover()}
			class="ml-2 text-white/60 hover:text-white/90 text-lg leading-none"
			aria-label="Close tooltip"
		>
			×
		</button>
	</div>
	<!-- Arrow positioned dynamically via JS -->
	<div class="popover-arrow absolute size-0 {arrowClasses}"></div>
</div>

<style>
		/* Popover styles */
	[popover] {
		inset: unset;
		overflow: visible;
	}
</style>
