import { useState } from "react";
import Cruise from "./cruise/Cruise";
import Prologue from "./prologue/Prologue";
import Tablet from "./game/Tablet";
import { newGame } from "./game/state";
import type { GameState } from "./game/state";
import Touchdown from "./touchdown/Touchdown";
import "./game/game.css";

type Scene = "title" | "prologue" | "cruise" | "touchdown" | "hub";

const SCENES: Scene[] = ["title", "prologue", "cruise", "touchdown", "hub"];

/** Dev only: ?scene=touchdown starts there (add &at=31 to start the scene at 31 s). */
function firstScene(): Scene {
  if (!import.meta.env.DEV) return "title";
  const wanted = new URLSearchParams(window.location.search).get("scene");
  return SCENES.find((s) => s === wanted) ?? "title";
}

export default function App() {
  const [scene, setScene] = useState<Scene>(firstScene);
  const [game, setGame] = useState<GameState>(newGame);

  if (scene === "prologue") {
    return <Prologue onDone={() => setScene("cruise")} />;
  }

  if (scene === "cruise") {
    return <Cruise onDone={() => setScene("touchdown")} />;
  }

  if (scene === "touchdown") {
    return (
      <Touchdown
        game={game}
        onDone={(next) => {
          setGame(next);
          setScene("hub");
        }}
      />
    );
  }

  if (scene === "hub") {
    // Placeholder until Phase 2 (the base hub). The tablet already shows the shared state.
    return (
      <div className="ares">
        <div className="ares__stage" style={{ display: "grid", placeItems: "center", textAlign: "center" }}>
          <Tablet meters={game.meters} crew={game.crew} />
          <div>
            <h1>The base hub goes here</h1>
            <p>Phase 2: two rooms glow, and the player picks one.</p>
            <button onClick={() => setScene("title")}>Back to title</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#03050d",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div>
        <h1>Mission ARES</h1>
        <button
          onClick={() => {
            setGame(newGame());
            setScene("prologue");
          }}
        >
          ▶ Play
        </button>
      </div>
    </main>
  );
}
