interface GameInputProps {
    gameToken: () => string;
    setGameToken: (token: string) => void;
    login: () => void;
    error: () => string;
    randomPlaceholder: () => string;
}

const CodeInput = (props: GameInputProps) => {
    return (
        <div class="flex flex-col justify-center items-center h-full gap-4">
            <h1 class="text-4xl mb-4 mt-8 text-center font-bold">SEXSHAKER</h1>
            <p>ZADEJ SVŮJ KÓDÍK:</p>
            <input
                type="text"
                value={props.gameToken()}
                onInput={(e) => props.setGameToken(e.currentTarget.value)}
                class="p-2 rounded bg-zinc-700 text-white w-64 text-center"
                placeholder={props.randomPlaceholder()}
            />
            <button
                onClick={props.login}
                class="bg-blue-500 text-white px-4 py-2 rounded-xl mt-2"
            >
                Submit
            </button>
            {props.error() && <p class="text-red-500 mt-2">{props.error()}</p>}
        </div>
    );
};

export default CodeInput;
