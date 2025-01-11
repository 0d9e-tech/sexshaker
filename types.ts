export interface User {
    name: string;
    perfap: number;
    faps: number;
    score: number;
    isLive: boolean;
    isAdmin: boolean;
    devky: number;
    hentai: number;
    isBlocked: boolean;
    whoBlockedPlayer: string;
    nextBlockingAvailable: Date | null;
    blockEndTime: Date | null;
}

export interface GameEvent {
    title: string;
    description: string;
    eventEnd: Date;
    multiplier: number;
}