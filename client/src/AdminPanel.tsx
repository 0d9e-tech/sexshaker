import { Component, For } from 'solid-js';
import { Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { GameEvent } from '../../types';

interface AdminPanelProps {
    socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
    currentEvent: () => GameEvent | null;
    auditLogs: () => string[];
}

const AdminPanel: Component<AdminPanelProps> = (props) => {
    const createUser = () => {
        if (!props.socket) return;

        const usernameInput = document.querySelector('#create-user-input') as HTMLInputElement;
        if (!usernameInput || usernameInput.value.trim() === '') return;

        const username = usernameInput.value.trim();
        if (confirm(`Are you sure you want to create a new user "${username}"?`)) {
            props.socket.emit('new_user', username);
            usernameInput.value = '';
        }
    };

    const userInfo = () => {
        if (!props.socket) return;

        const usernameInput = document.querySelector('#info-user-input') as HTMLInputElement;
        if (!usernameInput || usernameInput.value.trim() === '') return;

        const username = usernameInput.value.trim();
        props.socket.emit('user_info', username);
        usernameInput.value = '';
    };

    const toggleAdminStatus = () => {
        if (!props.socket) return;

        const usernameInput = document.querySelector('#admin-toggle-user-input') as HTMLInputElement;
        if (!usernameInput || usernameInput.value.trim() === '') return;

        const username = usernameInput.value.trim();
        props.socket.emit('user_toggle_admin', username);
        usernameInput.value = '';
    };

    const deleteUser = () => {
        if (!props.socket) return;

        const usernameInput = document.querySelector('#delete-user-input') as HTMLInputElement;
        if (!usernameInput || usernameInput.value.trim() === '') return;

        const username = usernameInput.value.trim();
        if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone!`)) {
            props.socket.emit('delete_user', username);
            usernameInput.value = '';
        }
    };

    const renameUser = () => {
        if (!props.socket) return;

        const oldNE = document.querySelector('#rename-user-old') as HTMLInputElement;
        const newNE = document.querySelector('#rename-user-new') as HTMLInputElement;
        if (!oldNE || oldNE.value.trim() === '' || !newNE || newNE.value.trim() === '') return;

        const oldN = oldNE.value.trim();
        const newN = newNE.value.trim();
        if (confirm(`Are you sure you want to rename user ${oldN} to ${newN}?`)) {
            props.socket.emit('rename_user', oldN, newN);
            oldNE.value = '';
            newNE.value = '';
        }
    };

    const createEvent = () => {
        if (!props.socket) return;

        const titleInput = document.querySelector('#event-title') as HTMLInputElement;
        const descInput = document.querySelector('#event-description') as HTMLTextAreaElement;
        const endInput = document.querySelector('#event-end') as HTMLInputElement;
        const multiplierInput = document.querySelector('#event-multiplier') as HTMLInputElement;

        if (!titleInput?.value || !descInput?.value || !endInput?.value || !multiplierInput?.value) return;

        const event: Omit<GameEvent, 'eventEnd'> & { eventEnd: string } = {
            title: titleInput.value,
            description: descInput.value,
            eventEnd: endInput.value,
            multiplier: parseFloat(multiplierInput.value)
        };

        if (confirm(`Are you sure you want to start event "${event.title}"?`)) {
            props.socket.emit('create_event', event);
            titleInput.value = '';
            descInput.value = '';
            endInput.value = '';
            multiplierInput.value = '';
        }
    };

    const editEvent = () => {
        if (!props.socket) return;

        const titleInput = document.querySelector('#edit-event-title') as HTMLInputElement;
        const descInput = document.querySelector('#edit-event-description') as HTMLTextAreaElement;
        const endInput = document.querySelector('#edit-event-end') as HTMLInputElement;
        const multiplierInput = document.querySelector('#edit-event-multiplier') as HTMLInputElement;

        if (!titleInput?.value || !descInput?.value || !endInput?.value || !multiplierInput?.value) return;

        const event: Omit<GameEvent, 'eventEnd'> & { eventEnd: string } = {
            title: titleInput.value,
            description: descInput.value,
            eventEnd: endInput.value,
            multiplier: parseFloat(multiplierInput.value)
        };

        if (confirm(`Are you sure you want to edit event "${props.currentEvent()?.title}" to "${event.title}"?`)) {
            props.socket.emit('edit_event', event);
        }
    };

    const cancelEvent = () => {
        if (!props.socket) return;

        if (confirm('Are you sure you want to cancel the current event?')) {
            props.socket.emit('cancel_event');
        }
    };

    return (
        <details class='p-2' id='admin' >
            <summary>ADMIN STUFF </summary>

            < h2 class='mt-6' > user info </h2>
            < div class='flex-row' >
                <input
                    type="text"
                    id="info-user-input"
                    placeholder='username to fetch'
                />
                <button onclick={userInfo}> get user info </button>
            </div>

            < h2 class='mt-6' > user creation </h2>
            < div class='flex-row' >
                <input
                    type="text"
                    id="create-user-input"
                    placeholder='username to create'
                />
                <button onclick={createUser}> create new user </button>
            </div>

            < h2 > user deletion </h2>
            < div class='flex-row' >
                <input
                    type="text"
                    id="delete-user-input"
                    placeholder='username to delete'
                />
                <button onclick={deleteUser}> delete user </button>
            </div>

            < h2 > user rename </h2>
            < div class='flex-row' >
                <div class='flex-col' >
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
                < button onclick={renameUser} > rename user </button>
            </div>

            < h2 class='mt-6' > toggle admin status </h2>
            < div class='flex-row' >
                <input
                    type="text"
                    id="admin-toggle-user-input"
                    placeholder='username to fetch'
                />
                <button onclick={toggleAdminStatus}> toggle admin status </button>
            </div>

            <h2 class='mt-6'>COCKBLOCK SETTINGS</h2>
            <div class='flex-col'>
                <div class="mb-4">
                    <label>Block Duration (minutes)</label>
                    <input
                        type="number"
                        id="block-duration"
                        min="1"
                        class="w-full"
                        placeholder="Block duration in minutes"
                    />
                </div>
                <div class="mb-4">
                    <label>Cooldown Duration (minutes)</label>
                    <input
                        type="number"
                        id="block-cooldown"
                        min="1"
                        class="w-full"
                        placeholder="Cooldown duration in minutes"
                    />
                </div>
                <button onClick={() => {
                    const duration = (document.querySelector('#block-duration') as HTMLInputElement).value;
                    const cooldown = (document.querySelector('#block-cooldown') as HTMLInputElement).value;
                    if (duration && cooldown && props.socket) {
                        props.socket.emit('update_block_settings', {
                            blockDuration: parseInt(duration),
                            cooldownDuration: parseInt(cooldown)
                        });
                    }
                }}>Update Settings</button>
            </div>

            <h2 class='mt-6'>MANUAL BLOCK/UNBLOCK</h2>
            <div class='flex-col'>
                <input
                    type="text"
                    id="block-user-input"
                    placeholder="Username to block/unblock"
                    class="mb-2"
                />
                <div class="flex gap-2">
                    <button onClick={() => {
                        const username = (document.querySelector('#block-user-input') as HTMLInputElement).value;
                        if (username && props.socket) {
                            props.socket.emit('admin_block_user', username);
                        }
                    }}>Block User</button>
                    <button onClick={() => {
                        const username = (document.querySelector('#block-user-input') as HTMLInputElement).value;
                        if (username && props.socket) {
                            props.socket.emit('admin_unblock_user', username);
                        }
                    }}>Unblock User</button>
                </div>
            </div>

            < h2 > EVENT MANAGEMENT </h2>
            {
                !props.currentEvent() && (
                    <div class='flex-col' >
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
                        <button onclick={createEvent}> Create Event </button>
                    </div>
                )}

            {
                props.currentEvent() && (
                    <div class='flex-col' >
                        <p>Active event: {props.currentEvent()?.title} </p>
                        < p > Ends at: {new Date(props.currentEvent()!.eventEnd).toLocaleString()} </p>

                        < div class='flex-col' >
                            <h3 class='mb-2' > Edit Event </h3>
                            < input
                                type="text"
                                id="edit-event-title"
                                placeholder="New event title"
                                value={props.currentEvent()?.title || ''}
                                class="mb-2 w-full"
                            />
                            <textarea
                                id="edit-event-description"
                                placeholder="New event description"
                                value={props.currentEvent()?.description || ''}
                                class="mb-2 w-full"
                            />
                            <input
                                type="datetime-local"
                                id="edit-event-end"
                                value={
                                    props.currentEvent()?.eventEnd
                                        ? new Date(new Date(props.currentEvent()!.eventEnd).getTime() - new Date().getTimezoneOffset() * 60000)
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
                                value={props.currentEvent()?.multiplier || ''}
                                min="0"
                                class="mb-2 w-full"
                            />
                            <div>
                                <button onclick={editEvent} class="flex-1" >
                                    Save Changes
                                </button>
                                < button onclick={cancelEvent} class="flex-1" >
                                    Cancel Event
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <div class='flex-col' >
                <h2>AUDIT LOG </h2>
                <div class='flex-col' >
                    <For each={props.auditLogs()}>
                        {(log) => (
                            <p class="text-sm text-wrap font-mono py-1 border-b border-zinc-700" >
                                {log}
                            </p>
                        )}
                    </For>
                </div>
            </div>
        </details>
    );
};

export default AdminPanel;