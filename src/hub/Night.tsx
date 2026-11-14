// Mission ARES — Phase 2b: the first night (about 17 seconds, then it moves on by itself).
//
// The sun sets and the crew goes to bed. Even asleep, five people breathe: Air goes down.
// The oxygen maker answers: it uses Power and Water and gives Air back. The numbers on
// the tablet tick in front of the player, with a small "+/−" floating up from the thing
// that caused them. Then it is morning, Sol 2.
//
// Timeline (seconds) — edit BEATS here, the words in ./notes.ts, and the costs in
// NIGHT_STEPS (../game/state.ts).
//    0  Dusk: the sky darkens.
//    3  The crew goes to bed in the shelter.
//    6  Everybody breathes: Air −3.
//    9  The night waits: the player connects the oxygen maker's pipe (OxygenPuzzle.tsx).
//   10  The oxygen maker runs: Power −1, Water −1 …
//   11.4 … and Air +2.
//   14  Morning. Sol 2.
//   17.5 On to the next scene.
//
// Usage:  <Night game={game} onDone={(next) => …} />      Dev: ?scene=night

import { useCallback, useEffect, useRef, useState } from "react";
import { Boy, CrewMember } from "../game/art";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import { NoteLayer } from "../game/notes";
import SceneNav from "../game/SceneNav";
import { backTarget, nextTarget, stopsOf } from "../game/sceneStops";
import { METER_LABEL, NIGHT_STEPS, applySteps } from "../game/state";
import type { GameState, MeterKey } from "../game/state";
import Tablet from "../game/Tablet";
import { devJump, useTimeline } from "../game/useTimeline";
import "../game/game.css";
import BaseArt from "./BaseArt";
import OxygenPuzzle from "./OxygenPuzzle";
import { CREW_POS, FLOOR_Y, PERSON_SCALE } from "./layout";
import { NIGHT_NOTES } from "./notes";
import "./hub.css";
import "./puzzle.css";

type NightProps = {
  game: GameState;
  /** Called at the end of the night with the new meters and the next sol. */
  onDone: (game: GameState) => void;
  sound?: boolean;
};

const BEATS = [
  { id: "dusk", at: 0 },
  { id: "sleep", at: 3 },
  { id: "breathe", at: 5 },
  { id: "maker", at: 9 },
  { id: "morning", at: 14 },
] as const;
const END_AT = 17.5;
/** The night waits here while the player connects the oxygen maker's pipe. */
const PUZZLE_AT = 9;
const NIGHT_STOPS = stopsOf(NIGHT_NOTES);
const POP_TIME = 2.2; // how long a floating "+/−" stays
const NUDGE_TIME = 1.6; // how long a tablet row pulses after it changes

/** Where each change floats up from (the thing that caused it). */
const POP_AT: Record<string, { x: number; y: number }> = {
  "air-": { x: 1100, y: 680 },
  power: { x: 815, y: 610 },
  water: { x: 560, y: 600 },
  "air+": { x: 815, y: 690 },
};

/** The sleepers: bunk positions match the beds drawn in BaseArt. */
const BEDS = [
  { id: "commander", x: 892, y: 610 },
  { id: "doctor", x: 958, y: 610 },
  { id: "engineer", x: 1024, y: 610 },
  { id: "pilot", x: 892, y: 700 },
  { id: "boy", x: 958, y: 700 },
] as const;
const BLANKET: Record<string, string> = {
  commander: "#e0663a",
  doctor: "#3fb6a8",
  engineer: "#7f77dd",
  pilot: "#4a8be0",
  boy: "#2f8496",
};
const HEAD: Record<string, string> = {
  commander: "#e2b48f",
  doctor: "#8a5a3c",
  engineer: "#f0c8a0",
  pilot: "#a9703f",
  boy: "#c98b62",
};

const place = (x: number) => ({ transform: `translate(${x}px, ${FLOOR_Y}px) scale(${PERSON_SCALE})` });

