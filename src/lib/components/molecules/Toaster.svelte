<script lang="ts">
  import { removeToast, toasts } from '$stores/toasts'
  import { fade } from 'svelte/transition'
  import { X } from 'lucide-svelte'
</script>

<div class="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
  {#each $toasts as toast}
    <div
      class="flex w-96 flex-col gap-2 overflow-hidden rounded-xl
      bg-accent-900/90 p-4 shadow-lg backdrop-blur transition-all duration-300
      hover:scale-[1.02]"
      class:type={toast.type}
      transition:fade={{ duration: 400 }}>
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-lg font-bold text-white">{toast.title}</h3>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg
          transition-colors hover:bg-white/10 hover:*:stroke-[3]"
          on:click={() => removeToast(toast.id)}>
          <X class="transition-all duration-300" size={18} />
        </button>
      </div>
      <p class="text-sm text-white/90">
        {@html toast.message}
      </p>
    </div>
  {/each}
</div>
