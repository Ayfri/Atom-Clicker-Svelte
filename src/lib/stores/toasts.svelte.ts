import type { Component } from 'svelte';
import * as icons from '@lucide/svelte';
import type { Icon } from '@lucide/svelte';

import Discord from '@components/icons/Discord.svelte';
import GitHub from '@components/icons/GitHub.svelte';

export const toastIcons = {
	Discord,
	GitHub,
} as const;

export type ToastIconName = keyof typeof toastIcons;
export type ToastIcon = Component | typeof Icon | ToastIconName | keyof typeof icons;
export type ToastType = 'error' | 'info' | 'success' | 'warning';

export interface ToastStyle {
	border: string;
	icon: Component | typeof Icon;
	iconColor: string;
	progressBarColor: string;
	title: string;
}

export interface Toast {
	action?: () => void;
	actionLabel?: string;
	duration: number;
	icon?: ToastIcon;
	id: number;
	is_infinite?: boolean;
	message: string;
	title: string;
	type: ToastType;
}

export type ToastOptions = Omit<Toast, 'id' | 'duration' | 'type'> & {
	duration?: number;
};

class ToastStore {
	list = $state<Toast[]>([]);

	add = (toast: Toast) => {
		this.list.push(toast);
		if (!toast.is_infinite && toast.duration > 0) {
			setTimeout(() => this.remove(toast.id), toast.duration);
		}
	};

	clearAll = () => {
		this.list = [];
	};

	remove = (id: number) => {
		this.list = this.list.filter(t => t.id !== id);
	};

	private create(type: ToastType, options: ToastOptions) {
		this.add({
			action: options.action,
			actionLabel: options.actionLabel,
			duration: options.duration ?? 10_000,
			icon: options.icon,
			id: Date.now() + Math.floor(Math.random() * 100_000),
			is_infinite: options.is_infinite ?? false,
			message: options.message,
			title: options.title,
			type,
		});
	}

	error = (options: ToastOptions) => this.create('error', options);
	info = (options: ToastOptions) => this.create('info', options);
	success = (options: ToastOptions) => this.create('success', options);
	warning = (options: ToastOptions) => this.create('warning', options);
}

export const toastStore = new ToastStore();

export function getToastIcon(toast: Toast, fallbackIcon?: any) {
	if (typeof toast.icon === 'string') {
		if (toast.icon in toastIcons) {
			return toastIcons[toast.icon as keyof typeof toastIcons];
		}
		if (toast.icon in icons) {
			return icons[toast.icon as keyof typeof icons];
		}
	}
	return toast.icon || fallbackIcon;
}
