import { Server } from 'socket.io';
import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { readFileSync } from 'fs';
import { type GameEvent, type User } from '../types';
import { calculateMilenaUpgradeCost, calculatePerFapUpgradeCost } from '../functions';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

interface Storage {
    users: Record<string, User>;
    currentEvent: GameEvent | null;
}

interface BlockSettings {
    blockDuration: number;
    cooldownDuration: number;
}

let blockSettings: BlockSettings = {
    blockDuration: 1,
    cooldownDuration: 5
};


const PORT = 8080;
const MAX_AUDIT_LOGS = 100;

const defaultUser: User = {
    name: '',
    score: 0,
    perfap: 1,
    faps: 0,
    isLive: false,
    isAdmin: false,
    devky: 0,
    isBlocked: false,
    whoBlockedPlayer: '',
    nextBlockingAvailable: null,
    blockEndTime: null,
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
    perfap: user.perfap || defaultUser.perfap,
    devky: user.devky || defaultUser.devky,
    isBlocked: user.isBlocked || defaultUser.isBlocked,
    whoBlockedPlayer: user.whoBlockedPlayer || defaultUser.whoBlockedPlayer,
    nextBlockingAvailable: user.nextBlockingAvailable || defaultUser.nextBlockingAvailable,
    blockEndTime: user.blockEndTime || defaultUser.blockEndTime,
});

const checkEventStatus = () => {
    if (currentEvent && new Date() >= new Date(currentEvent.eventEnd)) {
        const eventTitle = currentEvent.title;
        currentEvent = null;
        io.emit('event_ended', eventTitle);
        addAuditLog(`Event "${eventTitle}" has ended`, 'SYSTEM');
        saveStorage(users, currentEvent);
    }
};

const initializeStorage = (): { users: Map<string, User>; currentEvent: GameEvent | null } => {
    try {
        const data = fs.readFileSync(storagePath, 'utf8');
        const parsed: Storage = JSON.parse(data);

        // Convert users object to Map
        const userEntries: [string, User][] = Object.entries(parsed.users).map(([key, value]) => [
            key,
            {
                ...ensureUserFields(value),
                isLive: false  // Force all users to be offline on server startup
            }
        ]);

        // Convert event date string back to Date object if event exists
        const event = parsed.currentEvent ? {
            ...parsed.currentEvent,
            eventEnd: new Date(parsed.currentEvent.eventEnd)
        } : null;

        return {
            users: new Map<string, User>(userEntries),
            currentEvent: event
        };
    } catch (error) {
        console.error('Failed to load storage.json:', error);
        return {
            users: new Map<string, User>(),
            currentEvent: null
        };
    }
};

const saveStorage = (users: Map<string, User>, currentEvent: GameEvent | null) => {
    try {
        const storage: Storage = {
            users: Object.fromEntries(users),
            currentEvent
        };
        fs.writeFileSync(storagePath, JSON.stringify(storage, null, 2), 'utf8');
    } catch (error) {
        console.error('Failed to save storage.json:', error);
    }
};

const storagePath = path.join(__dirname, 'storage.json');
const { users, currentEvent: initialEvent } = initializeStorage();
let currentEvent = initialEvent;

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

setInterval(() => {
    Array.from(users.entries()).forEach(e => {
        const user = e[1];
        if (user.devky > 0 && !user.isBlocked) {
            user.score += currentEvent ? user.devky * user.perfap * currentEvent.multiplier : user.devky * user.perfap;
        }
    })
}, 15000);

