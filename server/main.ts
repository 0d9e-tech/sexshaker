import { Server } from 'socket.io';
import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { readFileSync } from 'fs';
import { type GameEvent, type User } from '../types';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const PORT = 8080;
const MAX_AUDIT_LOGS = 100;

const storagePath = path.join(__dirname, 'storage.json');
let currentEvent: GameEvent | null = null;

const defaultUser: User = {
    name: '',
    score: 0,
    faps: 0,
    isLive: false,
    isAdmin: false,
};

const generateGameToken = (length: number): string => {
    const vowels = "AEIOUaeiou";
    const consonants = "BCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz";
    let token = "";

    const getRandomIndex = (poolLength: number) => {
        const randomValue = crypto.randomBytes(1)[0];
        return randomValue % poolLength;
    };

    for (let i = 0; i < length; i++) {
        const charPool = i % 2 === 0 ? consonants : vowels;
        const randomIndex = getRandomIndex(charPool.length);
        token += charPool[randomIndex];
    }

    return token;
};

const ensureUserFields = (user: Partial<User>): User => ({
    name: user.name || defaultUser.name,
    score: user.score || defaultUser.score,
    faps: user.faps || defaultUser.faps,
    isLive: user.isLive || defaultUser.isLive,
    isAdmin: user.isAdmin || defaultUser.isAdmin,
});

const checkEventStatus = () => {
    if (currentEvent && new Date() >= currentEvent.eventEnd) {
        const eventTitle = currentEvent.title;
        currentEvent = null;
        io.emit('event_ended', eventTitle);
        addAuditLog(`Event "${eventTitle}" has ended`, 'SYSTEM');
    }
};

const initializeUsers = (): Map<string, User> => {
    try {
        const data = fs.readFileSync(storagePath, 'utf8');
        const parsed: Record<string, Partial<User>> = JSON.parse(data);

        const userEntries: [string, User][] = Object.entries(parsed).map(([key, value]) => [
            key,
            {
                ...ensureUserFields(value),
                isLive: false  // Force all users to be offline on server startup
            }
        ]);

        return new Map<string, User>(userEntries);
    } catch (error) {
        console.error('Failed to load storage.json:', error);
        return new Map<string, User>();
    }
};

const saveUsers = (users: Map<string, User>) => {
    try {
        const usersObject = Object.fromEntries(users);
        fs.writeFileSync(storagePath, JSON.stringify(usersObject, null, 2), 'utf8');
    } catch (error) {
        console.error('Failed to save storage.json:', error);
    }
};

const auditLogs: string[] = [];
const addAuditLog = (message: string, admin_name: string) => {
    const timestamp = new Date().toLocaleString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const logWithTimestamp = `${timestamp} ${admin_name} - ${message}`;
    auditLogs.unshift(logWithTimestamp);

    if (auditLogs.length > MAX_AUDIT_LOGS) {
        auditLogs.pop();
    }

    io.emit('audit_log', logWithTimestamp);
    console.log(logWithTimestamp);
};

const users: Map<string, User> = initializeUsers();

let server;
if (process.env.NODE_ENV === 'production') {
    console.log('Starting in production mode: using HTTP (secured with Caddy)');
    server = createHttpServer();
} else {
    console.log('Starting in development mode: using HTTPS');
    const httpsOptions = {
        key: readFileSync('localhost-key.pem'),
        cert: readFileSync('localhost.pem'),
    };
    server = createServer(httpsOptions);
}

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const updateLeaderboard = () => {
    const sorted = Array.from(users.entries())
        .map(([_, user]) => user)
        .sort((a, b) => b.score - a.score);
    io.emit('leaderboard', sorted);
};

setInterval(checkEventStatus, 5000);
setInterval(() => updateLeaderboard(), 5000);
setInterval(() => saveUsers(users), 5000);  // TODO: make this better ig

