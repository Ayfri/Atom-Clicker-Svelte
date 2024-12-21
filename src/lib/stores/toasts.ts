import {writable} from 'svelte/store';

export type Toast = {
	id: number;
	title: string;
	message: string;
	duration: number;
	type: 'success' | 'error' | 'info';
};

export let toasts = writable<Toast[]>([]);

export function addToast(toast: Toast) {
	toasts.update(t => [...t, toast]);
	setTimeout(() => removeToast(toast.id), toast.duration);
}

export function removeToast(id: number) {
	toasts.update(t => t.filter(toast => toast.id !== id));
}

export function error(title: string, message: string, duration = 10_000) {
	addToast({
		id: Date.now() + Math.floor(Math.random() * 100_000),
		title,
		message,
		duration,
		type: 'error'
	});
}

export function info(title: string, message: string, duration = 10_000) {
	addToast({
		id: Date.now() + Math.floor(Math.random() * 100_000),
		title,
		message,
		duration,
		type: 'info'
	});
}

export function success(title: string, message: string, duration = 10_000) {
	addToast({
		id: Date.now() + Math.floor(Math.random() * 100_000),
		title,
		message,
		duration,
		type: 'success'
	});
}
