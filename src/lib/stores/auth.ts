import { createAuth0Client, type Auth0Client, type Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { browser } from '$app/environment';
import {writable, derived, get} from 'svelte/store';
import { PUBLIC_AUTH0_CALLBACK_URL, PUBLIC_AUTH0_CLIENT_ID, PUBLIC_AUTH0_DOMAIN } from '$env/static/public';
import type { AuthProvider, AuthStore } from '$lib/types/auth';

const isAuthConfigured = PUBLIC_AUTH0_DOMAIN && PUBLIC_AUTH0_CLIENT_ID && PUBLIC_AUTH0_CALLBACK_URL;

const requiredEnvVars = isAuthConfigured ? {
    domain: PUBLIC_AUTH0_DOMAIN,
    clientId: PUBLIC_AUTH0_CLIENT_ID,
    callbackUrl: PUBLIC_AUTH0_CALLBACK_URL
} : null;

const STORAGE_KEY = 'auth_provider';

function getStoredProvider(): AuthProvider | null {
    if (!browser) return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'google' || stored === 'discord' || stored === 'x') {
        return stored;
    }
    return null;
}

function setStoredProvider(provider: AuthProvider | null) {
    if (!browser) return;
    if (provider) {
        localStorage.setItem(STORAGE_KEY, provider);
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

const commonScopes = 'openid profile email offline_access update:current_user_metadata';

const AUTH_CONNECTIONS: Record<AuthProvider, { connection: string; scope: string }> = {
    google: {
        connection: 'google-oauth2',
        scope: commonScopes
    },
    discord: {
        connection: 'discord',
        scope: `${commonScopes} identify`
    },
    x: {
        connection: 'twitter',
        scope: commonScopes
    }
};

function createAuthStore() {
    const { subscribe, set, update } = writable<AuthStore>({
        isAuthenticated: false,
        user: null,
        loading: !isAuthConfigured,
        auth0Client: null,
        error: null,
        provider: getStoredProvider()
    });

    let auth0: Auth0Client;

    async function init() {
        if (!browser || !isAuthConfigured) {
            update(state => ({
                ...state,
                loading: false
            }));
            return;
        }

        try {
            const config = {
                domain: requiredEnvVars!.domain,
                clientId: requiredEnvVars!.clientId,
                authorizationParams: {
                    redirect_uri: requiredEnvVars!.callbackUrl,
                    scope: commonScopes,
                    audience: `https://${requiredEnvVars!.domain}/api/v2/`,
                    response_type: 'code'
                },
                cacheLocation: 'localstorage',
                useRefreshTokens: true,
                useFormData: true
            } satisfies Auth0ClientOptions;

            auth0 = await createAuth0Client(config);
            update(state => ({ ...state, auth0Client: auth0 }));

            const query = window.location.search;
            if (query.includes("code=") || query.includes("error=")) {
                try {
                    await auth0.handleRedirectCallback();
                    window.history.replaceState({}, document.title, "/");
                } catch (error) {
                    if (error instanceof Error) {
                        if (error.message.includes('connection is not enabled')) {
                            throw new Error('Social login provider is not properly configured. Please make sure the connection is enabled in Auth0 dashboard.');
                        }
                        if (error.message.includes('Unauthorized')) {
                            throw new Error('Authentication failed. Please check your Auth0 application settings and make sure the callback URL is properly configured.');
                        }
                    }
                    throw error;
                }
            }

            const isAuthenticated = await auth0.isAuthenticated();
            const user = isAuthenticated ? await auth0.getUser() ?? null : null;

            if (!isAuthenticated) {
                setStoredProvider(null);
            }

            update(state => ({
                ...state,
                isAuthenticated,
                user,
                loading: false,
                error: null
            }));
        } catch (error) {
            setStoredProvider(null);
            update(state => ({
                ...state,
                error: error as Error,
                loading: false,
                isAuthenticated: false,
                user: null,
                provider: null
            }));
            throw error;
        }
    }

    async function loginWithProvider(provider: AuthProvider) {
        if (!browser || !auth0) return;
        try {
            if (!requiredEnvVars!.callbackUrl) {
                throw new Error('Missing callback URL configuration');
            }

            const connection = AUTH_CONNECTIONS[provider];
            setStoredProvider(provider);
            update(state => ({ ...state, provider }));

            await auth0.loginWithRedirect({
                authorizationParams: {
                    redirect_uri: requiredEnvVars!.callbackUrl,
                    connection: connection.connection,
                    scope: connection.scope,
                    audience: `https://${requiredEnvVars!.domain}/api/v2/`,
                    response_type: 'code'
                }
            });
        } catch (error) {
            setStoredProvider(null);
            update(state => ({ ...state, error: error as Error, provider: null }));
            throw error;
        }
    }

    async function logout() {
        if (!browser || !auth0) return;
        try {
            setStoredProvider(null);
            update(state => ({ ...state, provider: null }));
            await auth0.logout({
                logoutParams: {
                    returnTo: window.location.origin
                }
            });
        } catch (error) {
            update(state => ({ ...state, error: error as Error }));
            throw error;
        }
    }

    async function updateUserMetadata(metadata: Record<string, any>) {
        if (!browser || !auth0) return;

        try {
            const token = await auth0.getTokenSilently({
                authorizationParams: {
                    audience: `https://${requiredEnvVars!.domain}/api/v2/`,
                }
            });
            const userId = (await auth0.getUser())?.sub;

            if (!userId) throw new Error('No user ID found');

            const response = await fetch(`https://${requiredEnvVars!.domain}/api/v2/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_metadata: metadata
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Auth0 API Error:', errorData);
                throw new Error('Failed to update user metadata');
            }

            // Update the local user state
            update(state => ({
	            ...state,
	            user: state.user ? {
		            ...state.user,
		            user_metadata: {
			            ...state.user.user_metadata,
			            ...metadata,
		            },
	            } : null,
            }));
        } catch (error) {
            console.error('Error updating user metadata:', error);
            throw error;
        }
    }

    return {
        subscribe,
        init,
        loginWithProvider,
        logout,
        updateUserMetadata
    };
}

export const auth = createAuthStore();
export const userProfile = derived(auth, $auth => $auth.user);
