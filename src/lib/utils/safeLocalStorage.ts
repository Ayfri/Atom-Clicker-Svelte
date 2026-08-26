/**
 * `localStorage` throws a `SecurityError` on property access, not just on read or write, when site
 * data is blocked or when the page runs in a cross-origin iframe with third-party storage partitioned
 * off. Every access goes through here so a module-level singleton can never kill the app at import time.
 */

let unavailable = false;

function storage(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		unavailable = true;
		return null;
	}
}

/** Probes storage, false when it is missing or blocked. */
export function isLocalStorageAvailable(): boolean {
	return storage() !== null;
}

/** True once any access has failed, so callers can warn the player their progress is not persisted. */
export function isLocalStorageUnavailable(): boolean {
	return unavailable;
}

export function getItem(key: string): string | null {
	try {
		return storage()?.getItem(key) ?? null;
	} catch {
		unavailable = true;
		return null;
	}
}

export function setItem(key: string, value: string): boolean {
	try {
		const store = storage();
		if (!store) return false;
		store.setItem(key, value);
		return true;
	} catch {
		unavailable = true;
		return false;
	}
}

export function removeItem(key: string): boolean {
	try {
		const store = storage();
		if (!store) return false;
		store.removeItem(key);
		return true;
	} catch {
		unavailable = true;
		return false;
	}
}

/** Keys currently held, empty when storage is unavailable. */
export function keys(): string[] {
	try {
		const store = storage();
		if (!store) return [];
		return Array.from({ length: store.length }, (_, i) => store.key(i)).filter((key): key is string => key !== null);
	} catch {
		unavailable = true;
		return [];
	}
}

/** Reads a JSON value, falling back when storage is unavailable or the stored value is corrupt. */
export function getJSON<T>(key: string, fallback: T): T {
	const raw = getItem(key);
	if (raw === null) return fallback;

	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}
