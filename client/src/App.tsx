import { createSignal, onCleanup, onMount } from 'solid-js';
import { io, Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { GameEvent, type User } from '../../types';
import CodeInput from './CodeInput';
import PerfapUpgrade from './PerfapUpgrade';
import { toText, wakeLock } from '../../functions';
import AdminPanel from './AdminPanel';
import DevkyUpgrade from './DevkyUpgrade';
import CockblockUpgrade from './CockBlockUpgrade';

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
                <p class='text-slate-300 text-4xl'>Tvůj prohlížeč nepodporuje akcelerometr! Použij své mobilní zařízení.</p>
                <p class='text-slate-300 text-4xl'>Na androidu prosím použij Google Chrome.</p>
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
    const [faps, setFaps] = createSignal(0);
    const [perFap, setPerFap] = createSignal(1);
    const [socket, setSocket] = createSignal<Socket<DefaultEventsMap, DefaultEventsMap>>();
    const [isAdmin, setIsAdmin] = createSignal(false);
    const [leaderboard, setLeaderboard] = createSignal<User[]>([]);
    const [error, setLoginError] = createSignal('');
    const [auditLogs, setAuditLogs] = createSignal<string[]>([]);
    const [motionPermission, setMotionPermission] = createSignal<boolean>(false);
    const [currentEvent, setCurrentEvent] = createSignal<GameEvent | null>(null);
    const [eventTimeLeft, setEventTimeLeft] = createSignal<string>('');
    const [devky, setDevky] = createSignal(0);
    const [isBlocked, setIsBlocked] = createSignal(false);
    const [whoBlockedPlayer, setWhoBlockedPlayer] = createSignal('');
    const [nextBlockingAvailable, setNextBlockingAvailable] = createSignal<Date | null>(null);
    const [blockEndTime, setBlockEndTime] = createSignal<Date | null>(null);
    const [isShaking, setIsShaking] = createSignal(false);

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
        if (!isIOS()) {
            try {
                const accelerometer = new Accelerometer({ frequency: 60 });

                accelerometer.addEventListener('reading', () => {
                    if (accelerometer.y !== undefined && !isShaking() && accelerometer.y > ANDROID_THRESHOLD) {
                        setIsShaking(true);
                        fap();
                    } else if (accelerometer.y !== undefined && isShaking() && accelerometer.y < ANDROID_THRESHOLD) {
                        setIsShaking(false);
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
                        if (!isShaking() && acceleration.y > IOS_THRESHOLD) {
                            setIsShaking(true);
                            fap();
                        } else if (isShaking() && acceleration.y < IOS_THRESHOLD) {
                            setIsShaking(false);
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
                    if (!isShaking() && acceleration.y > IOS_THRESHOLD) {
                        setIsShaking(true);
                        fap();
                    } else if (isShaking() && acceleration.y < IOS_THRESHOLD) {
                        setIsShaking(false);
                    }
                }
            };

            window.addEventListener('devicemotion', handleMotion);

            onCleanup(() => {
                window.removeEventListener('devicemotion', handleMotion);
            });
        }
    };

    const updateEventTimeLeft = () => {
        const event = currentEvent();
        if (!event) return;

        const now = new Date();
        const end = new Date(event.eventEnd);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) {
            setCurrentEvent(null);
            setEventTimeLeft('');
            return;
        }

        const minutes = Math.ceil(diff / (1000 * 60));
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            setEventTimeLeft(`${hours}h ${remainingMinutes}min`);
        } else {
            setEventTimeLeft(`${minutes}min`);
        }
    };

    const fap = () => {
        if (isBlocked())
            return;

        newSocket.emit('fap');
    }

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
            setFaps(user.faps);
            setIsBlocked(user.isBlocked)
            setDevky(user.devky);
            setNextBlockingAvailable(user.nextBlockingAvailable);
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
            updateEventTimeLeft();
        });

        newSocket.on('event_ended', (_) => {
            setCurrentEvent(null);
            setEventTimeLeft('');
        });

        newSocket.on('user_blocked', (data: { blocker: string, blocked: string }) => {
            if (data.blocked === name()) {
                setIsBlocked(true);
                setWhoBlockedPlayer(data.blocker);
            }
        });

        newSocket.on('user_unblocked', (username: string) => {
            if (username === name()) {
                setIsBlocked(false);
                setWhoBlockedPlayer('');
                setBlockEndTime(null);
            }
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
        timeInterval = setInterval(updateEventTimeLeft, 1000);
    });

    onCleanup(() => {
        clearInterval(timeInterval);
    });

    wakeLock();

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
                    <details class='w-full p-3 border-b-4 border-zinc-900 text-sm'>
                        <summary>Přihlášen jako {name()}</summary>
                        <h2 class='mt-4'>STATISTIKY:</h2>
                        <p>počet honění: {faps()}</p>
                        <button class='mt-4 bg-red-500 text-white text-base font-bold px-4 py-2 rounded-xl' onclick={() => logout()}>Odhlásit</button>

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
                        <p class={`text-center text-6xl p-4 ${isShaking() && !isBlocked() && 'border-4 rounded-2xl border-green-500'}`}>{toText(count())}</p>
                        {currentEvent() && (
                            <div class="mt-4 p-4 bg-zinc-700 rounded-xl text-center">
                                <h3 class="text-xl font-bold">{currentEvent()?.title}</h3>
                                <p class="mt-2">{currentEvent()?.description}</p>
                                <p class="mt-2 text-sm text-center">
                                    Zbývá: {eventTimeLeft()}
                                </p>
                            </div>
                        )}
                    </div>

                    {isBlocked() &&
                        <div class="mb-4 p-3 mx-3 bg-red-900/50 rounded-lg">
                            <p class="text-red-200">
                                Hráč <span class='font-bold text-lg'>{whoBlockedPlayer()}</span> tě zablokoval! Musíš teď chvilku počkat :(
                            </p>
                        </div>}

                    <div class="rounded-xl bg-zinc-900 p-3 my-5 mx-4 flex flex-col overflow-x-scroll">
                        <table class="w-full text-left">
                            <tbody>
                                {leaderboard().map((user, index) => (
                                    <tr class={` ${user.name == name() ? 'border-4 border-green-500' : 'border-b border-zinc-700'}`}>
                                        <td class="p-2 text-center w-6">{index + 1}</td>
                                        <td class="py-2 pl-4 text-center w-3">
                                            <span
                                                class={`inline-block w-3 h-3 rounded-full ${user.isBlocked ? 'bg-red-500' : user.isLive ? 'bg-green-500' : 'bg-gray-500'}`}
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

                    {isBlocked() ? <div>
                            <h2 class='font-bold text-center'>KDYŽ JSI ZABLOKOVANÝ, NENÍ SEXSHOP DOSTUPNÝ</h2>
                        </div> :
                        <div class='flex flex-col mt-6'>
                            <h2 class='font-bold text-center'>SEXSHOP</h2>
                            <PerfapUpgrade count={count()} perfap={perFap()} socket={socket()} />
                            <DevkyUpgrade count={count()} mileny={devky()} socket={socket()} />
                            <CockblockUpgrade
                                socket={socket()}
                                users={leaderboard()}
                                isBlocked={isBlocked()}
                                whoBlockedPlayer={whoBlockedPlayer()}
                                nextBlockingAvailable={nextBlockingAvailable()}
                                blockEndTime={blockEndTime()}
                            />
                        </div>}

                    {isAdmin() && <AdminPanel socket={socket()} currentEvent={currentEvent} auditLogs={auditLogs} />}
                </div>
            )}
        </div>
    );
}