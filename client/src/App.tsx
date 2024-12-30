import { createSignal, onCleanup, onMount } from 'solid-js';
import { io, Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { GameEvent, type User } from '../../types';
import CodeInput from './CodeInput';
import PerfapUpgrade from './PerfapUpgrade';
import { toText } from '../../functions';

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
    const ANDROID_THRESHOLD = 12;
    const IOS_THRESHOLD = 8;

    const [gameToken, setGameToken] = createSignal('');
    const [isAuthenticated, setIsAuthenticated] = createSignal(false);
    const [count, setCount] = createSignal(0);
    const [name, setName] = createSignal('');
    const [perFap, setPerFap] = createSignal(1);
    const [socket, setSocket] = createSignal<Socket<DefaultEventsMap, DefaultEventsMap>>();
    const [isAdmin, setIsAdmin] = createSignal(false);
    const [leaderboard, setLeaderboard] = createSignal<User[]>([]);
    const [error, setLoginError] = createSignal('');
    const [auditLogs, setAuditLogs] = createSignal<string[]>([]);
    const [motionPermission, setMotionPermission] = createSignal<boolean>(false);
    const [currentEvent, setCurrentEvent] = createSignal<GameEvent | null>(null);
    const [timeLeft, setTimeLeft] = createSignal<string>('');

    let newSocket: Socket<DefaultEventsMap, DefaultEventsMap>;

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
                    if (accelerometer.y !== undefined && !isShaking && accelerometer.y > ANDROID_THRESHOLD) {
                        isShaking = true;
                        fap();
                    } else if (accelerometer.y !== undefined && isShaking && accelerometer.y < ANDROID_THRESHOLD) {
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
                        if (!isShaking && acceleration.y > IOS_THRESHOLD) {
                            isShaking = true;
                            fap();
                        } else if (isShaking && acceleration.y < IOS_THRESHOLD) {
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
                    if (!isShaking && acceleration.y > IOS_THRESHOLD) {
                        isShaking = true;
                        fap();
                    } else if (isShaking && acceleration.y < IOS_THRESHOLD) {
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

    const preventShakeToUndo = () => {
        if (isIOS()) {
            window.addEventListener('shake', (e) => {
                e.preventDefault();
            }, true);
            
            // Also prevent the motion event that triggers shake
            window.addEventListener('motion', (e) => {
                e.preventDefault();
            }, true);
        }
    };

    const updateTimeLeft = () => {
        const event = currentEvent();
        if (!event) return;

        const now = new Date();
        const end = new Date(event.eventEnd);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) {
            setCurrentEvent(null);
            setTimeLeft('');
            return;
        }

        const minutes = Math.ceil(diff / (1000 * 60));
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            setTimeLeft(`${hours}h ${remainingMinutes}min`);
        } else {
            setTimeLeft(`${minutes}min`);
        }
    };

    const fap = () => newSocket.emit('fap');

    const connectSocket = (gameToken: string) => {
        newSocket = io(import.meta.env.VITE_SOCKET_URL, {
            auth: { gameToken },
        });

        setSocket(newSocket);

        newSocket.on('auth_error', (message: string) => {
            setLoginError(message);
            setIsAuthenticated(false);
        });

        newSocket.on('user_data', (user: User) => {
            setName(user.name);
            setCount(user.score);
            setIsAuthenticated(true);
            setPerFap(user.perfap);
            setIsAdmin(user.isAdmin);
            setLoginError('');
            localStorage.setItem('gameToken', gameToken);
        });

        newSocket.on('count', (c: number) => {
            setCount(c);
        });

        newSocket.on('leaderboard', setLeaderboard);

        newSocket.on('audit_log', (log: string) => {
            appendAuditLog(log);
        });

        newSocket.on('audit_log_history', (logs: string[]) => {
            setAuditLogs(logs);
        });

        newSocket.on('event_update', (event: GameEvent) => {
            setCurrentEvent(event);
            updateTimeLeft();
        });

        newSocket.on('event_ended', (_) => {
            setCurrentEvent(null);
            setTimeLeft('');
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
        newSocket.close();
        setIsAuthenticated(false);
    };

    const createUser = () => {
        const usernameInput = document.querySelector('#create-user-input') as HTMLInputElement;
        if (!usernameInput || usernameInput.value.trim() === '') return;

        const username = usernameInput.value.trim();
        if (confirm(`Are you sure you want to create a new user "${username}"?`)) {
            newSocket.emit('new_user', username);
            usernameInput.value = '';
        }
    };

    const deleteUser = () => {
        const usernameInput = document.querySelector('#delete-user-input') as HTMLInputElement;
        if (!usernameInput || usernameInput.value.trim() === '') return;

        const username = usernameInput.value.trim();
        if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone!`)) {
            newSocket.emit('delete_user', username);
            usernameInput.value = '';
        }
    };

    const renameUser = () => {
        const oldNE = document.querySelector('#rename-user-old') as HTMLInputElement;
        const newNE = document.querySelector('#rename-user-new') as HTMLInputElement;
        if (!oldNE || oldNE.value.trim() === '' || !newNE || newNE.value.trim() === '') return;

        const oldN = oldNE.value.trim();
        const newN = newNE.value.trim();
        if (confirm(`Are you sure you want to rename user ${oldN} to ${newN}?`)) {
            newSocket.emit('rename_user', oldN, newN);
            oldNE.value = '';
            newNE.value = '';
        }
    };

    const createEvent = () => {
        const titleInput = document.querySelector('#event-title') as HTMLInputElement;
        const descInput = document.querySelector('#event-description') as HTMLTextAreaElement;
        const endInput = document.querySelector('#event-end') as HTMLInputElement;
        const multiplierInput = document.querySelector('#event-multiplier') as HTMLInputElement;

        if (!titleInput?.value || !descInput?.value || !endInput?.value || !multiplierInput?.value) return;

        const event: Omit<GameEvent, 'eventEnd'> & { eventEnd: string } = {
            title: titleInput.value,
            description: descInput.value,
            eventEnd: endInput.value,
            multiplier: parseInt(multiplierInput.value)
        };

        if (confirm(`Are you sure you want to start event "${event.title}"?`)) {
            newSocket.emit('create_event', event);
            titleInput.value = '';
            descInput.value = '';
            endInput.value = '';
            multiplierInput.value = '';
        }
    };

    const editEvent = () => {
        const titleInput = document.querySelector('#edit-event-title') as HTMLInputElement;
        const descInput = document.querySelector('#edit-event-description') as HTMLTextAreaElement;
        const endInput = document.querySelector('#edit-event-end') as HTMLInputElement;
        const multiplierInput = document.querySelector('#edit-event-multiplier') as HTMLInputElement;

        if (!titleInput?.value || !descInput?.value || !endInput?.value || !multiplierInput?.value) return;

        const event: Omit<GameEvent, 'eventEnd'> & { eventEnd: string } = {
            title: titleInput.value,
            description: descInput.value,
            eventEnd: endInput.value,
            multiplier: parseInt(multiplierInput.value)
        };

        if (confirm(`Are you sure you want to edit event "${currentEvent()?.title}" to "${event.title}"?`)) {
            newSocket.emit('edit_event', event);
        }
    };

    const cancelEvent = () => {
        if (confirm('Are you sure you want to cancel the current event?')) {
            newSocket.emit('cancel_event');
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

    const storedToken = localStorage.getItem('gameToken');
    if (storedToken) {
        setGameToken(storedToken);
    }

    let timeInterval: number;
    onMount(() => {
        timeInterval = setInterval(updateTimeLeft, 1000);
        preventShakeToUndo();
    });

    onCleanup(() => {
        clearInterval(timeInterval);
    });

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
                                    onClick={() => newSocket.emit('fap')}
                                    class="bg-red-500 text-white px-4 py-2 rounded-xl"
                                >
                                    send sex
                                </button>
                            </div>
                        )}
                    </details>
                    <div class="mx-auto mt-5">
                        <p class="text-center text-6xl">{toText(count())}</p>
                        {currentEvent() && (
                            <div class="mt-4 p-4 bg-zinc-700 rounded-xl text-center">
                                <h3 class="text-xl font-bold">{currentEvent()?.title}</h3>
                                <p class="mt-2">{currentEvent()?.description}</p>
                                <p class="mt-2 text-sm text-center">
                                    Zbývá: {timeLeft()}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div class="rounded-xl bg-zinc-900 p-3 my-5 mx-4 flex flex-col overflow-x-scroll">
                        <table class="w-full text-left">
                            <tbody>
                                {leaderboard().map((user, index) => (
                                    <tr class={` ${user.name == name() ? 'border-4 border-green-500' : 'border-b border-zinc-700'}`}>
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
                                        <td class="p-2 text-right sticky right-0 bg-zinc-900">{toText(user.score)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div class='flex flex-col mt-6'>
                        <h2 class='font-bold text-center'>UPGRADY a AKCE</h2>
                        <PerfapUpgrade count={count()} perfap={perFap()} socket={socket()} />
                    </div>

                    {isAdmin() &&
                        <details class='p-2' id='admin'>
                            <summary>ADMIN STUFF</summary>

                            <h2 class='mt-6'>user creation</h2>
                            <div class='flex-row'>
                                <input
                                    type="text"
                                    id="create-user-input"
                                    placeholder='username to create'
                                />
                                <button onclick={createUser}>create new user</button>
                            </div>

                            <h2>user deletion</h2>
                            <div class='flex-row'>
                                <input
                                    type="text"
                                    id="delete-user-input"
                                    placeholder='username to delete'
                                />
                                <button onclick={deleteUser}>delete user</button>
                            </div>

                            <h2>user rename</h2>
                            <div class='flex-row'>
                                <div class='flex-col'>
                                    <input
                                        type="text"
                                        id="rename-user-old"
                                        placeholder='old username'
                                    />

                                    <input
                                        type="text"
                                        id="rename-user-new"
                                        placeholder='new username'
                                    />
                                </div>
                                <button onclick={renameUser}>rename user</button>
                            </div>

                            <h2>EVENT MANAGEMENT</h2>
                            {!currentEvent() && (
                                <div class='flex-col'>
                                    <input
                                        type="text"
                                        id="event-title"
                                        placeholder='Event title'
                                        class="mb-2 w-full"
                                    />
                                    <textarea
                                        id="event-description"
                                        placeholder='Event description'
                                        class="mb-2 w-full"
                                    />
                                    <input
                                        type="datetime-local"
                                        id="event-end"
                                        class="mb-2 w-full"
                                    />
                                    <input
                                        type="number"
                                        id="event-multiplier"
                                        placeholder='Score multiplier'
                                        min="0"
                                        class="mb-2 w-full"
                                    />
                                    <button onclick={createEvent}>Create Event</button>
                                </div>
                            )}

                            {currentEvent() && (
                                <div class='flex-col'>
                                    <p>Active event: {currentEvent()?.title}</p>
                                    <p>Ends at: {new Date(currentEvent()!.eventEnd).toLocaleString()}</p>

                                    <div class='flex-col'>
                                        <h3 class='mb-2'>Edit Event</h3>
                                        <input
                                            type="text"
                                            id="edit-event-title"
                                            placeholder="New event title"
                                            value={currentEvent()?.title || ''}
                                            class="mb-2 w-full"
                                        />
                                        <textarea
                                            id="edit-event-description"
                                            placeholder="New event description"
                                            value={currentEvent()?.description || ''}
                                            class="mb-2 w-full"
                                        />
                                        <input
                                            type="datetime-local"
                                            id="edit-event-end"
                                            value={
                                                currentEvent()?.eventEnd
                                                    ? new Date(new Date(currentEvent()!.eventEnd).getTime() - new Date().getTimezoneOffset() * 60000)
                                                        .toISOString()
                                                        .slice(0, 16)
                                                    : ''
                                            }
                                            class="mb-2 w-full"
                                        />
                                        <input
                                            type="number"
                                            id="edit-event-multiplier"
                                            placeholder="New score multiplier"
                                            value={currentEvent()?.multiplier || ''}
                                            min="0"
                                            class="mb-2 w-full"
                                        />
                                        <div>
                                            <button onclick={editEvent} class="flex-1">
                                                Save Changes
                                            </button>
                                            <button onclick={cancelEvent} class="flex-1">
                                                Cancel Event
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

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