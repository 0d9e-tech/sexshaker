import { Server } from 'socket.io';
import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { readFileSync } from 'fs';
import { type User } from '../types';
import path from 'path';
import fs from 'fs';

const PORT = 8080;

// Users database
let users: Map<string, User> = new Map([
    ['lmao', { name: 'Kubik', score: 0, isLive: false }],
    ['nope', { name: 'Nikdo', score: 412435, isLive: true}],
    ['hehe', { name: 'offlinetypek', score: 41212435, isLive: false}]
]);

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

// Create Socket.IO server
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

setInterval(() => updateLeaderboard(), 5000);

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

    // console.log(`live users: ${liveUsers.entries().toArray().map(x => x[0]).join(', ')}`);

    // Set up event listeners for authenticated users
    socket.on('fap', () => {
        user.score += 1;
        socket.emit('user_data', user);
    });

    socket.on('disconnect', () => {
        user.isLive = false;
        console.log(`${user.name} disconnected`);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on ${process.env.NODE_ENV === 'production' ? 'http' : 'https'}://0.0.0.0:${PORT}`);
});