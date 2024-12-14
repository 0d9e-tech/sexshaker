import { createSignal, onCleanup } from 'solid-js';
import { io } from 'socket.io-client';

export function App() {
    return <Fapper />;
    if ('Accelerometer' in window) {
        return <Fapper />;
    } else {
        return (
            <div class='bg-zinc-800 w-full min-h-screen flex flex-col gap-4 justify-center items-center'>
                <p class='text-slate-300 text-4xl'>Your browser does not support the accelerometer API.</p>
                <p class='text-slate-300 text-4xl'>Use your mobile device.</p>
            </div>
        );
    }
}

function Fapper() {
    const [count, setCount] = createSignal(0);
    let fapping = false;

    // const socket = io('localhost:8080', { path: 'http://localhost:8080/socket.io', autoConnect: true });
    const socket = io('http://localhost:8080', { path: '/' });
    console.log({socket})

    if ('Accelerometer' in window) {
        const acl = new Accelerometer({ frequency: 60 });

        acl.addEventListener('reading', () => {
            if (acl.y === undefined) return;

            if (!fapping && acl.y > 12) {
                fapping = true;
                setCount((prev) => {
                    const newCount = prev + 1;
                    socket.emit('fap');

                    return newCount;
                });
            } else if (fapping && acl.y < 12) {
                fapping = false;
            }
        });

        acl.start();

        onCleanup(() => {
            acl.stop();
        });
    }

    const leaderboard = [
        { name: 'RADEK', length: 300 },
        { name: 'Kubik', length: 200 },
    ];

    return (
        <div class='bg-zinc-800 w-full min-h-screen flex flex-col text-slate-300'>
            <div class='mx-auto mt-5'>
                <p>Honění skóre:</p>
                <p class='text-center text-4xl'>{count()}</p>
            </div>
            <div class='rounded-xl bg-zinc-900 p-3 my-5 mx-4'>
                <table class="w-full text-left">
                    {leaderboard.map((u) => (
                        <tr class="border-b border-zinc-700">
                            <td class="p-2">{u.name}</td>
                            <td class="p-2 text-right">{u.length}</td>
                        </tr>
                    ))}
                </table>
            </div>
            <div>
                <button on:click={() => socket.emit('sex', 'amogus????')} class='bg-red-500 text-white px-4 py-2 rounded-xl'>send sex</button>
            </div>
        </div>
    );
}
