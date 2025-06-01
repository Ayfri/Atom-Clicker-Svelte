<script lang="ts">
	export let content: string = '';
	export let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
	export let size: 'sm' | 'md' | 'lg' = 'md';

	let showTooltip = false;
	let tooltipElement: HTMLDivElement;

	function toggleTooltip() {
		showTooltip = !showTooltip;
	}

	function handleClickOutside(event: MouseEvent) {
		if (tooltipElement && !tooltipElement.contains(event.target as Node)) {
			showTooltip = false;
		}
	}

	$: if (showTooltip && typeof document !== 'undefined') {
		document.addEventListener('click', handleClickOutside);
	} else if (typeof document !== 'undefined') {
		document.removeEventListener('click', handleClickOutside);
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

<div class="relative inline-block" bind:this={tooltipElement}>
	<!-- Desktop: hover trigger -->
	<div class="hidden sm:block tooltip-trigger">
		<slot />

		<!-- Desktop tooltip (hover) -->
		<div class="tooltip absolute left-1/2 transform -translate-x-1/2 {positionClasses} bg-black/95 backdrop-blur-sm rounded-lg {sizeClasses} opacity-0 pointer-events-none transition-all duration-200 z-[100]">
			<div class="text-white/90">
				<slot name="content">{content}</slot>
			</div>
			<!-- Arrow -->
			<div class="absolute w-0 h-0 {arrowClasses}"></div>
		</div>
	</div>

	<!-- Mobile: click trigger -->
	<div class="sm:hidden">
		<button on:click={toggleTooltip} class="p-1">
			<slot />
		</button>

		<!-- Mobile tooltip (click) -->
		{#if showTooltip}
			<div class="fixed left-1/2 transform -translate-x-1/2 top-1/2 -translate-y-1/2 bg-black/95 backdrop-blur-sm rounded-lg {sizeClasses} max-w-[90vw] z-50 border border-white/20">
				<div class="flex justify-between items-center mb-2">
					<div class="text-white/90">
						<slot name="content">{content}</slot>
					</div>
					<button
						on:click={toggleTooltip}
						class="text-white/60 hover:text-white/80 transition-colors ml-3"
					>
						×
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.tooltip-trigger:hover .tooltip {
		opacity: 1;
		pointer-events: auto;
	}
</style>