io.on('connection', (socket) => {
    const gameToken = socket.handshake.auth.gameToken || `User-${socket.id}`;
    console.log(`Connection attempt with code ${gameToken}`);

    let user: User | undefined = undefined;
    if (users.has(gameToken)) {
        user = users.get(gameToken);

        if (!user) {
            socket.emit('auth_error', 'Něco se posralo, prosím napiš Kubíkovi.');
            return;
        }

        console.log(`${gameToken} is ${user.name} with ${user.score} points`);
    } else {
        console.log(`${gameToken} is invalid, rejecting connection`);
        socket.emit('auth_error', 'Naplatný kódík.');
        return;
    }

    if (user?.isLive) {
        console.log(`${gameToken} already active, closing connection`);
        socket.emit('auth_error', 'Už jsi přihlášený na jiném zařízení!');
        return;
    }

    // AUTHENTICATED

    socket.emit('user_data', user);
    user.isLive = true;
    updateLeaderboard();

    if (user.isAdmin) {
        socket.emit('audit_log_history', auditLogs);
    }

    if (currentEvent) {
        socket.emit('event_update', currentEvent);
    }

    socket.on('fap', () => {
        const scoreIncrease = currentEvent ? currentEvent.scorePerFap : 1;
        user.score += scoreIncrease;
        socket.emit('count', user.score);
    });

    socket.on('disconnect', () => {
        user.isLive = false;
        console.log(`${user.name} disconnected`);
    });

    socket.on('new_user', (username: string) => {
        if (!user.isAdmin) return;

        if (Array.from(users.values()).find(x => x.name == username) !== undefined) {
            addAuditLog(`User ${username} cannot be created (username is already taken)`, user.name);
            return;
        }

        let newGameToken: string;
        do {
            newGameToken = generateGameToken(10);
        } while (users.has(newGameToken));

        const newUser: User = {
            ...defaultUser,
            name: username
        };

        users.set(newGameToken, newUser);

        // Use the new audit log function
        addAuditLog(`Created new user "${username}" with game token ${newGameToken}`, user.name);

        saveUsers(users);
        updateLeaderboard();
    });

    socket.on('delete_user', (username: string) => {
        if (!user.isAdmin) return;

        const userEntry = Array.from(users.entries()).find(([_, u]) => u.name === username);
        if (!userEntry) {
            addAuditLog(`Failed to delete user ${username} (user not found)`, user.name);
            return;
        }

        users.delete(userEntry[0]);
        addAuditLog(`Deleted user "${username}"`, user.name);

        saveUsers(users);
        updateLeaderboard();
    });

    socket.on('rename_user', (oldN: string, newN: string) => {
        if (!user.isAdmin) return;

        if (Array.from(users.values()).find(x => x.name == newN) !== undefined) {
            addAuditLog(`Failed to rename user ${oldN} to ${newN} (username is already taken)`, user.name);
            return;
        }

        const userEntry = Array.from(users.entries()).find(([_, u]) => u.name === oldN);
        if (!userEntry) {
            addAuditLog(`Failed to rename user ${oldN} to ${newN} (user not found)`, user.name);
            return;
        }

        const ruser = users.get(userEntry[0]);
        ruser!.name = newN;

        addAuditLog(`Renamed "${oldN}" to "${newN}"`, user.name);

        saveUsers(users);
        updateLeaderboard();
    });

    socket.on('create_event', (event: Omit<GameEvent, 'eventEnd'> & { eventEnd: string }) => {
        if (!user.isAdmin) return;

        if (currentEvent) {
            addAuditLog(`Failed to create event "${event.title}" (another event is already active)`, user.name);
            return;
        }

        currentEvent = {
            ...event,
            eventEnd: new Date(event.eventEnd)
        };

        addAuditLog(
            `Created new event "${event.title}" with ${event.scorePerFap}x multiplier, ending at ${currentEvent.eventEnd.toLocaleString()}`,
            user.name
        );

        io.emit('event_update', currentEvent);
    });

    socket.on('edit_event', (event: Omit<GameEvent, 'eventEnd'> & { eventEnd: string }) => {
        if (!user.isAdmin) return;

        if (!currentEvent) {
            addAuditLog('Failed to edit event (no active event)', user.name);
            return;
        }

        const oldTitle = currentEvent.title;
        currentEvent = {
            ...event,
            eventEnd: new Date(event.eventEnd)
        };

        addAuditLog(
            `Edited event "${oldTitle}" -> "${event.title}" with ${event.scorePerFap}x multiplier, ending at ${currentEvent.eventEnd.toLocaleString()}`,
            user.name
        );

        io.emit('event_update', currentEvent);
    });

    socket.on('cancel_event', () => {
        if (!user.isAdmin) return;

        if (!currentEvent) {
            addAuditLog('Failed to cancel event (no active event)', user.name);
            return;
        }

        const eventTitle = currentEvent.title;
        currentEvent = null;
        io.emit('event_ended', eventTitle);
        addAuditLog(`Cancelled event "${eventTitle}"`, user.name);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on ${process.env.NODE_ENV === 'production' ? 'http' : 'https'}://0.0.0.0:${PORT}`);
});