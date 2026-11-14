// Mission ARES — Phase 5: the greenhouse job.
//
// The camera zooms from the base cut-away into the greenhouse room. Then:
//   drag up to 3 water drops onto the plants (or tap a drop)   each costs 1 Water
//   pick the lamp: Off / 1 / 2 / 3                             each step costs 1 Power
// The plants react live (wilted / healthy / lush) so the player sees the trade-off BEFORE pressing Grow!
// Rules are in rules.ts. After Grow! the plants grow in a time-lapse, a real NASA fact about the crop appears,
// then a study from NASA's Open Science Data Repository (OSDR, see notes.ts), and the camera zooms back out.
//
// Usage:  <Greenhouse game={game} onDone={(next) => …} />      Dev: ?scene=task&room=greenhouse (add &done=rover for "second")

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { Boy } from "../game/art";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import { NoteLayer } from "../game/notes";
import type { SceneNote } from "../game/notes";
import { METER_MAX } from "../game/state";
import type { GameState } from "../game/state";
import Tablet from "../game/Tablet";
import { useTimeline } from "../game/useTimeline";
import BaseArt from "../hub/BaseArt";
import { FLOOR_Y, PERSON_SCALE, TASK_STAND_X } from "../hub/layout";
import "../game/game.css";
import { planNote, resultNotes } from "./notes";
import { cropOf } from "./crops";
import type { CropId } from "./crops";
import { LIGHT_MAX, WATER_MAX, applyGreenhouse, canBeLush, lightAvailable, needWater, outcomeOf, resultOf, waterAvailable } from "./rules";
import type { Outcome } from "./rules";
import "./greenhouse.css";

type GreenhouseProps = {
  game: GameState;
  /** Called after the zoom-out. The state has the new meters, crew and harvest. */
  onDone: (game: GameState) => void;
  sound?: boolean;
};

type Phase = "in" | "plan" | "grow" | "done" | "out";

const ZOOM_MS = 1700;
const GROW_MS = 2800;
/** Zoom target: (444, 560) of 1600 × 900 moves to the middle of the screen at 1.8× size. Not further left, or the edge of the drawing shows. */
const ZOOM_ON = "translate(0%, -62%) scale(1.8)";
const BED_X = [560, 800, 1040];
const BASE_Y = 655;

function Drop({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <path
      className="gh__dropart"
      transform={`translate(${x} ${y}) scale(${scale})`}
      d="M0 -22 C0 -22 -16 -2 -16 8 a16 16 0 0 0 32 0 C16 -2 0 -22 0 -22Z"
      fill="#4aa8f0"
      stroke="#d4ecff"
      strokeWidth="3"
    />
  );
}

