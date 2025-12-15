import { writable } from 'svelte/store';

export type SaveErrorType = 'corrupted' | 'invalid_json' | 'migration_failed' | 'validation_failed' | 'unknown';

export interface SaveRecoveryState {
	hasError: boolean;
	backupKey: string | null;
	cloudSaveAvailable: boolean;
	errorDetails: string | null;
	errorType: SaveErrorType | null;
	rawSaveData: string | null;
}

const initialState: SaveRecoveryState = {
	backupKey: null,
	cloudSaveAvailable: false,
	errorDetails: null,
	errorType: null,
	hasError: false,
	rawSaveData: null,
};

function createSaveRecoveryStore() {
	const { subscribe, set, update } = writable<SaveRecoveryState>(initialState);

	return {
		subscribe,

		setError(errorType: SaveErrorType, errorDetails: string, rawSaveData: string | null = null) {
			const backupKey = rawSaveData ? `atomic-clicker-backup-${Date.now()}` : null;

			// Save backup if we have raw data
			if (backupKey && rawSaveData) {
				try {
					localStorage.setItem(backupKey, rawSaveData);
					console.log(`Backup saved to: ${backupKey}`);
				} catch (e) {
					console.warn('Failed to create backup:', e);
				}
			}

			update(state => ({
				...state,
				backupKey,
				errorDetails,
				errorType,
				hasError: true,
				rawSaveData,
			}));
		},

		setCloudSaveAvailable(available: boolean) {
			update(state => ({
				...state,
				cloudSaveAvailable: available,
			}));
		},

		clearError() {
			set(initialState);
		},

		// Attempt to recover a backup
		getBackupData(backupKey: string): string | null {
			try {
				return localStorage.getItem(backupKey);
			} catch {
				return null;
			}
		},

		// List all backups
		listBackups(): { key: string; date: Date }[] {
			const backups: { key: string; date: Date }[] = [];
			try {
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key?.startsWith('atomic-clicker-backup-')) {
						const timestamp = parseInt(key.replace('atomic-clicker-backup-', ''));
						if (!isNaN(timestamp)) {
							backups.push({ key, date: new Date(timestamp) });
						}
					}
				}
			} catch {
				// Ignore localStorage errors
			}
			return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
		},

		// Clean old backups (keep last 3)
		cleanOldBackups() {
			const backups = this.listBackups();
			const toDelete = backups.slice(3);
			for (const backup of toDelete) {
				try {
					localStorage.removeItem(backup.key);
				} catch {
					// Ignore errors
				}
			}
		}
	};
}

export const saveRecovery = createSaveRecoveryStore();
