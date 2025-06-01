<script lang="ts">
	export let content: string = '';
	export let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
	export let size: 'sm' | 'md' | 'lg' = 'md';

	let tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
	let triggerElement: HTMLButtonElement;
	let popoverElement: HTMLDivElement;

	function positionPopover() {
		if (!triggerElement || !popoverElement) return;

		const triggerRect = triggerElement.getBoundingClientRect();
		const popoverRect = popoverElement.getBoundingClientRect();

		let top: number, left: number;

		switch (position) {
			case 'top':
				top = triggerRect.top - popoverRect.height - 8;
				left = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
				break;
			case 'bottom':
				top = triggerRect.bottom + 8;
				left = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
				break;
			case 'left':
				top = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;
				left = triggerRect.left - popoverRect.width - 8;
				break;
			case 'right':
				top = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;
				left = triggerRect.right + 8;
				break;
		}

		// Keep popover within viewport
		top = Math.max(8, Math.min(top, window.innerHeight - popoverRect.height - 8));
		left = Math.max(8, Math.min(left, window.innerWidth - popoverRect.width - 8));

		popoverElement.style.top = `${top}px`;
		popoverElement.style.left = `${left}px`;
	}

	function handleToggle(event: Event) {
		if ((event.target as HTMLElement).matches(':popover-open')) {
			// Popover just opened, position it
			requestAnimationFrame(positionPopover);
		}
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
		top: 'top-full left-1/2 transform -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-black/90',
		bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-black/90',
		left: 'left-full top-1/2 transform -translate-y-1/2 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-black/90',
		right: 'right-full top-1/2 transform -translate-y-1/2 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-black/90'
	}[position];
</script>

<div class="relative inline-block">
	<!-- Desktop: hover trigger -->
	<div class="hidden sm:block tooltip-trigger">
		<slot />

		<!-- Desktop tooltip (hover) -->
		<div class="tooltip absolute left-1/2 transform -translate-x-1/2 {positionClasses} bg-black/95 backdrop-blur-sm rounded-lg {sizeClasses} opacity-0 pointer-events-none transition-all duration-200">
			<div class="text-white/90">
				<slot name="content">{content}</slot>
			</div>
			<!-- Arrow -->
			<div class="absolute w-0 h-0 {arrowClasses}"></div>
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
	class="fixed bg-black/95 backdrop-blur-sm rounded-lg p-3 border border-white/20 max-w-[90vw] min-w-[200px] text-white/90 text-sm"
>
	<slot name="content">{content}</slot>
	<!-- Arrow positioned dynamically via JS -->
	<div class="popover-arrow absolute w-0 h-0 {arrowClasses}"></div>
</div>

<style>
	.tooltip-trigger:hover .tooltip {
		opacity: 1;
		pointer-events: auto;
	}

		/* Popover styles */
	[popover] {
		margin: 0;
		inset: unset;
	}
</style>
