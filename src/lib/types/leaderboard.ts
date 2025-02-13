export interface LeaderboardEntry {
    username: string;
    atoms: number;
    level: number;
    lastUpdated: number;
    userId?: string;
    picture?: string;
    self?: boolean;
    user_metadata?: {
        username?: string;
    };
}
