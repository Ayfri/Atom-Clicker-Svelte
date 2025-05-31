export type AuthProvider = 'google' | 'discord' | 'x';

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
