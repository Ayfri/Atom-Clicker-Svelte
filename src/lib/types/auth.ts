import type { Auth0Client, User } from '@auth0/auth0-spa-js';
import type { GameState } from '../types';

export type AuthProvider = 'google' | 'discord' | 'x';

export interface Auth0UserMetadata {
    username?: string;
    lastCloudSave?: number;
    cloudSaveInfo?: GameState & { version: number };
}

export interface Auth0User extends User {
    user_metadata?: Auth0UserMetadata;
}

export interface AuthStore {
    isAuthenticated: boolean;
    user: Auth0User | null;
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