export default function Night({ game, onDone, sound = true }: NightProps) {
  const audioRef = useRef<GameAudio | null>(null);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const after = applySteps(game, NIGHT_STEPS);
    onDone({ ...after, sol: game.sol + 1, log: [...after.log, `Night ${game.sol}: five people breathed, the oxygen maker answered`] });
  }, [game, onDone]);

  const [puzzleDone, setPuzzleDone] = useState(() => devJump() > PUZZLE_AT);
  const { t, seek } = useTimeline({ endAt: END_AT, onEnd: finish, holdAt: puzzleDone ? undefined : PUZZLE_AT });
  const sec = Math.floor(t);

  // Next / Back / Skip never skip the pipes puzzle: it is a thing to do, not a thing to read.
  const puzzleOpen = t >= PUZZLE_AT - 0.05 && !puzzleDone;
  const toPuzzleOrEnd = () => (puzzleDone ? finish() : seek(PUZZLE_AT));
  const onNext = () => {
    const target = nextTarget(NIGHT_STOPS, t, puzzleDone ? undefined : PUZZLE_AT);
    if (target === undefined) toPuzzleOrEnd();
    else seek(target);
  };
  const onBack = () => seek(backTarget(NIGHT_STOPS, t));

  // The tablet shows the numbers as they stand right now.
  const shown = applySteps(game, NIGHT_STEPS.filter((s) => s.at <= t));
  const usedBackup = shown.penalty > game.penalty;
  const nudge: MeterKey[] = NIGHT_STEPS.filter((s) => t >= s.at && t < s.at + NUDGE_TIME).map((s) => s.key);

  const current = Math.max(0, BEATS.findLastIndex((b) => t >= b.at));
  const night = t >= 0.4 && t < 14;
  const asleep = t >= 3.2 && t < 14;
  const running = t >= 9.2 && t < 14;

  useEffect(() => {
    if (!sound) return;
    const audio = createGameAudio();
    audioRef.current = audio;
    audio.hum(true);
    return () => {
      audio.stop();
      audioRef.current = null;
    };
  }, [sound]);

  useEffect(() => {
    const audio = audioRef.current;
    if (NIGHT_STEPS.some((s) => Math.floor(s.at) === sec)) audio?.blip(sec === 6 ? 330 : 520);
    if (sec === 14) audio?.chime();
  }, [sec]);

  const classes = ["ares", "hubn", ...BEATS.slice(0, current + 1).map((b) => `at-${b.id}`), asleep && "is-asleep", t < 1.4 && "is-opening"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-beat={BEATS[current].id}>
      <div className="ares__stage">
        <BaseArt night={night} running={running}>
          {/* Day: everybody is up and about */}
          <g className="hub__people hubn__day">
            <g className="hub__person" style={place(CREW_POS.commander)}>
              <CrewMember id="commander" look={-1} mood="calm" />
            </g>
            <g className="hub__person" style={place(CREW_POS.doctor)}>
              <CrewMember id="doctor" look={1} mood="calm" />
            </g>
            <g className="hub__person" style={place(CREW_POS.engineer)}>
              <CrewMember id="engineer" look={-1} mood="calm" />
            </g>
            <g className="hub__person" style={place(CREW_POS.pilot)}>
              <CrewMember id="pilot" look={-1} mood="calm" />
            </g>
            <g className="hub__person" style={place(1050)}>
              <Boy mood="calm" look={0} />
            </g>
          </g>

          {/* Night: five sleepers in their bunks */}
          <g className="hubn__sleepers" aria-hidden="true">
            {BEDS.map((b) => (
              <g key={b.id}>
                <circle cx={b.x + 12} cy={b.y - 4} r="11" fill={HEAD[b.id]} />
                <rect x={b.x + 20} y={b.y - 10} width="40" height="14" rx="6" fill={BLANKET[b.id]} />
              </g>
            ))}
            <text className="hubn__zzz" x="944" y="560">
              z
            </text>
            <text className="hubn__zzz" x="1010" y="548" style={{ animationDelay: "0.8s" }}>
              Z
            </text>
            <text className="hubn__zzz" x="1076" y="560" style={{ animationDelay: "1.6s" }}>
              z
            </text>
          </g>

          {/* Each change floats up from what caused it */}
          <g aria-hidden="true">
            {NIGHT_STEPS.map((s, i) => {
              if (t < s.at || t >= s.at + POP_TIME) return null;
              const where = s.key === "air" ? POP_AT[s.delta < 0 ? "air-" : "air+"] : POP_AT[s.key];
              return (
                <text
                  key={i}
                  className={`hubn__pop ${s.delta < 0 ? "hubn__pop--minus" : "hubn__pop--plus"}`}
                  x={where.x}
                  y={where.y}
                  textAnchor="middle"
                >
                  {METER_LABEL[s.key]} {s.delta < 0 ? "−" : "+"}
                  {Math.abs(s.delta)}
                </text>
              );
            })}
          </g>
        </BaseArt>

        <NoteLayer notes={NIGHT_NOTES} t={t} nav={puzzleOpen ? undefined : { onBack, onNext }} />

        <Tablet meters={shown.meters} locked={game.locked} crew={game.crew} nudge={nudge} />

        {usedBackup && (
          <p className="hubn__alert" role="alert">
            Emergency backup used! −3 points. Nobody is in danger.
          </p>
        )}

        {t >= PUZZLE_AT && !puzzleDone && (
          <OxygenPuzzle
            onDone={() => {
              setPuzzleDone(true);
              seek(PUZZLE_AT);
            }}
          />
        )}

        <SceneNav onBack={onBack} onNext={onNext} hidden={puzzleOpen} />
        {!puzzleOpen && (
          <button type="button" className="ares__skip" onClick={toPuzzleOrEnd}>
            Skip ▸
          </button>
        )}
        <div className="ares__flash" aria-hidden="true" />
      </div>
    </div>
  );
}
