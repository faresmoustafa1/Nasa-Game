import { useState } from "react";
import Prologue from "./prologue/Prologue";

type Scene = "title" | "prologue" | "launch";

export default function App() {
  const [scene, setScene] = useState<Scene>("title");

  if (scene === "prologue") {
    return <Prologue onDone={() => setScene("launch")} />;
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
      {scene === "title" ? (
        <div>
          <h1>Mission ARES</h1>
          <button onClick={() => setScene("prologue")}>▶ Play</button>
        </div>
      ) : (
        <div>
          <p id="step1">Step 1 goes here: launch and discovery.</p>
          <button onClick={() => setScene("prologue")}>Replay prologue</button>
        </div>
      )}
    </main>
  );
}
