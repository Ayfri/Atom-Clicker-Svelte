import { writable } from 'svelte/store';
import type { Icon, icons } from 'lucide-svelte';
import type { Component } from 'svelte';

import GitHub from '@components/icons/GitHub.svelte';
import Discord from '@components/icons/Discord.svelte';

export const toastIcons = {
	Discord,
	GitHub,
} as const;

export type ToastIconName = keyof typeof toastIcons;

export type ToastIcon = Component | typeof Icon | ToastIconName | keyof typeof icons;

export type Toast = {
	action?: () => void;
	actionLabel?: string;
	duration: number;
	icon?: ToastIcon;
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
	action?: () => void;
	actionLabel?: string;
	duration?: number;
	icon?: ToastIcon;
	is_infinite?: boolean;
	message: string;
	title: string;
}

function createToast(type: Toast['type'], options: ToastOptions) {
	addToast({
		action: options.action,
		actionLabel: options.actionLabel,
		id: Date.now() + Math.floor(Math.random() * 100_000),
		duration: options.duration ?? 10_000,
		icon: options.icon,
		is_infinite: options.is_infinite ?? false,
		message: options.message,
		title: options.title,
		type,
	});
}

export const error = (options: ToastOptions) => createToast('error', options);
export const info = (options: ToastOptions) => createToast('info', options);
export const success = (options: ToastOptions) => createToast('success', options);
export const warning = (options: ToastOptions) => createToast('warning', options);
