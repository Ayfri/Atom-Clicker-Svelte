<script lang="ts">
    import { auth } from '$stores/auth';
    import { fade, fly } from 'svelte/transition';
    import { X, CloudUpload, CloudDownload, AlertCircle, Clock } from 'lucide-svelte';
    import { info, error as errorToast } from '$stores/toasts';
    import { formatNumber } from '$lib/utils';
    import { onMount } from 'svelte';
    import type { GameState } from '$lib/types';
    import { getLevelFromTotalXP, getXPForLevel, playerLevel } from '$stores/gameStore';
    import Value from '@components/atoms/Value.svelte';
    import { CurrenciesTypes } from '$data/currencies';

    export let onClose: () => void;

    type CloudSaveInfo = {
        lastSaveDate: number | null;
    } & GameState;

    let loading = false;
    let error: string | null = null;
    let cloudSaveInfo: CloudSaveInfo | null = null;
    let lastSaveTime = 0;
    let cooldownProgress = 0;
    let cooldownInterval: ReturnType<typeof setInterval>;

    const SAVE_COOLDOWN = 30000; // 30 seconds

    function updateCooldownProgress() {
        const now = Date.now();
        const elapsed = now - lastSaveTime;
        cooldownProgress = Math.min(1, elapsed / SAVE_COOLDOWN);

        if (cooldownProgress >= 1) {
            clearInterval(cooldownInterval);
        }
    }

    function startCooldown() {
        lastSaveTime = Date.now();
        cooldownProgress = 0;

        if (cooldownInterval) {
            clearInterval(cooldownInterval);
        }

        cooldownInterval = setInterval(() => {
            updateCooldownProgress();
        }, 100); // Update every 100ms for smooth animation
    }

    onMount(() => {
        // Check if there's an existing cooldown
        const now = Date.now();
        if (lastSaveTime && now - lastSaveTime < SAVE_COOLDOWN) {
            cooldownProgress = (now - lastSaveTime) / SAVE_COOLDOWN;
            startCooldown();
        } else {
            cooldownProgress = 1;
        }
    });

    function formatDate(timestamp: number) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(timestamp));
    }

    async function refreshCloudSaveInfo() {
        if (!$auth.isAuthenticated) return;
        cloudSaveInfo = await auth.getCloudSaveInfo();
    }

    onMount(refreshCloudSaveInfo);

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            onClose();
        }
    }

    async function handleSaveToCloud() {
        if (!$auth.isAuthenticated) {
            error = 'Please log in to use cloud saves';
            return;
        }

        if (cooldownProgress < 1) {
            const remainingTime = Math.ceil((SAVE_COOLDOWN * (1 - cooldownProgress)) / 1000);
            info('Wait', `Please wait ${remainingTime} seconds before saving again`);
            return;
        }

        loading = true;
        error = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                await auth.saveGameToCloud();
                await refreshCloudSaveInfo();
                info('Success', 'Game saved to cloud');
                startCooldown();
                break;
            } catch (e) {
                retryCount++;
                const isLastAttempt = retryCount === maxRetries;

                if (e instanceof Error) {
                    if (e.message.includes('Invalid or expired data') || e.message.includes('Invalid signature')) {
                        // Si c'est une erreur de signature, on réessaie immédiatement
                        if (!isLastAttempt) {
                            console.log(`Retrying save after signature error (attempt ${retryCount}/${maxRetries})`);
                            continue;
                        }
                        error = 'Failed to verify save data. Please try again.';
                    } else {
                        error = isLastAttempt ? e.message : 'Retrying save...';
                    }
                } else {
                    error = 'Failed to save game to cloud';
                }

                if (isLastAttempt) {
                    errorToast('Error', error);
                } else {
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }
        }

        loading = false;
    }

    async function handleLoadFromCloud() {
        if (!$auth.isAuthenticated) {
            error = 'Please log in to use cloud saves';
            return;
        }

        loading = true;
        error = null;
        try {
            const loaded = await auth.loadGameFromCloud();
            if (loaded) {
                info('Success', 'Game loaded from cloud');
                onClose();
            } else {
                error = 'No saved game found in cloud';
                errorToast('Error', error);
            }
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load game from cloud';
            errorToast('Error', error);
        } finally {
            loading = false;
        }
    }

    $: canSave = cooldownProgress >= 1 && !loading;
