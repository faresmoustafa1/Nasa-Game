// Mission ARES — the rover job, wrapped in the same camera zoom as the greenhouse.
//
//   in     the camera zooms into the garage
//   gear   a close-up of the garage opens (like the greenhouse). A real Perseverance weather reading says how
//          cold it is; the boy is in his astronaut suit, and the player picks the suit heater (Power −1/−2/−3).
//          The suit and rover react live (frost and shivering / warm glow / sweating) before "Suit up! ▸".
//   geared what the gear means for the battery, then a SPACE FACT; "Drive out ▸"
//   out    the boy climbs in, the rover drives out of the door
//   map    the rover trip itself (Rover.tsx). Gear too light: each sample costs more Power.
//   back   the rover drives back in, the camera zooms out to the whole base
// Rules and readings are in weather.ts.
//
// Usage:  <GarageTrip game={game} onDone={(next) => …} />
// Dev: ?scene=task&room=rover (add &cold=mild|cold|freezing to force a reading, &done=greenhouse for "second")

import { useCallback, useEffect, useRef, useState } from "react";
import { Astronaut, Boy } from "../game/art";
import { NoteLayer } from "../game/notes";
import type { SceneNote } from "../game/notes";
import type { GameState, Level } from "../game/state";
import Tablet from "../game/Tablet";
import { useTimeline } from "../game/useTimeline";
import BaseArt from "../hub/BaseArt";
import { FLOOR_Y, PERSON_SCALE, TASK_STAND_X } from "../hub/layout";
import "../game/game.css";
import "../hub/hub.css";
import "../storm/storm.css";
import "../greenhouse/greenhouse.css";
import "./garage.css";
import GarageCloseup from "./GarageCloseup";
import Rover from "./Rover";
import { COLD_CREW, COLD_NAME, GEAR, WEATHER_SOURCE, applyGear, coldExtra, coldLevel, nextReading } from "./weather";

type Props = {
  game: GameState;
  onDone: (game: GameState) => void;
};

type Phase = "in" | "gear" | "geared" | "out" | "map" | "back";

const ZOOM_MS = 1700;
const DRIVE_MS = 1300;
const RESULT_SECONDS = 4.5;
/** Zoom target: (1156, 560) of 1600 × 900 moves to the middle of the screen at 1.8× size. Not further right, or the edge of the drawing shows. */
const ZOOM_ON = "translate(-80%, -62%) scale(1.8)";

