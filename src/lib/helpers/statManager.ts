import { writable, type Invalidator, type Subscriber, type Unsubscriber, type Writable } from 'svelte/store';
import type { Updater } from 'svelte/store';
import { SAVE_VERSION } from '$helpers/saves';
import { type NumberStatName, type ArrayStatName, type LayerType } from '$helpers/statConstants';

export interface StatConfig<T> {
	id: string;
	defaultValue: T;
	layer: LayerType; // 0 = never reset, 1 = reset on electronize, 2 = reset on both
	saveable?: boolean;
	minVersion?: number;
	description?: string;
}

export class Stat<T> {
	public readonly id: string;
	public readonly defaultValue: T;
	public readonly layer: LayerType;
	public readonly saveable: boolean;
	public readonly minVersion: number;
	public readonly description: string;

	public store: Writable<T>;
	public subscribe: (run: Subscriber<T>, invalidate?: Invalidator<T> | undefined) => Unsubscriber;

	constructor(config: StatConfig<T>) {
		this.id = config.id;
		this.defaultValue = config.defaultValue;
		this.layer = config.layer;
		this.saveable = config.saveable ?? true;
		this.minVersion = config.minVersion ?? 1;
		this.description = config.description ?? '';

		this.store = writable(this.defaultValue);
		this.subscribe = this.store.subscribe;
	}

	get(): T {
		let value: T = this.defaultValue;
		this.store.subscribe(v => (value = v))();
		return value;
	}

	set(value: T): void {
		this.store.set(value);
	}

	update(fn: Updater<T>): void {
		this.store.update(fn);
	}

	reset(): void {
		this.store.set(this.defaultValue);
	}

	add(amount: number): void {
		if (typeof this.defaultValue === 'number') {
			this.store.update(current => ((current as unknown as number) + amount) as unknown as T);
		}
	}

	multiply(factor: number): void {
		if (typeof this.defaultValue === 'number') {
			this.store.update(current => ((current as unknown as number) * factor) as unknown as T);
		}
	}

	push(...items: any[]): void {
		if (Array.isArray(this.defaultValue)) {
			this.store.update(current => [...(current as unknown as any[]), ...items] as unknown as T);
		}
	}

	remove(item: any): void {
		if (Array.isArray(this.defaultValue)) {
			this.store.update(current => (current as unknown as any[]).filter(i => i !== item) as unknown as T);
		}
	}

	removeBy(predicate: (item: any) => boolean): void {
		if (Array.isArray(this.defaultValue)) {
			this.store.update(current => (current as unknown as any[]).filter(i => !predicate(i)) as unknown as T);
		}
	}

	includes(item: any): boolean {
		if (Array.isArray(this.defaultValue)) {
			return (this.get() as unknown as any[]).includes(item);
		}
		return false;
	}
}

export class StatManager {
	private stats = new Map<string, Stat<any>>();

	register<T>(config: StatConfig<T>): Stat<T> {
		const stat = new Stat(config);
		this.stats.set(config.id, stat);
		return stat;
	}

	get<T>(id: string): Stat<T> | undefined {
		return this.stats.get(id);
	}

	getNumber(id: NumberStatName): Stat<number> | undefined {
		return this.stats.get(id) as Stat<number> | undefined;
	}

	getArray<T>(id: ArrayStatName): Stat<T[]> | undefined {
		return this.stats.get(id) as Stat<T[]> | undefined;
	}

	getAllStats(): Map<string, Stat<any>> {
		return this.stats;
	}

	resetLayer(layer: LayerType): void {
		for (const stat of this.stats.values()) {
			if (stat.layer >= layer) {
				stat.reset();
			}
		}
	}

	getSaveData(): Record<string, any> {
		const saveData: Record<string, any> = {
			version: SAVE_VERSION
		};

		for (const stat of this.stats.values()) {
			if (stat.saveable) {
				saveData[stat.id] = stat.get();
			}
		}

		return saveData;
	}

	loadSaveData(data: Record<string, any>): void {
		for (const stat of this.stats.values()) {
			if (stat.saveable && data[stat.id] !== undefined) {
				const saveVersion = data.version || 1;
				if (saveVersion >= stat.minVersion) {
					stat.set(data[stat.id]);
				}
			}
		}
	}

	isValidSaveData(data: any): boolean {
		if (!data || typeof data !== 'object') return false;

		for (const stat of this.stats.values()) {
			if (stat.saveable && stat.minVersion <= (data.version || 1)) {
				if (!(stat.id in data)) {
					console.warn(`Missing stat in save data: ${stat.id}`);
					return false;
				}

				const value = data[stat.id];
				const expectedType = typeof stat.defaultValue;
				const actualType = typeof value;

				if (expectedType !== actualType) {
					console.warn(`Type mismatch for stat ${stat.id}: expected ${expectedType}, got ${actualType}`);
					return false;
				}

				if (Array.isArray(stat.defaultValue) && !Array.isArray(value)) {
					console.warn(`Expected array for stat ${stat.id}`);
					return false;
				}
			}
		}

		return true;
	}

	resetAll(): void {
		for (const stat of this.stats.values()) {
			stat.reset();
		}
	}
}