</script>

<svelte:window on:keydown={onKeydown} />

<div class="overlay" on:click={onClose} transition:fade={{ duration: 200 }}>
    <div
        class="modal bg-gradient-to-br from-accent-900 to-accent-800"
        on:click|stopPropagation
        transition:fly={{ y: -100, duration: 300 }}
        on:introstart={refreshCloudSaveInfo}
    >
        <div class="flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 p-6 sm:px-8">
            <h2 class="flex-1 text-2xl font-bold text-white">Cloud Save</h2>
            <button class="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:*:stroke-[3]" on:click={onClose}>
                <X class="transition-all duration-300" />
            </button>
        </div>

        <div class="flex-1 p-8">
            {#if !$auth.isAuthenticated}
                <div class="flex flex-col items-center gap-4 text-center">
                    <AlertCircle class="text-red-500" size={48} />
                    <p class="text-lg font-semibold text-white">Please log in to use cloud saves</p>
                    <p class="text-sm text-white/60">Cloud saves allow you to sync your game progress across devices</p>
                </div>
            {:else}
                <div class="flex flex-col gap-6">
                    {#if error}
                        <div class="rounded-lg bg-red-500/20 p-4 text-red-200">
                            {error}
                        </div>
                    {/if}

                    {#if cloudSaveInfo}
                        <div class="rounded-lg bg-black/20 p-4">
                            <div class="flex items-center gap-2 text-accent mb-2">
                                <Clock class="size-4" />
                                <span class="text-sm">Last saved: {cloudSaveInfo.lastSaveDate ? formatDate(cloudSaveInfo.lastSaveDate) : 'Never'}</span>
                            </div>
                            <div class="flex flex-wrap gap-3 text-sm">
                                <div class="flex items-center gap-2">
                                    <span class="text-white/60">Level</span>
                                    <span class="text-white font-semibold">{getLevelFromTotalXP(cloudSaveInfo.totalXP)}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <Value
                                        value={cloudSaveInfo.atoms}
                                        currency={CurrenciesTypes.ATOMS}
                                        currencyClass="size-4"
                                        class="text-white font-semibold"
                                    />
                                </div>
                                {#if cloudSaveInfo.protons > 0}
                                    <div class="flex items-center gap-2">
                                        <Value
                                            value={cloudSaveInfo.protons}
                                            currency={CurrenciesTypes.PROTONS}
                                            currencyClass="size-4"
                                            class="text-white font-semibold"
                                        />
                                    </div>
                                {/if}
                                {#if cloudSaveInfo.electrons > 0}
                                    <div class="flex items-center gap-2">
                                        <Value
                                            value={cloudSaveInfo.electrons}
                                            currency={CurrenciesTypes.ELECTRONS}
                                            currencyClass="size-4"
                                            class="text-white font-semibold"
                                        />
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}

                    <div class="flex flex-col gap-4">
                        <div class="relative">
                            <button
                                class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                on:click={handleSaveToCloud}
                                disabled={!canSave}
                            >
                                <CloudUpload class="size-5" />
                                Save to Cloud
                            </button>
                            <div
                                class="absolute inset-0 rounded-lg bg-black/20 transition-transform origin-left"
                                style:transform="scaleX({1 - cooldownProgress})"
                            />
                        </div>

                        <button
                            class="flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            on:click={handleLoadFromCloud}
                            disabled={loading}
                        >
                            <CloudDownload class="size-5" />
                            Load from Cloud
                        </button>
                    </div>

                    <div class="mt-4 rounded-lg bg-black/20 p-4 text-sm text-white/80">
                        <div class="flex items-start gap-2">
                            <AlertCircle class="mt-0.5 size-4 shrink-0 text-accent" />
                            <p>
                                Cloud saves allow you to backup your game progress and sync it across devices. Your local save will be overwritten when loading from the cloud.
                            </p>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style lang="postcss">
    .overlay {
        @apply fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm;
    }

    .modal {
        @apply flex h-[85vh] w-[85vw] max-w-xl flex-col overflow-hidden rounded-2xl shadow-2xl;
    }

    @media (width <= 768px) {
        .modal {
            @apply h-[100dvh] w-screen rounded-none;
        }
    }
</style>
