export interface User {
    name: string;
    perfap: number;
    faps: number;
    score: number;
    isLive: boolean;
    isAdmin: boolean;
}

export interface GameEvent {
    title: string;
    description: string;
    eventEnd: Date;
    multiplier: number;
}