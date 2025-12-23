import { writable } from 'svelte/store';
import { gameManager } from '$helpers/GameManager.svelte';

function createChangelogStore() {
    const { subscribe, set, update } = writable({
        hasUnread: false,
        lastReadDate: new Date(0)
    });

    return {
        subscribe,
        markAsRead: () => {
            update(state => ({ ...state, hasUnread: false, lastReadDate: new Date() }));
        },
        checkForUpdates: (lastChangelogDate: Date) => {
            const lastSaveDate = new Date(gameManager.lastSave);
            update(state => ({
                ...state,
                hasUnread: lastSaveDate < lastChangelogDate && state.lastReadDate < lastChangelogDate
            }));
        }
    };
}

export const changelog = createChangelogStore();
