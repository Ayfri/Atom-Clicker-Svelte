import type { Auth0Client, User } from '@auth0/auth0-spa-js';

export type AuthProvider = 'google' | 'discord' | 'x';

export interface AuthStore {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    auth0Client: Auth0Client | null;
    error: Error | null;
    provider: AuthProvider | null;
}

export interface AuthConnection {
    id: AuthProvider;
    name: string;
    icon: string;
    provider: AuthProvider;
    connection: string;
    scope: string;
    backgroundColor: string;
    hoverBackgroundColor: string;
    textColor: string;
}
