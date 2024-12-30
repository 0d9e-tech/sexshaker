import { type Component } from 'solid-js';
import { Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { calculatePerFapUpgradeCost, toText } from '../../functions';
import upgradeImg from './public/viagra.png';


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
        <div class="upgrade">
            <img src={upgradeImg} class='max-w-20 aspect-square' alt="upgrade image" />
            <div>
                <h2>VIAGRA</h2>
                <p>Modrá pilulka co zvýší výkonnost.</p>
                <p>Aktuální počet bodů za honění: {props.perfap}</p>
                <button
                    onClick={handleUpgrade}
                    disabled={props.count < calculatePerFapUpgradeCost(props.perfap) || !props.socket}
                    class={`px-4 py-2 rounded-lg ${props.count >= calculatePerFapUpgradeCost(props.perfap) && props.socket
                            ? 'bg-green-600 hover:bg-green-700 font-bold'
                            : 'bg-gray-600 cursor-not-allowed'
                        }`}
                >
                    Koupit 2x upgrade za {toText(calculatePerFapUpgradeCost(props.perfap))}
                </button>
            </div>
        </div>
    );
};

export default PerfapUpgrade;