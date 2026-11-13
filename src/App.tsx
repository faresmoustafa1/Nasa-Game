import { useState } from "react";
import Prologue from "./prologue/Prologue";
import BaseScreen from "./base/BaseScreen";

type Scene = "title" | "prologue" | "base";

// Dev only: http://localhost:5173/?scene=base opens the base directly.
function firstScene(): Scene {
  if (!import.meta.env.DEV) return "title";
  return new URLSearchParams(window.location.search).get("scene") === "base" ? "base" : "title";
}

export default function App() {
  const [scene, setScene] = useState<Scene>(firstScene);

  if (scene === "prologue") {
    // Steps 6 adds the trip tutorial and the landing between these two.
    return <Prologue onDone={() => setScene("base")} />;
  }

  if (scene === "base") {
    return <BaseScreen />;
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
        <button onClick={() => setScene("prologue")}>▶ Play</button>
      </div>
    </main>
  );
}
