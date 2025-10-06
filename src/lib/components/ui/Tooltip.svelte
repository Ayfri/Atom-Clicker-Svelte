<script lang="ts">
	export let content: string = '';
	export let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
	export let size: 'sm' | 'md' | 'lg' = 'md';

	let tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
	let triggerElement: HTMLButtonElement;
	let popoverElement: HTMLDivElement;
	let desktopTriggerElement: HTMLDivElement;
	let desktopTooltipElement: HTMLDivElement;

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
		top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));
		left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

		tooltip.style.top = `${top}px`;
		tooltip.style.left = `${left}px`;
	}

	function handleToggle(event: Event) {
		if ((event.target as HTMLElement).matches(':popover-open')) {
			// Popover just opened, position it
			requestAnimationFrame(() => positionTooltip(triggerElement, popoverElement));
		}
	}

	function showDesktopTooltip() {
		desktopTooltipElement?.showPopover();
		requestAnimationFrame(() => positionTooltip(desktopTriggerElement, desktopTooltipElement));
	}

	function hideDesktopTooltip() {
		desktopTooltipElement?.hidePopover();
	}

	$: positionClasses = {
		top: 'bottom-full mb-2',
		bottom: 'top-full mt-2',
		left: 'right-full mr-2',
		right: 'left-full ml-2'
	}[position];

	$: sizeClasses = {
		sm: 'min-w-[200px] text-xs p-2',
		md: 'min-w-[300px] text-sm p-3',
		lg: 'min-w-[400px] text-base p-4'
	}[size];

	$: arrowClasses = {
		top: 'top-full left-1/2 transform -translate-x-1/2 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-black',
		bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-black',
		left: 'left-full top-1/2 transform -translate-y-1/2 border-t-[8px] border-b-[8px] border-l-[8px] border-t-transparent border-b-transparent border-l-black',
		right: 'right-full top-1/2 transform -translate-y-1/2 border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-black'
	}[position];
</script>

<div class="relative inline-block">
	<!-- Desktop: hover trigger -->
	<div bind:this={desktopTriggerElement} class="hidden sm:block" role="button" tabindex="0" on:mouseenter={showDesktopTooltip} on:mouseleave={hideDesktopTooltip}>
		<slot />

		<!-- Desktop tooltip (popover) -->
		<div bind:this={desktopTooltipElement} popover="manual" class="fixed bg-black/95 backdrop-blur-xs rounded-lg {sizeClasses} transition-all duration-200 z-50">
			<div class="text-white/90 p-3">
				<slot name="content">{content}</slot>
			</div>
			<!-- Arrow -->
			<div class="absolute size-0 {arrowClasses}"></div>
		</div>
	</div>

	<!-- Mobile: popover trigger -->
	<div class="sm:hidden">
		<button bind:this={triggerElement} popovertarget={tooltipId} class="flex items-center justify-center">
			<slot />
		</button>
	</div>
</div>

<!-- Popover tooltip for mobile -->
<div
	bind:this={popoverElement}
	id={tooltipId}
	popover="auto"
	on:toggle={handleToggle}
	class="fixed bg-black/95 backdrop-blur-xs rounded-lg p-3 border border-white/20 max-w-[90vw] min-w-[200px] text-white/90 text-sm"
>
	<div class="flex justify-between items-start">
		<div>
			<slot name="content">{content}</slot>
		</div>
		<button 
			on:click={() => popoverElement?.hidePopover()} 
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
