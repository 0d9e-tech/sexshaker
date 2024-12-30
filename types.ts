export interface User {
    name: string;
    faps: number;
    score: number;
    isLive: boolean;
    isAdmin: boolean;
}

export interface GameEvent {
    title: string;
    description: string;
    eventEnd: Date;
    scorePerFap: number;
}