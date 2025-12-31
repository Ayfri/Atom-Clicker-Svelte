import {writable} from 'svelte/store';
import type { Icon } from 'lucide-svelte';

export type Toast = {
	duration: number;
	icon?: typeof Icon;
	id: number;
	is_infinite?: boolean;
	message: string;
	title: string;
	type: 'success' | 'error' | 'info' | 'warning';
};

export let toasts = writable<Toast[]>([]);

export function addToast(toast: Toast) {
	toasts.update(t => [...t, toast]);
	if (!toast.is_infinite && toast.duration > 0) {
		setTimeout(() => removeToast(toast.id), toast.duration);
	}
}

export function removeToast(id: number) {
	toasts.update(t => t.filter(toast => toast.id !== id));
}

export function clearAllToasts() {
	toasts.set([]);
}

export interface ToastOptions {
	duration?: number;
	icon?: typeof Icon;
	is_infinite?: boolean;
	message: string;
	title: string;
}

function createToast(type: Toast['type'], options: ToastOptions) {
	addToast({
		id: Date.now() + Math.floor(Math.random() * 100_000),
		duration: options.duration ?? 10_000,
		icon: options.icon,
		is_infinite: options.is_infinite ?? false,
		message: options.message,
		title: options.title,
		type
	});
}

export const error = (options: ToastOptions) => createToast('error', options);
export const info = (options: ToastOptions) => createToast('info', options);
export const success = (options: ToastOptions) => createToast('success', options);
export const warning = (options: ToastOptions) => createToast('warning', options);
