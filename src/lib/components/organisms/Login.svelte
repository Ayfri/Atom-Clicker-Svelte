<script context="module" lang="ts">
	import type {AuthConnection} from '$lib/types/auth';

	export const AUTH_CONNECTIONS: AuthConnection[] = [
		{
			id: 'google',
			name: 'Google',
			icon: '/google.svg',
			provider: 'google',
			connection: 'google-oauth2',
			scope: 'openid profile email',
			backgroundColor: 'bg-white',
			hoverBackgroundColor: 'hover:bg-gray-100',
			textColor: 'text-gray-800',
		},
		{
			id: 'discord',
			name: 'Discord',
			icon: '/discord.svg',
			provider: 'discord',
			connection: 'discord',
			scope: 'openid profile email identify',
			backgroundColor: 'bg-[#5865F2]',
			hoverBackgroundColor: 'hover:bg-[#4752C4]',
			textColor: 'text-white',
		},
		{
			id: 'x',
			name: 'X',
			icon: '/x.svg',
			provider: 'x',
			connection: 'twitter',
			scope: 'openid profile email',
			backgroundColor: 'bg-white',
			hoverBackgroundColor: 'hover:bg-gray-100',
			textColor: 'text-gray-800',
		},
	];

	export function getAuthConnection(provider: string | undefined) {
		return AUTH_CONNECTIONS.find(c => c.provider === provider);
	}
</script>

<script lang="ts">
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import {supabaseAuth} from '$stores/supabaseAuth';
	import Modal from '@components/atoms/Modal.svelte';

	let error: string | null = null;
	export let onClose: () => void;

	async function handleLogin(connection: AuthConnection) {
		error = null;
		try {
			// Check Supabase configuration
			if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
				error = 'Supabase configuration is missing. Please check your environment variables.';
				return;
			}

			// Map provider names to Supabase format
			let provider: 'google' | 'discord' | 'twitter';
			switch (connection.id) {
				case 'google':
					provider = 'google';
					break;
				case 'discord':
					provider = 'discord';
					break;
				case 'x':
					provider = 'twitter';
					break;
				default:
					error = `Provider ${connection.id} is not supported yet`;
					return;
			}

			await supabaseAuth.signInWithProvider(provider);
		} catch (e) {
			if (e instanceof Error) {
				if (e.message.includes('connection is not enabled') || e.message.includes('not configured')) {
					error = 'Social login provider is not properly configured. Please contact the administrator.';
				} else if (e.message.includes('Unauthorized')) {
					error = 'Authentication failed. Please check the configuration.';
				} else {
					error = e.message;
				}
			} else {
				error = 'Failed to initialize login. Please try again.';
			}
		}
	}
</script>

<Modal {onClose}>
	{#if error}
		<div class="mb-4 rounded-lg bg-red-500/20 p-4 text-red-200">
			{error}
		</div>
	{/if}

	<div class="flex flex-col gap-4">
		{#each AUTH_CONNECTIONS as connection}
			<button
				on:click={() => handleLogin(connection)}
				class="flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors
				{connection.backgroundColor} {connection.hoverBackgroundColor} {connection.textColor}"
			>
				<img src={connection.icon} alt={connection.name} class="h-6 w-6"/>
				Continue with {connection.name}
			</button>
		{/each}
	</div>
</Modal>
