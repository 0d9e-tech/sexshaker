import { type Component } from "solid-js";
import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";
import {
  calculateHentaiMultiplier,
  calculateHentaiUpgradeCost,
  toText,
} from "../../functions";
import upgradeImg from "./public/177013.jpg";

interface PerfapUpgradeProps {
  count: number;
  hentai: number;
  socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
}

const HentaiUpgrade: Component<PerfapUpgradeProps> = (props) => {
  const handleUpgrade = () => {
    if (!props.socket) return;
    props.socket.emit("upgrade_hentai");
  };

  return (
    <div class="upgrade">
      <img src={upgradeImg} alt="upgrade image" />
      <div>
        <h2>HENTAI</h2>
        <p>
          Maturitní četba zadaná od Mileny, půjčená ze školní knihovny; některé
          stránky jsou slepené, za každé přečtené hentai se začne Milena víc
          snažit.
          <br />
          Už máš {props.hentai}, Milena se snaží{" "}
          {calculateHentaiMultiplier(props.hentai)}x tolik!
        </p>
        <button
          onClick={handleUpgrade}
          disabled={
            props.count < calculateHentaiUpgradeCost(props.hentai) ||
            !props.socket
          }
          class={`px-4 py-2 rounded-lg ${
            props.count >= calculateHentaiUpgradeCost(props.hentai) &&
            props.socket
              ? "bg-green-600 hover:bg-green-700 font-bold"
              : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          Koupit Hentai za {toText(calculateHentaiUpgradeCost(props.hentai))}
        </button>
      </div>
    </div>
  );
};

export default HentaiUpgrade;
