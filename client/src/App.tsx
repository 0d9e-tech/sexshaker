import { createSignal } from 'solid-js'

export function App() {
    if (!('Accelerometer' in window)) {
        return (
            <Fapper />
        )
    }
    else {
        return (
            <div class='bg-zinc-800 w-full min-h-screen flex flex-col gap-4 justify-center items-center'>
                <p class='text-slate-300 text-4xl'>Your browser does not support the accelerometer API.</p>
                <p class='text-slate-300 text-4xl'>Use your mobile device.</p>
            </div>
        )
    }
}

function Fapper() {
    const [count, setCount] = createSignal(0);
    let fapping = false;

    // const acl = new Accelerometer({ frequency: 60 });

    // acl.addEventListener('reading', () => {
    //     if (!acl.y) 
    //         return;
        
    //     if (!fapping && acl.y > 12) {
    //         fapping = true;
    //         // THIS is where a fap happens
    //         setCount(count() + 1);
    //     }
    //     else if (fapping && acl.y < 12) {
    //         fapping = false;
    //     }
    // });
    
    // acl.start();

    const leaderboard = [
        {
            'name': 'RADEK',
            'length': 300
        },
        {
            'name': 'Kubik',
            'length': 200,
        }
    ]
    
    return (
        <div class='bg-zinc-800 w-full min-h-screen flex flex-col text-slate-300'>
            <div class='mx-auto mt-5'>
                <p>Honění skóre:</p>
                <p class='text-center text-4xl'>{count()}</p>
            </div>
            <div class='rounded-xl bg-zinc-900 p-3 my-5 mx-4'>
                <table class='w-full'>
                    {leaderboard.map(u => (
                        <tr>
                            <td class='w-2/3'>{u.name}</td>
                            <td class='w-1/3'>{u.length}</td>
                        </tr>
                    ))}
                </table>
            </div>
        </div>
    );
}
