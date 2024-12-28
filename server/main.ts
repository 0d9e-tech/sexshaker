import { Server } from 'socket.io';
import { createServer } from 'https';
import { readFileSync } from 'fs';

interface User {
    name: string;
    score: number;
}

const PORT = 8080;
const leaderboard: User[] = [];

// Load the SSL certificates
// These will be created using mkcert (instructions below)
const httpsOptions = {
    key: readFileSync('localhost-key.pem'),
    cert: readFileSync('localhost.pem')
};

// Create HTTPS server with our trusted certificates
const httpsServer = createServer(httpsOptions);

// Create Socket.IO server
const io = new Server(httpsServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
});

let users: { [gameToken: string]: User } = {
    'lmao': {
        'name': 'Kubik',
        'score': 300,
    }
}

io.on('connection', (socket) => {
    const gameToken = socket.handshake.auth.gameToken || `User-${socket.id}`;
    console.log(`connection attempt with code ${gameToken}`);
    
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
        console.log(`user with ${gameToken} disconnected`);
    });
});


httpsServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Secure server running on https://0.0.0.0:${PORT}`);
});