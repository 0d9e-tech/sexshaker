import { createSignal, onCleanup } from 'solid-js';
import { io, Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';

interface User {
    name: string;
    score: number;
}

export function App() {
    if (import.meta.env.MODE === 'development') {
        return <Game />;
    }

    if ('Accelerometer' in window) {
        return <Game />;
    } else {
        return (
            <div class='bg-zinc-800 w-full min-h-screen flex flex-col gap-4 justify-center items-center'>
                <p class='text-slate-300 text-4xl'>Your browser does not support the accelerometer API.</p>
                <p class='text-slate-300 text-4xl'>Use your mobile device.</p>
            </div>
        );
    }
}

function Game() {
    const [gameToken, setGameToken] = createSignal('');
    const [isAuthenticated, setIsAuthenticated] = createSignal(false);
    const [count, setCount] = createSignal(0);
    const [name, setName] = createSignal('');
    const [debugMessage, setDebugMessage] = createSignal('');
    // const [leaderboard, setLeaderboard] = createSignal([]);
    const [error, setError] = createSignal('');

    let socket: Socket<DefaultEventsMap, DefaultEventsMap>;
    const connectSocket = (gameToken: string) => {
        socket = io(import.meta.env.VITE_SOCKET_URL, {
            auth: { gameToken },
        });

        socket.on('auth_error', (message: string) => {
            setError(message);
            setIsAuthenticated(false);
            localStorage.removeItem('gameToken');
        });

        socket.on('user_data', (user: User) => {
            setName(user.name);
            setCount(user.score);
            setIsAuthenticated(true);
            setError('');
            localStorage.setItem('gameToken', gameToken);
        });

        // socket.on('leaderboard', setLeaderboard);
    };

    const handleLogin = () => {
        const token = gameToken();
        if (token.trim() === '') {
            setError('Game token cannot be empty.');
            return;
        }
        setError(''); 
        connectSocket(token);
    };

    const storedToken = localStorage.getItem('gameToken');
    if (storedToken && !isAuthenticated()) {
        setGameToken(storedToken);
        connectSocket(storedToken);
    }

    if (import.meta.env.MODE !== 'development') {
        let isShaking = false;
        const accelerometer = new Accelerometer({ frequency: 60 });

        accelerometer.addEventListener('reading', () => {
            if (accelerometer.y !== undefined && !isShaking && accelerometer.y > 12) {
                isShaking = true;
                setCount((prevCount) => {
                    const newCount = prevCount + 1;
                    setDebugMessage(`fapped! ${newCount}`)
                    socket.emit('fap');
                    return newCount;
                });
            } else if (accelerometer.y !== undefined && isShaking && accelerometer.y < 12) {
                isShaking = false;
            }
        });

        accelerometer.start();
        setDebugMessage(`${accelerometer.activated}, ${accelerometer.hasReading}`)

        onCleanup(() => {
            accelerometer.stop();
        });
    }

    return (
        <div class="bg-zinc-800 w-full min-h-screen flex flex-col text-slate-300">
            {!isAuthenticated() ? (
                <div class="flex flex-col justify-center items-center h-full gap-4">
                    <h1 class="text-4xl mb-4">Enter Your Game Token</h1>
                    <input
                        type="text"
                        value={gameToken()}
                        onInput={(e) => setGameToken(e.currentTarget.value)}
                        class="p-2 rounded bg-zinc-700 text-white w-64 text-center"
                        placeholder="Game Token"
                    />
                    <button
                        onClick={handleLogin}
                        class="bg-blue-500 text-white px-4 py-2 rounded-xl mt-2"
                    >
                        Submit
                    </button>
                    {error() && <p class="text-red-500 mt-2">{error()}</p>}
                </div>
            ) : (
                <div class="flex flex-col">
                    <div class="mx-auto mt-5">
                        <p>user: {name()}</p>
                        <p>sex count</p>
                        <p><b>{debugMessage()}</b></p>
                        <p class="text-center text-4xl">{count()}</p>
                    </div>
                    <div class="rounded-xl bg-zinc-900 p-3 my-5 mx-4">
                        <table class="w-full text-left">
                            <tbody>
                                {/* {leaderboard().map((user) => (
                                    <tr class="border-b border-zinc-700">
                                        <td class="p-2">{user.name}</td>
                                        <td class="p-2 text-right">{user.score}</td>
                                    </tr>
                                ))} */}
                            </tbody>
                        </table>
                    </div>

                    { import.meta.env.MODE === 'development' && (
                        <div class="flex justify-center">
                            <button
                                onClick={() => socket.emit('fap')}
                                class="bg-red-500 text-white px-4 py-2 rounded-xl"
                            >
                                send sex
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}