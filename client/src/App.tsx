import { createSignal, onCleanup } from 'solid-js';
import { io, Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { type User } from '../../types';
import CodeInput from './CodeInput';

const isIOS = () => {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

export function App() {
    if (import.meta.env.MODE === 'development') {
        return <Game />;
    }

    if ('Accelerometer' in window || (window.DeviceMotionEvent && isIOS())) {
        return <Game />;
    } else {
        return (
            <div class='bg-zinc-800 w-full min-h-screen flex flex-col gap-4 justify-center items-center text-center'>
                <p class='text-slate-300 text-4xl'>Your browser does not support motion detection.</p>
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
    const [auditLogs, setAuditLogs] = createSignal<string[]>([]);
    const [motionPermission, setMotionPermission] = createSignal<boolean>(false);

    let socket: Socket<DefaultEventsMap, DefaultEventsMap>;

    const requestMotionPermission = async () => {
        if (isIOS()) {
            // @ts-expect-error - undocumented api, iphones are stupid
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                try {
                    // @ts-expect-error shut up
                    const permissionState = await DeviceMotionEvent.requestPermission();
                    setMotionPermission(permissionState === 'granted');
                    if (permissionState === 'granted') {
                        initializeMotionTracking();
                    }
                } catch (error) {
                    console.error('Error requesting motion permission:', error);
                    setLoginError('Je potřeba povolit přístup ke gyroskopu!');
                }
            } else {
                setMotionPermission(true);
                initializeMotionTracking();
            }
        } else {
            setMotionPermission(true);
            initializeMotionTracking();
        }
    };

    const initializeMotionTracking = () => {
        let isShaking = false;

        if (!isIOS()) {
            try {
                const accelerometer = new Accelerometer({ frequency: 60 });

                accelerometer.addEventListener('reading', () => {
                    if (accelerometer.y !== undefined && !isShaking && accelerometer.y > 12) {
                        isShaking = true;
                        fap();
                    } else if (accelerometer.y !== undefined && isShaking && accelerometer.y < 12) {
                        isShaking = false;
                    }
                });

                accelerometer.start();

                onCleanup(() => {
                    accelerometer.stop();
                });
            } catch (error) {
                // Fallback to DeviceMotion API if Accelerometer fails
                console.log("Falling back to DeviceMotion API");
                const handleMotion = (event: DeviceMotionEvent) => {
                    const acceleration = event.accelerationIncludingGravity;
                    if (acceleration && acceleration.y !== null) {
                        if (!isShaking && acceleration.y > 12) {
                            isShaking = true;
                            fap();
                        } else if (isShaking && acceleration.y < 12) {
                            isShaking = false;
                        }
                    }
                };

                window.addEventListener('devicemotion', handleMotion);

                onCleanup(() => {
                    window.removeEventListener('devicemotion', handleMotion);
                });
            }
        } else {
            const handleMotion = (event: DeviceMotionEvent) => {
                const acceleration = event.accelerationIncludingGravity;
                if (acceleration && acceleration.y !== null) {
                    if (!isShaking && acceleration.y > 12) {
                        isShaking = true;
                        fap();
                    } else if (isShaking && acceleration.y < 12) {
                        isShaking = false;
                    }
                }
            };

            window.addEventListener('devicemotion', handleMotion);

            onCleanup(() => {
                window.removeEventListener('devicemotion', handleMotion);
            });
        }
    };

    const fap = () => socket.emit('fap');

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
        });

        socket.on('leaderboard', setLeaderboard);

        socket.on('audit_log', (log: string) => {
            appendAuditLog(log);
        });

        socket.on('audit_log_history', (logs: string[]) => {
            setAuditLogs(logs);
        });
    };

    const appendAuditLog = (message: string) => setAuditLogs(prev => [message, ...prev]);

    const login = async () => {
        const token = gameToken();
        if (token.trim() === '') {
            setLoginError('Musíš zadat kódík hlupáčku!');
            return;
        }
        setLoginError('');
        await requestMotionPermission();
        if (motionPermission()) {
            connectSocket(token);
        }
    };

    const logout = () => {
        socket.close();
        setIsAuthenticated(false);
    };

    const createNewUser = () => {
        const usernameInput = document.querySelector('#admin input[type="text"]') as HTMLInputElement;
        if (usernameInput && usernameInput.value.trim() !== '') {
            socket.emit('new_user', usernameInput.value.trim());
            usernameInput.value = '';
        }
    };

    const getRandomInt = (min: number, max: number): number => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const randomPlaceholder = () => {
        const placeholders = [
            "tvojemama",
            "neuhodnes",
            "typicokamotojeamongus",
            "0d9e.tech x Radeksoft",
            "ඞඞඞඞඞ",
        ];

        return placeholders[getRandomInt(0, placeholders.length - 1)];
    };

    const shorterNum = (n: number) => {
        if (n < 10_000)
            return n.toString();
        else if (n < 100_000)
            return `${(n / 1000).toFixed(2)}k`;
        else if (n < 1_000_000)
            return `${(n / 1000).toFixed(1)}k`;
        else if (n < 10_000_000)
            return `${(n / 1000000).toFixed(2)}M`;
        else if (n < 100_000_000)
            return `${(n / 1000000).toFixed(1)}M`;
        else
            return 'kurva hodně';
    }

    const storedToken = localStorage.getItem('gameToken');
    if (storedToken) {
        setGameToken(storedToken);
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
                    <div class="rounded-xl bg-zinc-900 p-3 my-5 mx-4 flex flex-col overflow-x-scroll">
                        <table class="w-full text-left">
                            <tbody>
                                {leaderboard().map((user, index) => (
                                    <tr class="border-b border-zinc-700">
                                        <td class="p-2 text-center w-6">{index + 1}</td>
                                        <td class="py-2 pl-4 text-center w-3">
                                            <span
                                                class={`inline-block w-3 h-3 rounded-full ${user.isLive ? 'bg-green-500' : 'bg-gray-500'}`}
                                                aria-label={user.isLive ? 'Online' : 'Offline'}
                                            ></span>
                                        </td>
                                        <td class={`p-2 ${user.name === name() ? 'font-bold' : ''} break-words whitespace-normal`}>
                                            {user.name}
                                        </td>
                                        <td class="p-2 text-right sticky right-0 bg-zinc-900">{shorterNum(user.score)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {isAdmin() &&
                        <details class='p-2' id='admin'>
                            <summary>ADMIN STUFF</summary>

                            <div class='flex-row'>
                                <input type="text" placeholder='username' />
                                <button onclick={createNewUser}>create new user</button>
                            </div>

                            <div class='flex-col'>
                                <h2>AUDIT LOG</h2>
                                <div class='flex-col'>
                                    {auditLogs().map(log => (
                                        <p class="text-sm font-mono py-1 border-b border-zinc-700">
                                            {log}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </details>}
                </div>
            )}
        </div>
    );
}