setInterval(checkEventStatus, 20000);
setInterval(() => updateLeaderboard(), 5000);
setInterval(() => saveStorage(users, currentEvent), 60000);

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

    const checkBlockExpiry = () => {
        const now = new Date();
        if (user.isBlocked && user.blockEndTime && now >= new Date(user.blockEndTime)) {
            console.log(`unblocking ${user.name}`)
            user.isBlocked = false;
            user.whoBlockedPlayer = '';
            user.blockEndTime = null;
            socket.emit('user_data', user);
            addAuditLog(`${user.name}'s block has expired`, 'SYSTEM');
        }
    }

    setInterval(() => checkBlockExpiry(), 5000);
    checkBlockExpiry();

    if (user.isAdmin) {
        socket.emit('audit_log_history', auditLogs);
    }

    if (currentEvent) {
        socket.emit('event_update', currentEvent);
    }

    socket.on('fap', () => {
        if (user.isBlocked) return;

        const scoreIncrease = currentEvent ? user.perfap * currentEvent.multiplier : user.perfap;

        if (Number.isNaN(scoreIncrease)) {
            console.log('fuck');
            return;
        }

        user.score += scoreIncrease;
        user.faps += 1;
        socket.emit('count', user.score);
    });

    socket.on('upgrade_perfap', () => {
        const upgradeCost = calculatePerFapUpgradeCost(user.perfap);

        if (user.score >= upgradeCost) {
            user.score -= upgradeCost;
            user.perfap *= 2;

            socket.emit('user_data', user);
            socket.emit('count', user.score);
            addAuditLog(`${user.name} upgraded their PerFap to ${user.perfap}`, 'SYSTEM');

            saveStorage(users, currentEvent);
            updateLeaderboard();
        }
    });

    socket.on('upgrade_milena', () => {
        const upgradeCost = calculateMilenaUpgradeCost(user.devky);

        if (user.score >= upgradeCost) {
            user.score -= upgradeCost;
            user.devky += 1;

            socket.emit('user_data', user);
            socket.emit('count', user.score);
            addAuditLog(`${user.name} bought a milena (now has ${user.devky})`, 'SYSTEM');

            saveStorage(users, currentEvent);
            updateLeaderboard();
        }
    });

    socket.on('block_user', (targetUsername: string) => {
        const target = Array.from(users.values()).find(u => u.name === targetUsername);
        if (!target || !user || user.isBlocked || target.isBlocked) return;

        if (targetUsername == user.name)
            return;

        const now = new Date();
        if (user.nextBlockingAvailable && now < user.nextBlockingAvailable) return;

        target.isBlocked = true;
        target.whoBlockedPlayer = user.name;
        target.blockEndTime = new Date(now.getTime() + blockSettings.blockDuration * 60000);

        user.nextBlockingAvailable = new Date(now.getTime() + blockSettings.cooldownDuration * 60000);

        addAuditLog(`${user.name} blocked ${target.name} for ${blockSettings.blockDuration} minutes`, 'SYSTEM');
        io.emit('user_blocked', { blocker: user.name, blocked: target.name });
        socket.emit('user_data', user);

        saveStorage(users, currentEvent);
    });

    socket.on('disconnect', () => {
        user.isLive = false;
        console.log(`${user.name} disconnected`);
    });

    // ADMIN STUFF

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

        saveStorage(users, currentEvent);
        updateLeaderboard();
    });

    socket.on('user_info', (username: string) => {
        if (!user.isAdmin) return;

        const userEntry = Array.from(users.entries()).find(([_, u]) => u.name === username);
        if (!userEntry) {
            addAuditLog(`Failed to fetch user ${username} (user not found)`, user.name);
            return;
        }

        addAuditLog(`user info: ${JSON.stringify(userEntry, null, 2)}`, 'SYSTEM')
    })

    socket.on('user_toggle_admin', (username: string) => {
        if (!user.isAdmin || username == 'kubík') return;

        const userEntry = Array.from(users.entries()).find(([_, u]) => u.name === username);
        if (!userEntry) {
            addAuditLog(`Failed to fetch user ${username} (user not found)`, user.name);
            return;
        }

        const userToModify = userEntry[1];
        userToModify.isAdmin = !userToModify.isAdmin;

        socket.emit('user_data', user);
        addAuditLog(`Modified ${userToModify.name} admin status: ${userToModify.isAdmin}`, user.name);
    })

    socket.on('delete_user', (username: string) => {
        if (!user.isAdmin || username == 'kubík') return;

        const userEntry = Array.from(users.entries()).find(([_, u]) => u.name === username);
        if (!userEntry) {
            addAuditLog(`Failed to delete user ${username} (user not found)`, user.name);
            return;
        }

        if (userEntry[1].isAdmin) {
            addAuditLog(`Failed to delete user ${username} (user is admin)`, user.name);
            return;
        }

        users.delete(userEntry[0]);
        addAuditLog(`Deleted user "${username}"`, user.name);

        saveStorage(users, currentEvent);
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

        saveStorage(users, currentEvent);
        updateLeaderboard();
    });

    socket.on('create_event', (event: Omit<GameEvent, 'eventEnd'> & { eventEnd: string }) => {
        if (!user.isAdmin) return;

        if (currentEvent) {
            addAuditLog(`Failed to create event "${event.title}" (another event is already active)`, user.name);
            return;
        }

        console.log({ event });

        currentEvent = {
            ...event,
            eventEnd: new Date(event.eventEnd)
        };

        addAuditLog(
            `Created new event "${event.title}" with ${event.multiplier}x multiplier, ending at ${currentEvent.eventEnd.toLocaleString()}`,
            user.name
        );

        io.emit('event_update', currentEvent);
        saveStorage(users, currentEvent);
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
            `Edited event "${oldTitle}" -> "${event.title}" with ${event.multiplier}x multiplier, ending at ${currentEvent.eventEnd.toLocaleString()}`,
            user.name
        );

        io.emit('event_update', currentEvent);
        saveStorage(users, currentEvent);
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
        saveStorage(users, currentEvent);
    });

    socket.on('update_block_settings', (settings: BlockSettings) => {
        if (!user.isAdmin) return;

        blockSettings = settings;
        addAuditLog(
            `Updated block settings: duration=${settings.blockDuration}min, cooldown=${settings.cooldownDuration}min`,
            user.name
        );
    });

    socket.on('admin_block_user', (username: string) => {
        if (!user.isAdmin) return;

        const target = Array.from(users.values()).find(u => u.name === username);
        if (!target) return;

        target.isBlocked = true;
        target.whoBlockedPlayer = 'Admin';
        target.blockEndTime = new Date(Date.now() + blockSettings.blockDuration * 60000);

        addAuditLog(`Admin ${user.name} blocked ${target.name}`, 'SYSTEM');
        io.emit('user_blocked', { blocker: 'Admin', blocked: target.name });

        saveStorage(users, currentEvent);
    });

    socket.on('admin_unblock_user', (username: string) => {
        if (!user.isAdmin) return;

        const target = Array.from(users.values()).find(u => u.name === username);
        if (!target) return;

        target.isBlocked = false;
        target.whoBlockedPlayer = '';
        target.blockEndTime = null;

        addAuditLog(`Admin ${user.name} unblocked ${target.name}`, 'SYSTEM');
        io.emit('user_unblocked', target.name);

        saveStorage(users, currentEvent);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on ${process.env.NODE_ENV === 'production' ? 'http' : 'https'}://0.0.0.0:${PORT}`);
});