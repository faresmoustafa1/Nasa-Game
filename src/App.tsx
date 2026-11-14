import { Fragment, useState } from "react";
import Cruise from "./cruise/Cruise";
import GameMenu from "./menu/GameMenu";
import Prologue from "./prologue/Prologue";
import Greenhouse from "./greenhouse/Greenhouse";
import Hub from "./hub/Hub";
import Night from "./hub/Night";
import GarageTrip from "./rover/GarageTrip";
import Storm from "./storm/Storm";
import Crowning from "./result/Crowning";
import JuniorTest from "./result/JuniorTest";
import Result from "./result/Result";
import Sources from "./result/Sources";
import { badgeOf, scoreOf } from "./result/score";
import Title from "./title/Title";
import type { JumpKey } from "./title/Title";
import "./title/title.css";
import { isJudge } from "./game/judge";
import { LATER_COST, NIGHT_STEPS, applySteps, applyStorm, newGame } from "./game/state";
import type { GameState, Task } from "./game/state";
import Touchdown from "./touchdown/Touchdown";
import "./game/game.css";

type Scene = "title" | "prologue" | "cruise" | "touchdown" | "hub" | "task" | "night" | "storm" | "crown" | "test" | "end" | "sources";

const SCENES: Scene[] = ["title", "prologue", "cruise", "touchdown", "hub", "task", "night", "storm", "crown", "test", "end", "sources"];

/** Dev only: ?scene=night starts there (add &at=8 to start the scene at 8 s, &done=greenhouse for "one job finished"). */
function devParam(name: string) {
  return import.meta.env.DEV ? new URLSearchParams(window.location.search).get(name) : null;
}

function firstScene(): Scene {
  const wanted = devParam("scene");
  return SCENES.find((s) => s === wanted) ?? "title";
}

/** Dev only: ?scene=end shows the result for a made-up finished game (add &pen=3 for one emergency backup, &rich=1 for a gold game). */
function sampleEnd(): GameState {
  const rich = devParam("rich") === "1";
  const pen = Number(devParam("pen")) || 0;
  // A finished game that follows the real rules: radishes (harvest 3), a medium storm and a medium shield,
  // then the rover with 2 rocks (crater floor 4 + delta foot 6, the rock the team needed, +2).
  return {
    ...newGame(),
    order: "GR",
    tasks: ["greenhouse", "rover"],
    meters: rich ? { power: 2, water: 3, air: 1 } : { power: 3, water: 5, air: 2 },
    crew: rich ? 5 : 3,
    samples: rich ? 3 : 2,
    rockPoints: rich ? 19 : 12,
    harvest: rich ? 5 : 3,
    penalty: pen,
    log: [
      "Chose the greenhouse first",
      `Greenhouse (radishes): ${rich ? "water 2, light 2 → lush plants, harvest 5" : "water 1, light 1 → healthy plants, harvest 3"}`,
      "Storm (medium, as forecast): picked a medium shield",
      rich ? "Rover: 3 rocks (19 points), went right away" : "Rover: 2 rocks (12 points), went right away",
    ],
  };
}

/** A game that is part-way through: one job done, the night and the storm over (a medium storm, a medium shield). */
function midGame(first: Task): GameState {
  const g = { ...newGame(), order: first === "greenhouse" ? ("GR" as const) : ("RG" as const), tasks: [first], log: [`Chose the ${first} first`], decisions: [{ what: `${first === "greenhouse" ? "Greenhouse" : "Rover"} first`, effect: LATER_COST[first === "greenhouse" ? "rover" : "greenhouse"].chip, mark: "cost" as const }] };
  return applyStorm({ ...applySteps(g, NIGHT_STEPS), sol: 2 }, { level: 2, forecast: 2, shield: 2, speed: 758, date: "2025-06-06", live: false, flare: null, lost: false, marsHit: true });
}

function firstGame(): GameState {
  if (devParam("scene") === "end" || devParam("scene") === "crown") return sampleEnd();
  const done = devParam("done");
  if (done !== "greenhouse" && done !== "rover") return newGame();
  return { ...newGame(), order: done === "greenhouse" ? "GR" : "RG", tasks: [done], log: [`Chose the ${done} first`], decisions: [{ what: `${done === "greenhouse" ? "Greenhouse" : "Rover"} first`, effect: LATER_COST[done === "greenhouse" ? "rover" : "greenhouse"].chip, mark: "cost" as const }] };
}

