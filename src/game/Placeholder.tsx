// Mission ARES — a stand-in for a scene that is built in a later phase.
// It shows the shared tablet and the choice log, so the flow between scenes can be tested now.
// Delete a use of it when the real scene replaces it.

import type { GameState } from "./state";
import Tablet from "./Tablet";
import "./game.css";
import "../hub/hub.css";

type PlaceholderProps = {
  game: GameState;
  title: string;
  text: string;
  button: string;
  onNext: () => void;
};

export default function Placeholder({ game, title, text, button, onNext }: PlaceholderProps) {
  return (
    <div className="ares">
      <div className="ares__stage">
        <Tablet meters={game.meters} locked={game.locked} crew={game.crew} />
        <div className="hub__stand-in">
          <div>
            <h1>{title}</h1>
            <p>{text}</p>
            <ul aria-label="Choices so far">
              {game.log.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>
            <button type="button" className="ares__cta" style={{ position: "static", translate: "none" }} onClick={onNext}>
              {button}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
