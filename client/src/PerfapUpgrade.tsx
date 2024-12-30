import { type Component } from 'solid-js';
import { Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { calculatePerFapUpgradeCost, toText } from '../../functions';

interface PerfapUpgradeProps {
    count: number;
    perfap: number;
    socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
}

const PerfapUpgrade: Component<PerfapUpgradeProps> = (props) => {
    const handleUpgrade = () => {
        if (!props.socket) return;
        props.socket.emit('upgrade_perfap');
    };

    return (
        <div class="flex flex-col gap-2 p-4 bg-zinc-900 rounded-xl mx-4">

            <p>Aktuální hodnota za fap: {props.perfap}</p>
            <button
                onClick={handleUpgrade}
                disabled={props.count < calculatePerFapUpgradeCost(props.perfap) || !props.socket}
                class={`px-4 py-2 rounded-lg ${props.count >= calculatePerFapUpgradeCost(props.perfap) && props.socket
                        ? 'bg-green-600 hover:bg-green-700 font-bold'
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
            >
                Koupit za {toText(calculatePerFapUpgradeCost(props.perfap))}
            </button>

        </div>
    );
};

export default PerfapUpgrade;