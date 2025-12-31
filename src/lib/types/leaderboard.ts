export interface LeaderboardEntry {
    atoms: number;
    lastUpdated: number;
    level: number;
    is_online?: boolean;
    picture?: string;
    rank: number;
    self?: boolean;
    userId?: string;
    username: string;
}