/** One plant. wilt = drooping and yellow, grow = upright and green, lush = tall and full. Each crop has its own look. */
function Plant({ x, state, crop, timelapse, delay }: { x: number; state: Outcome; crop: CropId; timelapse: boolean; delay: number }) {
  const h = state === "wilt" ? 120 : state === "grow" ? 210 : 270;
  const leafy = crop === "mizuna";
  const n = (state === "wilt" ? 3 : state === "grow" ? 4 : 5) + (leafy ? 2 : 0);
  const stem = state === "wilt" ? "#a9a04f" : "#4f9a4a";
  const green: Record<CropId, [string, string]> = {
    radish: ["#6fbf62", "#58d36a"],
    lettuce: ["#9bdc6a", "#8be874"],
    mizuna: ["#3f9e5a", "#35b868"],
    tomato: ["#6fbf62", "#58d36a"],
    pepper: ["#4fa84f", "#46c05a"],
  };
  const leaf = state === "wilt" ? "#c2b45a" : state === "grow" ? green[crop][0] : green[crop][1];
  const rx = state === "wilt" ? 20 : leafy ? 18 : crop === "lettuce" ? 34 : 28;
  const ry = state === "wilt" ? 8 : leafy ? 7 : crop === "lettuce" ? 15 : 12;
  const drop = state === "wilt" ? 70 : 32;
  const path = state === "wilt" ? `M0 0 Q4 -${h * 0.75} 50 -${h * 0.85}` : `M0 0 L0 -${h}`;
  const big = state === "lush";
  const red = "#e8453c";
  return (
    <g transform={`translate(${x} ${BASE_Y})`}>
      <g className={`gh__plant${timelapse ? " is-timelapse" : ""}`} key={state} style={{ animationDelay: `${delay}s` } as CSSProperties}>
        <path d={path} stroke={stem} strokeWidth="9" strokeLinecap="round" fill="none" />
        {Array.from({ length: n }, (_, i) => {
          const y = -(h * (i + 1)) / (n + 1);
          const sx = state === "wilt" ? 6 + i * 6 : 0;
          return (
            <g key={i}>
              <ellipse cx={sx - rx} cy={y} rx={rx} ry={ry} fill={leaf} transform={`rotate(${-drop} ${sx} ${y})`} />
              <ellipse cx={sx + rx} cy={y - 6} rx={rx} ry={ry} fill={leaf} transform={`rotate(${drop} ${sx} ${y - 6})`} />
            </g>
          );
        })}
        {state !== "wilt" && crop === "radish" && (
          <ellipse cx="0" cy="-6" rx={big ? 34 : 24} ry={big ? 26 : 18} fill="#e0457a" stroke="#9c2456" strokeWidth="3" />
        )}
        {state !== "wilt" && crop === "tomato" && (
          <>
            <circle cx="-30" cy={-h * 0.5} r="15" fill={red} stroke="#a82820" strokeWidth="3" />
            <circle cx="32" cy={-h * 0.34} r="15" fill={red} stroke="#a82820" strokeWidth="3" />
            <circle cx="-22" cy={-h * 0.2} r="13" fill={red} stroke="#a82820" strokeWidth="3" />
            <circle cx="0" cy={-h - 6} r="12" fill="#ffd84a" stroke="#c99a10" strokeWidth="3" />
          </>
        )}
        {state !== "wilt" && crop === "pepper" && (
          <>
            {[-34, 36, -26].map((cx, i) => (
              <ellipse key={i} cx={cx} cy={-h * (0.5 - i * 0.14) + 18} rx="9" ry="22" fill={big ? red : "#46a83c"} stroke={big ? "#a82820" : "#2a7a28"} strokeWidth="3" transform={`rotate(${cx < 0 ? 12 : -12} ${cx} ${-h * (0.5 - i * 0.14)})`} />
            ))}
            <circle cx="0" cy={-h - 6} r="10" fill="#fff6c8" stroke="#c9b86a" strokeWidth="3" />
          </>
        )}
        {state === "grow" && (crop === "lettuce" || crop === "mizuna") && <ellipse cx="0" cy={-h - 6} rx="22" ry="15" fill={leaf} />}
        {big && (crop === "lettuce" || crop === "mizuna") && (
          <>
            <ellipse cx="0" cy={-h - 8} rx="30" ry="20" fill={leaf} />
            <circle cx="0" cy={-h - 8} r="8" fill="#ffd84a" stroke="#c99a10" strokeWidth="3" />
          </>
        )}
        {state === "grow" && (crop === "radish") && <ellipse cx="0" cy={-h - 6} rx="18" ry="12" fill={leaf} />}
        {big && crop === "radish" && <circle cx="0" cy={-h - 6} r="10" fill="#ffd84a" stroke="#c99a10" strokeWidth="3" />}
      </g>
    </g>
  );
}

const LIGHT_GLOW = [0, 0.2, 0.4, 0.62];

