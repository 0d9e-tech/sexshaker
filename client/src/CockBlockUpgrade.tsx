import { type Component, createSignal, createMemo } from 'solid-js';
import { Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { type User } from '../../types';
import { minuty } from '../../functions';

interface CockblockUpgradeProps {
    socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
    users: User[];
    isBlocked: boolean;
    whoBlockedPlayer: string;
    nextBlockingAvailable: Date | null;
    blockEndTime: Date | null;
}

const CockblockUpgrade: Component<CockblockUpgradeProps> = (props) => {
    const [selectedUser, setSelectedUser] = createSignal('');
    
    // Memoize the filtered users list
    const availableUsers = createMemo(() => 
        props.users.filter(user => user.isLive)
    );

    const handleBlock = () => {
        if (!props.socket || !selectedUser()) return;
        props.socket.emit('block_user', selectedUser());
        setSelectedUser('');
    };

    const getCooldownTimeLeft = () => {
        if (!props.nextBlockingAvailable) return null;
        const cooldownEnd = new Date(props.nextBlockingAvailable);
        const now = new Date();
        if (cooldownEnd <= now) return null;
        
        const diff = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60));
        return `${diff} ${minuty(diff)}`;
    };

    return (
        <div class="p-4 bg-zinc-900 rounded-xl m-4">
            <h2 class="text-xl font-bold mb-4">COCKBLOCK</h2>
            <p class="mb-4">Je někdo až moc napřed? Dej mu na chvíli povinnou pauzu!</p>

            <div class="space-y-4">
                <select 
                    value={selectedUser()}
                    onChange={(e) => setSelectedUser(e.currentTarget.value)}
                    disabled={!!getCooldownTimeLeft() || props.isBlocked}
                    class="w-full p-2 bg-zinc-800 rounded-lg border border-zinc-700"
                >
                    <option value="">Vyber hráče</option>
                    {availableUsers().map(user => (
                        <option value={user.name} selected={user.name === selectedUser()}>
                            {user.name}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleBlock}
                    disabled={!selectedUser() || !!getCooldownTimeLeft() || props.isBlocked}
                    class={`w-full p-2 rounded-lg font-bold ${
                        !selectedUser() || !!getCooldownTimeLeft() || props.isBlocked
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                    {getCooldownTimeLeft() 
                        ? `Počkej ještě ${getCooldownTimeLeft()}`
                        : props.isBlocked
                            ? 'Jsi zablokovaný'
                            : 'Zablokovat hráče'
                    }
                </button>
            </div>
        </div>
    );
};

export default CockblockUpgrade;