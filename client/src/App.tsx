import { createSignal, onCleanup } from 'solid-js';
import { io, Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { type User } from '../../types';
import CodeInput from './CodeInput';

export function App() {
    if (import.meta.env.MODE === 'development') {
        return <Game />;
    }

    if ('Accelerometer' in window) {
        return <Game />;
    } else {
        return (
            <div class='bg-zinc-800 w-full min-h-screen flex flex-col gap-4 justify-center items-center text-center'>
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
    const [isAdmin, setIsAdmin] = createSignal(false);
    const [leaderboard, setLeaderboard] = createSignal<User[]>([]);
    const [error, setLoginError] = createSignal('');

    let socket: Socket<DefaultEventsMap, DefaultEventsMap>;
    const connectSocket = (gameToken: string) => {
        socket = io(import.meta.env.VITE_SOCKET_URL, {
            auth: { gameToken },
        });

        socket.on('auth_error', (message: string) => {
            setLoginError(message);
            setIsAuthenticated(false);
        });

        socket.on('user_data', (user: User) => {
            setName(user.name);
            setCount(user.score);
            setIsAuthenticated(true);
            setIsAdmin(user.isAdmin);
            setLoginError('');
            localStorage.setItem('gameToken', gameToken);
        });

        socket.on('count', (c: number) => {
            setCount(c);
        })

        socket.on('leaderboard', setLeaderboard);
    };

    const login = () => {
        const token = gameToken();
        if (token.trim() === '') {
            setLoginError('Musíš zadat kódík hlupáčku!');
            return;
        }
        setLoginError('');
        connectSocket(token);
    };

    const logout = () => {
        socket.close();
        setIsAuthenticated(false);
    }

    const getRandomInt = (min: number, max: number): number => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const randomPlaceholder = () => {
        const placeholders = [
            "tvojemama",
            "neuhodnes",
            "typicokamotojeamongus",
            "0d9e.tech x Radeksoft",
            "ඞඞඞඞඞ",
        ];

        return placeholders[getRandomInt(0, placeholders.length - 1)]
    }

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
                    socket.emit('fap');
                    return newCount;
                });
            } else if (accelerometer.y !== undefined && isShaking && accelerometer.y < 12) {
                isShaking = false;
            }
        });

        accelerometer.start();

        onCleanup(() => {
            accelerometer.stop();
        });
    }

    return (
        <div class="bg-zinc-800 w-full min-h-screen flex flex-col text-slate-300">
            {!isAuthenticated() ? (
                <CodeInput
                    gameToken={gameToken}
                    setGameToken={setGameToken}
                    login={login}
                    error={error}
                    randomPlaceholder={randomPlaceholder}
                />
            ) : (
                <div class="flex flex-col w-full h-full">
                    <details class='w-full p-3'>
                        <summary class='text-right text-sm'>Přihlášen jako {name()}</summary>
                        <button class='' onclick={() => logout()}>Odhlásit</button>

                        {import.meta.env.MODE === 'development' && (
                            <div class="flex justify-center">
                                <button
                                    onClick={() => socket.emit('fap')}
                                    class="bg-red-500 text-white px-4 py-2 rounded-xl"
                                >
                                    send sex
                                </button>
                            </div>
                        )}
                    </details>
                    <div class="mx-auto mt-5">
                        <p class="text-center text-4xl">{count()}</p>
                    </div>
                    <div class="rounded-xl bg-zinc-900 p-3 my-5 mx-4">
                        <table class="w-full text-left">
                            <tbody>
                                {leaderboard().map((user, index) => (
                                    <tr class="border-b border-zinc-700">
                                        <td class="p-2 text-center">{index + 1}</td>
                                        <td class="px-1 py-2 text-center">
                                            <span
                                                class={`inline-block w-3 h-3 rounded-full ${user.isLive ? 'bg-green-500' : 'bg-gray-500'
                                                    }`}
                                                aria-label={user.isLive ? 'Online' : 'Offline'}
                                            ></span>
                                        </td>
                                        <td
                                            class={`p-2 ${user.name === name() ? 'font-bold' : ''}`}
                                        >
                                            {user.name}
                                        </td>
                                        <td class="p-2 text-right">{user.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {isAdmin() &&
                        <details class='p-2' id='admin'>
                            <summary>ADMIN STUFF</summary>

                            <div>
                                <input type="text" placeholder='username' />
                                <button>create new user</button>
                            </div>

                            <div>
                                <h2>AUDIT LOG</h2>
                                <div id='auditlog' class='flex flex-col'>

                                </div>
                            </div>
                        </details>}
                </div>
            )}
        </div>
    );
}