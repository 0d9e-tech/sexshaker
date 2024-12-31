import { createSignal } from 'solid-js';
import lobby from './public/lobby.png';

interface GameInputProps {
    gameToken: () => string;
    setGameToken: (token: string) => void;
    login: () => void;
    error: () => string;
    randomPlaceholder: () => string;
}

const CodeInput = (props: GameInputProps) => {
    const [isCodeVisible, setIsCodeVisible] = createSignal(false);

    return (
        <div class="flex flex-col justify-center items-center h-full gap-4">
            <img src={lobby} alt="lobby image" class="rounded-b-2xl" />
            <p><b>RADEKSOFT</b> a <b>0d9e.tech</b> uvádí</p>
            <h1 class="text-4xl mb-4 mt-8 text-center font-bold">SEXSHAKER</h1>
            <p>ZADEJ SVŮJ KÓDÍK:</p>
            <input
                type={isCodeVisible() ? "text" : "password"}
                value={props.gameToken()}
                onInput={(e) => props.setGameToken(e.currentTarget.value)}
                class="p-2 rounded bg-zinc-700 text-white w-64 text-center"
                placeholder={props.randomPlaceholder()}
            />
            <label class="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={isCodeVisible()}
                    onChange={(e) => setIsCodeVisible(e.currentTarget.checked)}
                    class="cursor-pointer"
                />
                zobrazit kód
            </label>
            <button
                onClick={props.login}
                class="bg-green-500 text-white px-4 py-2 text-2xl rounded-xl mt-8 font-extrabold"
            >
                ZAČNI HONIT
            </button>
            {props.error() && <p class="text-red-500 mt-2">{props.error()}</p>}
        </div>
    );
};

export default CodeInput;
