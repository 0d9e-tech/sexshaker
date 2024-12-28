import { Server } from 'socket.io';
import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { readFileSync } from 'fs';

interface User {
    name: string;
    score: number;
}

const PORT = 8080;
const leaderboard: User[] = [];

// Users database
let users: { [gameToken: string]: User } = {
    'lmao': {
        'name': 'Kubik',
        'score': 300,
    },
    'mobile': {
        'name': 'mobile',
        'score': 10,
    }
};

let liveUsers = new Set<string>();

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

io.on('connection', (socket) => {
    const gameToken = socket.handshake.auth.gameToken || `User-${socket.id}`;
    console.log(`Connection attempt with code ${gameToken}`);

    if (liveUsers.has(gameToken)) {
        console.log(`${gameToken} already active`);
        socket.emit('auth_error', 'You are already logged in on another device.');
        return;
    }

    let user: User | undefined = undefined;
    if (gameToken in users) {
        user = users[gameToken];
        console.log(`${gameToken} is ${user.name} with ${user.score} points`);
    } else {
        console.log(`${gameToken} is invalid, rejecting connection`);
        socket.emit('auth_error', 'Invalid game token');
        return;
    }

    // AUTHENTICATED

    liveUsers.add(gameToken);
    socket.emit('user_data', user);

    console.log('live users:')
    liveUsers.entries().forEach(element => {
        console.log(element);
    });

    // Set up event listeners for authenticated users
    socket.on('fap', () => {
        users[gameToken].score += 1;
        socket.emit('user_data', user);
        console.log(`${users[gameToken].name} fapped!`);
    });

    socket.on('disconnect', () => {
        liveUsers.delete(gameToken);
        console.log(`User with ${gameToken} disconnected`);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on ${process.env.NODE_ENV === 'production' ? 'http' : 'https'}://0.0.0.0:${PORT}`);
});