export default function Greenhouse({ game, onDone, sound = true }: GreenhouseProps) {
  const audioRef = useRef<GameAudio | null>(null);
  const clock = useRef(0);
  const bedRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const { t } = useTimeline({});

  const first = game.tasks.length === 0;
  const waterMax = waterAvailable(game);
  const lightMax = lightAvailable(game);
  const crop = cropOf(game.crop);
  const needW = needWater(crop, first);

  const [phase, setPhase] = useState<Phase>("in");
  const [zoomed, setZoomed] = useState(false);
  const [water, setWater] = useState(0);
  const [light, setLight] = useState(0);
  const [cur, setCur] = useState<GameState>(game);
  const [resultAt, setResultAt] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    clock.current = t;
  }, [t]);

  useEffect(() => {
    if (!sound) return;
    const audio = createGameAudio();
    audioRef.current = audio;
    return () => {
      audio.stop();
      audioRef.current = null;
    };
  }, [sound]);

  // Zoom in, then hand the greenhouse to the player.
  useEffect(() => {
    const a = window.setTimeout(() => setZoomed(true), 60);
    const b = window.setTimeout(() => setPhase("plan"), ZOOM_MS + 200);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  const planning = phase === "plan";
  const out = outcomeOf(crop, water, light, first);
  const result = resultOf(crop, out);

  const addDrop = useCallback(() => {
    setWater((w) => (w < waterMax ? w + 1 : w));
    audioRef.current?.blip(700);
  }, [waterMax]);
  const removeDrop = useCallback(() => {
    setWater((w) => Math.max(0, w - 1));
    audioRef.current?.blip(480);
  }, []);
  const setLamp = useCallback((n: number) => {
    setLight(n);
    audioRef.current?.blip(380 + n * 120);
  }, []);

  // Dragging a drop from the tank: let go over the plants to water them. A plain tap also adds one.
  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!planning || water >= waterMax) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, moved: false };
    setDrag({ x: e.clientX, y: e.clientY });
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) s.moved = true;
    setDrag({ x: e.clientX, y: e.clientY });
  };
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    start.current = null;
    setDrag(null);
    if (!s) return;
    const r = bedRef.current?.getBoundingClientRect();
    const over = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!s.moved || over) addDrop();
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (planning) addDrop();
    }
  };

  const grow = useCallback(() => {
    if (!planning) return;
    const next = applyGreenhouse(game, water, light);
    setCur(next);
    setPhase("grow");
    audioRef.current?.chime();
    window.setTimeout(() => {
      setResultAt(clock.current);
      setPhase("done");
    }, GROW_MS);
  }, [planning, game, water, light]);

  const zoomOut = useCallback(() => {
    if (phase !== "done") return;
    setPhase("out");
    audioRef.current?.blip(520);
    window.setTimeout(() => setZoomed(false), 450);
    window.setTimeout(() => onDone(cur), 450 + ZOOM_MS);
  }, [phase, cur, onDone]);

  const notes: SceneNote[] = phase === "plan" ? [planNote(crop, first)] : phase === "done" || phase === "out" ? resultNotes(crop, out, resultAt) : [];

  const showView: Outcome = phase === "plan" || phase === "grow" || phase === "done" || phase === "out" ? out : "wilt";
  const tankLevel = Math.max(0, (cur.meters.water - (phase === "plan" ? water : 0)) / METER_MAX);
  const missing =
    out === "wilt"
      ? water < needW && water >= waterMax && waterMax < needW
        ? "Not enough free water (some is locked in the shelter walls)"
        : water < needW && light < crop.light
          ? "Needs more water and more light"
          : water < needW
            ? "Needs more water"
            : "Needs more light"
      : out === "grow"
        ? canBeLush(crop, first) && needW + 1 <= waterMax && lightMax >= crop.light + 1
          ? "Happy! One more of each would make it lush"
          : "Happy!"
        : "Super lush!";
  const lockedDrops = game.locked > 0 ? WATER_MAX - waterMax : 0;

  return (
    <div className={`ares gh${phase === "in" ? " is-opening" : ""}`}>
      <div className="ares__stage">
        {/* The base, and the camera zooming into the greenhouse room */}
        <div className="hub__zoom" style={{ transform: zoomed ? ZOOM_ON : "none" }}>
          <BaseArt>
            <g style={{ transform: `translate(${TASK_STAND_X.greenhouse}px, ${FLOOR_Y}px) scale(${PERSON_SCALE})` }}>
              <Boy mood="smile" look={0} />
            </g>
          </BaseArt>
        </div>

        {/* The close-up (1600 × 900 frame, fitted to the screen) */}
        <div className={`gh__closeup${phase === "in" || phase === "out" ? "" : " is-on"}`}>
          <div className="gh__frame">
            <svg className="gh__art" viewBox="0 0 1600 900" role="group" aria-label="Close-up of the greenhouse: a lamp, a water tank and three plants">
              <defs>
                <linearGradient id="gh-bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#102a2e" />
                  <stop offset="1" stopColor="#1f4443" />
                </linearGradient>
              </defs>
              <rect width="1600" height="900" fill="url(#gh-bg)" />
              <path d="M0 360 Q800 -90 1600 360" fill="rgba(160,230,220,0.10)" stroke="#a8e8df" strokeWidth="5" />
              <path d="M0 600 Q800 130 1600 600 M0 480 Q800 40 1600 480" fill="none" stroke="#a8e8df" strokeOpacity="0.25" strokeWidth="3" />
              <rect y="760" width="1600" height="140" fill="#262b45" />
              <path d="M0 800 H1600 M0 850 H1600" stroke="#3a4262" strokeWidth="3" />

              {/* Lamp and its light */}
              <path d="M560 0 V290 M1040 0 V290" stroke="#7a86a6" strokeWidth="6" />
              <path d="M520 314 L330 655 L1270 655 L1080 314 Z" fill="#e3b8ff" style={{ opacity: LIGHT_GLOW[light], transition: "opacity 0.5s" }} />
              <rect x="470" y="290" width="660" height="28" rx="14" fill="#cbb3ee" stroke="#8d72b8" strokeWidth="4" />
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <circle key={i} cx={520 + i * 93} cy="304" r="8" fill={i < 2 + light * 2 ? "#fff6c8" : "#7a6a9a"} style={{ transition: "fill 0.4s" }} />
              ))}

              {/* Water tank and pipe */}
              <rect x="100" y="330" width="120" height="420" rx="26" fill="rgba(59,127,184,0.22)" stroke="#7fb6e6" strokeWidth="5" />
              <rect x="112" y={738 - 396 * tankLevel} width="96" height={396 * tankLevel} rx="18" fill="#3b7fb8" style={{ transition: "all 0.5s" }} />
              <text className="gh__tanktext" x="160" y="790" textAnchor="middle">
                WATER
              </text>
              <path d="M220 700 H400" stroke="#7a86a6" strokeWidth="16" strokeLinecap="round" />

              {/* The trough and the plants */}
              <rect x="400" y="650" width="800" height="110" rx="18" fill="#5a3a22" />
              <rect x="400" y="650" width="800" height="26" rx="12" fill="#3d2616" />
              <text className="gh__tanktext" x="800" y="725" textAnchor="middle">
                {crop.name.toUpperCase()}
              </text>
              {BED_X.map((x, i) => (
                <Plant key={x} x={x} crop={crop.id} state={showView} timelapse={phase === "grow"} delay={i * 0.15} />
              ))}
              {Array.from({ length: water }, (_, i) => (
                <g key={i} className="gh__bob" style={{ animationDelay: `${i * 0.3}s` }}>
                  <Drop x={BED_X[i % 3] + 4} y={560} scale={1.15} />
                </g>
              ))}
            </svg>

            {/* The water drops: drag them onto the plants */}
            <div className="gh__tank" role="group" aria-label={`Water drops. Plants need ${needW}.`}>
              <b>WATER DROPS</b>
              <div className="gh__drops">
                {Array.from({ length: Math.max(0, waterMax - water) }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className="gh__drop"
                    disabled={!planning}
                    aria-label="Water drop: drag it onto the plants, or press Enter"
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    onKeyDown={onKey}
                  />
                ))}
                {Array.from({ length: lockedDrops }, (_, i) => (
                  <i key={`l${i}`} className="gh__drop is-locked" title="Locked in the shelter walls" />
                ))}
              </div>
              <span>
                {lockedDrops > 0 ? "Hatched = locked in the shelter walls" : planning ? "Drag a drop onto the plants" : ""}
              </span>
            </div>

            {/* Drop zone: the plant trough */}
            <div ref={bedRef} className={`gh__bed${drag ? " is-over" : ""}`}>
              {planning &&
                Array.from({ length: water }, (_, i) => (
                  <button key={i} type="button" className="gh__placed" style={{ left: `${15 + i * 30}%` }} onClick={removeDrop} aria-label="Take this water drop back">
                    ×
                  </button>
                ))}
            </div>

            {/* The lamp switch */}
            <div className="gh__lamp" role="radiogroup" aria-label="Lamp brightness">
              <b>LAMP</b>
              {Array.from({ length: LIGHT_MAX + 1 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={light === n}
                  className={light === n ? "is-on" : ""}
                  disabled={!planning || n > lightMax}
                  onClick={() => setLamp(n)}
                >
                  <span>{n === 0 ? "Off" : `Light ${n}`}</span>
                  <em>{n === 0 ? "free" : `Power −${n}`}</em>
                </button>
              ))}
            </div>

            {/* Live preview of what Grow! will do */}
            {(planning || phase === "grow") && (
              <div className={`gh__preview is-${out}`} role="status">
                <b>
                  {result.label} plants · {missing}
                </b>
                <span>
                  Water −{water} · Power −{light} · Crew {result.crew > 0 ? `+${result.crew}` : result.crew === 0 ? "no change" : result.crew}
                  {result.harvest ? ` · Harvest +${result.harvest}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {drag && <div className="gh__ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true" />}

        <NoteLayer notes={notes} t={t} />

        <Tablet
          decisions={cur.decisions}
          meters={cur.meters}
          locked={cur.locked}
          crew={cur.crew}
          nudge={phase === "grow" || phase === "done" ? ["water", "power", "crew"] : []}
          compact={phase === "in" || phase === "plan" || phase === "grow"}
        />

        {planning && (
          <button type="button" className="ares__cta" onClick={grow}>
            Grow! ▸
          </button>
        )}
        {phase === "done" && (
          <button type="button" className="ares__cta" onClick={zoomOut}>
            Zoom out ▸
          </button>
        )}
        <div className="ares__flash" aria-hidden="true" />
      </div>
    </div>
  );
}
