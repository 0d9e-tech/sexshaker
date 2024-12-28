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
};

let server;
if (process.env.NODE_ENV === 'production') {
    console.log('Starting in production mode: using HTTP');
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

    let user: User | undefined = undefined;
    if (gameToken in users) {
        user = users[gameToken];
        console.log(`${gameToken} is ${user.name} with ${user.score} points`);
    } else {
        console.log(`${gameToken} is invalid, rejecting connection`);
        socket.emit('auth_error', 'Invalid game token');
        return;
    }

    socket.emit('user_data', user);

    // Set up event listeners for authenticated users
    socket.on('fap', () => {
        console.log(`${user.name} fapped!`);
    });

    socket.on('disconnect', () => {
        console.log(`User with ${gameToken} disconnected`);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on ${process.env.NODE_ENV === 'production' ? 'http' : 'https'}://0.0.0.0:${PORT}`);
});