export default function GarageTrip({ game, onDone }: Props) {
  const { t } = useTimeline({});
  const [reading] = useState(nextReading);
  const cold = coldLevel(reading.temp);
  const [phase, setPhase] = useState<Phase>("in");
  const [zoomed, setZoomed] = useState(false);
  const [away, setAway] = useState(false);
  const [boyIn, setBoyIn] = useState(false);
  const [fade, setFade] = useState(false);
  const [gear, setGear] = useState<{ level: Level; at: number } | null>(null);
  const [choice, setChoice] = useState<Level | null>(null);
  const [geared, setGeared] = useState<GameState>(game);
  const [result, setResult] = useState<GameState | null>(null);
  const timers = useRef<number[]>([]);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clear, []);

  // In: zoom into the garage, then the weather report and the gear choice.
  useEffect(() => {
    later(60, () => setZoomed(true));
    later(ZOOM_MS + 150, () => setPhase("gear"));
  }, []);

  const extra = gear ? coldExtra(cold, gear.level) : 0;

  const pick = (level: Level | null) => {
    if (phase !== "gear" || level === null) return;
    setGeared(applyGear(game, reading, level));
    setGear({ level, at: t });
    setPhase("geared");
  };

  // Out: the boy climbs in, the rover drives out, fade to the map.
  const driveOut = () => {
    if (phase !== "geared") return;
    setPhase("out");
    setBoyIn(true);
    later(450, () => setAway(true));
    later(450 + DRIVE_MS - 300, () => setFade(true));
    later(450 + DRIVE_MS + 150, () => {
      setFade(false);
      setPhase("map");
    });
  };

  // Back: start zoomed in with the rover outside, drive in, the boy hops out, zoom out.
  const comeBack = useCallback(
    (next: GameState) => {
      clear();
      setResult(next);
      setZoomed(true);
      setAway(true);
      setBoyIn(true);
      setPhase("back");
      later(250, () => setAway(false));
      later(250 + DRIVE_MS + 100, () => setBoyIn(false));
      later(250 + DRIVE_MS + 500, () => setZoomed(false));
      later(250 + DRIVE_MS + 500 + ZOOM_MS + 300, () => onDone(next));
    },
    [onDone],
  );

  const skip = () => {
    if (phase === "in") {
      clear();
      setPhase("gear");
    } else if (phase === "out") {
      clear();
      setFade(false);
      setPhase("map");
    } else if (phase === "back" && result) {
      clear();
      onDone(result);
    }
  };

  if (phase === "map") return <Rover game={geared} cold={extra} onDone={comeBack} />;

  const shown = result ?? geared;
  const gained = result ? result.samples - game.samples : 0;
  let notes: SceneNote[] = [];
  if (phase === "in" || phase === "gear") {
    notes = [
      {
        from: 0,
        to: 9999,
        kind: "radio",
        noNav: true,
        title: "Weather report",
        text: `Perseverance's weather station measured ${reading.temp} °C at Jezero (${reading.when}). That is ${COLD_NAME[cold]}! Cold batteries run down fast, and a cold crew gets tired. Pick a heater for the suits and the rover.`,
        source: WEATHER_SOURCE,
        box: { x: 440, y: 76, w: 800 },
      },
    ];
  } else if (phase === "geared" && gear) {
    const g = GEAR[gear.level];
    const text =
      extra > 0
        ? `${g.name} is not enough for ${reading.temp} °C. The crew is shivering (crew −${COLD_CREW}) and the battery is cold: each sample costs +${extra} Power.`
        : gear.level > cold
          ? `Toasty! ${g.name} is more than ${reading.temp} °C needs, so it used extra Power.`
          : `Just right! ${g.name} keeps the suit and the battery warm at ${reading.temp} °C.`;
    notes = [
      { from: gear.at, to: gear.at + RESULT_SECONDS, kind: "story", text, box: { x: 440, y: 76, w: 800 } },
      {
        from: gear.at + RESULT_SECONDS,
        to: 9999,
        kind: "fact",
        title: "Cold Mars",
        text: "Jezero's air is about −55 °C on average, and it can change by 50 to 60 °C between day and night. Extreme cold can freeze and crack electronics, so rovers carry heaters.",
        source: "NASA's MEDA team · Rodriguez-Manfredi et al., Nature Geoscience (2023): the first 250 sols of Perseverance weather",
        box: { x: 440, y: 76, w: 800 },
      },
    ];
  } else if (phase === "back") {
    notes = [{ from: 0, to: 9999, kind: "story", text: `Home safe with ${gained} rock sample${gained === 1 ? "" : "s"}!`, box: { x: 540, y: 26, w: 520 } }];
  }

  return (
    <div className="ares gh">
      <div className="ares__stage">
        <div className="hub__zoom" style={{ transform: zoomed ? ZOOM_ON : "none" }}>
          <BaseArt roverAway={away} pilotInRover>
            {gear && !away && <ellipse className="garage__heat" cx="1356" cy="700" rx={70 + gear.level * 25} ry={30 + gear.level * 10} />}
            <g className={`hub__boy-fade${boyIn ? " is-hidden" : ""}`} style={{ transform: `translate(${TASK_STAND_X.rover}px, ${FLOOR_Y}px) scale(${PERSON_SCALE})` }}>
              {gear ? (
                <g transform="scale(0.86)">
                  <Astronaut accent="#2f8496" skin="#c98b62" hair="#2a1a12" helmet mood="smile" look={1} />
                </g>
              ) : (
                <Boy mood="smile" look={1} />
              )}
            </g>
          </BaseArt>
        </div>
        <NoteLayer notes={notes} t={phase === "back" ? 1 : t} selfNav />
        <Tablet
          meters={shown.meters}
          locked={shown.locked}
          crew={shown.crew}
          decisions={shown.decisions}
          nudge={phase === "geared" && t < (gear?.at ?? 0) + 1.6 ? ["power"] : []}
          compact={phase === "in" || phase === "gear"}
        />

        <GarageCloseup
          on={phase === "gear" || phase === "geared"}
          reading={reading}
          cold={cold}
          choice={phase === "gear" ? choice : (gear?.level ?? null)}
          locked={phase !== "gear"}
          onChoose={setChoice}
        />

        {phase === "gear" && <p className="storm__tag">SAVED REAL READING · NASA PERSEVERANCE (MEDA)</p>}

        {phase === "gear" && choice !== null && (
          <button type="button" className="ares__cta" onClick={() => pick(choice)}>
            Suit up! ▸
          </button>
        )}

        {phase === "geared" && (
          <button type="button" className="ares__cta" onClick={driveOut}>
            Drive out ▸
          </button>
        )}

        <div className="ares__flash" aria-hidden="true" style={{ opacity: fade ? 1 : 0, transition: "opacity 0.4s" }} />
        {(phase === "in" || phase === "out" || phase === "back") && (
          <button type="button" className="ares__skip" onClick={skip}>
            Skip ▸
          </button>
        )}
      </div>
    </div>
  );
}
