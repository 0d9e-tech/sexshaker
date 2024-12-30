import { type Component } from 'solid-js';
import { Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { calculateMilenaUpgradeCost, toText } from '../../functions';
import upgradeImg from './public/milena.png';


interface PerfapUpgradeProps {
    count: number;
    mileny: number;
    socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
}

const DevkyUpgrade: Component<PerfapUpgradeProps> = (props) => {
    const handleUpgrade = () => {
        if (!props.socket) return;
        props.socket.emit('upgrade_milena');
    };

    return (
        <div class="upgrade">
            <img src={upgradeImg} alt="upgrade image" />
            <div>
                <h2>MILENA</h2>
                <p>Nadržená starší žena tě pravidelně každou půlminutu pohoní. Už máš {props.mileny}.</p>
                <button
                    onClick={handleUpgrade}
                    disabled={props.count < calculateMilenaUpgradeCost(props.mileny) || !props.socket}
                    class={`px-4 py-2 rounded-lg ${props.count >= calculateMilenaUpgradeCost(props.mileny) && props.socket
                            ? 'bg-green-600 hover:bg-green-700 font-bold'
                            : 'bg-gray-600 cursor-not-allowed'
                        }`}
                >
                    Koupit Milenu za {toText(calculateMilenaUpgradeCost(props.mileny))}
                </button>
            </div>
        </div>
    );
};

export default DevkyUpgrade;