function Game() {
  const [scene, setScene] = useState<Scene>(firstScene);
  const [game, setGame] = useState<GameState>(firstGame);
  /** Bumped by Restart, so even the scene you are in starts over from the beginning. */
  const [run, setRun] = useState(0);
  /** Stars from the Junior Astronaut Test (0–3), or null if the player skipped it. */
  const [junior, setJunior] = useState<number | null>(null);
  const [task, setTask] = useState<Task>(() => (devParam("room") === "rover" ? "rover" : "greenhouse"));

  /** Judge Mode: start any scene with a sensible game behind it. */
  const jump = (key: JumpKey) => {
    const fresh = newGame();
    const set = (g: GameState, sc: Scene, t?: Task) => {
      setGame(g);
      if (t) setTask(t);
      setScene(sc);
    };
    if (key === "prologue" || key === "cruise") set(fresh, key);
    else if (key === "touchdown") set(fresh, "touchdown");
    else if (key === "hub") set({ ...fresh, log: ["Landed at Jezero Crater"] }, "hub");
    else if (key === "greenhouse") set({ ...fresh, order: "GR" }, "task", "greenhouse");
    else if (key === "rover") set({ ...fresh, order: "RG" }, "task", "rover");
    else if (key === "night") set({ ...fresh, order: "GR", tasks: ["greenhouse"] }, "night");
    else if (key === "storm") set(applySteps({ ...fresh, order: "GR", tasks: ["greenhouse"] }, NIGHT_STEPS), "storm");
    else if (key === "greenhouse2") set(midGame("rover"), "task", "greenhouse");
    else if (key === "rover2") set(midGame("greenhouse"), "task", "rover");
    else if (key === "crowning") set({ ...sampleEnd(), meters: { power: 2, water: 3, air: 1 }, samples: 3, rockPoints: 19, harvest: 5, crew: 5 }, "crown");
    else if (key === "result") set(sampleEnd(), "end");
    else set(fresh, "sources");
  };

  const view = (() => {
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
      return (
        <Hub
          game={game}
          onDone={(next, chosen) => {
            setGame(next);
            setTask(chosen);
            setScene("task");
          }}
        />
      );
    }

    if (scene === "task") {
      // The job is over: record it, then go on to the night (first job) or the result (second job).
      const finishTask = (next: GameState) => {
        const done = [...next.tasks, task];
        setGame({ ...next, tasks: done, locked: done.length === 2 ? 0 : next.locked });
        setScene(done.length === 1 ? "night" : "crown");
      };
      if (task === "rover") return <GarageTrip game={game} onDone={finishTask} />;
      return <Greenhouse game={game} onDone={finishTask} />;
    }

    if (scene === "night") {
      return (
        <Night
          game={game}
          onDone={(next) => {
            setGame(next);
            setScene("storm");
          }}
        />
      );
    }

    if (scene === "storm") {
      return (
        <Storm
          game={game}
          onDone={(next) => {
            setGame(next);
            setScene("hub");
          }}
        />
      );
    }

    if (scene === "crown") {
      return <Crowning badge={badgeOf(scoreOf(game).total)} onDone={() => setScene("test")} />;
    }

    if (scene === "test") {
      return (
        <JuniorTest
          onDone={(stars) => {
            setJunior(stars);
            setScene("end");
          }}
        />
      );
    }


    if (scene === "sources") {
      return <Sources onBack={() => setScene("title")} backLabel="◂ Back to the menu" />;
    }

    if (scene === "end") {
      return (
        <Result
          game={game}
          junior={junior}
          onAgain={() => {
            setGame(newGame());
            setJunior(null);
            setScene("cruise");
          }}
          onTitle={() => setScene("title")}
        />
      );
    }

    return (
      <Title
        onPlay={() => {
          setGame(newGame());
          setScene("prologue");
        }}
        onSkipIntro={() => {
          setGame(newGame());
          setScene("touchdown");
        }}
        onJump={jump}
        onSources={() => setScene("sources")}
      />
    );
  })();

  const inMission = scene !== "title" && scene !== "sources" && scene !== "end";
  return (
    <>
      <Fragment key={run}>{view}</Fragment>
      {inMission && (
        <GameMenu
          key={scene}
          onRestart={() => {
            setGame(newGame());
            setJunior(null);
            setScene("prologue");
            setRun((r) => r + 1);
          }}
          onExit={() => setScene("title")}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <>
      <Game />
      <div className="rotate-hint" role="alert">
        <div className="rotate-hint__icon">📱↻</div>
        Turn your phone sideways to play Mission ARES!
      </div>
      {isJudge() && <div className="judge-pill">JUDGE MODE · fixed values</div>}
    </>
  );
}
