// Mission ARES — Step 1b: touchdown at Jezero Crater, then the tablet tutorial.
//
// A watch scene (about 31 seconds) that ends in the first thing the player does:
// tap each bar on the Commander's tablet to learn what it means.
//
// Timeline (seconds) — edit BEATS (what happens) here, and the words in ./notes.ts.
//    0  Mars fills the sky. The ship drops toward it.
//    5.5 Entry: a fireball. Fact: the 7-minute landing.
//   12.5 The parachute opens, then the rockets fire.
//   18.5 Touchdown. Dust. The crew made it.
//   22.5 The hatch opens. The crew walks out, the boy last, in a spare suit.
//   31   The Commander hands over the tablet. The clock holds here, and the
//        player taps power, water and air. Then "Start mission".
//
// Usage:  <Touchdown game={game} onDone={(g) => { setGame(g); setScene("hub"); }} />
// Dev:    ?scene=touchdown&at=31 jumps straight to the tablet.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Astronaut, CrewMember, StarField } from "../game/art";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import { NoteLayer } from "../game/notes";
import { seededRandom } from "../game/random";
import type { GameState, TabletFocus } from "../game/state";
import Tablet from "../game/Tablet";
import { devJump, useTimeline } from "../game/useTimeline";
import "../game/game.css";
import { WATCH_NOTES, tabletNote } from "./notes";
import "./touchdown.css";

type TouchdownProps = {
  game: GameState;
  /** Called when the player presses "Start mission". */
  onDone: (game: GameState) => void;
  sound?: boolean;
};

const BEATS = [
  { id: "approach", at: 0 },
  { id: "entry", at: 5.5 },
  { id: "chute", at: 12.5 },
  { id: "land", at: 18.5 },
  { id: "out", at: 22.5 },
  { id: "tablet", at: 31 },
] as const;

type BeatId = (typeof BEATS)[number]["id"];
const beatAt = (id: BeatId) => BEATS.find((b) => b.id === id)!.at;

/** The clock stops here, so the player can take their time with the tablet. */
const HOLD_AT = 31.8;
const WALK_GAP = 0.9; // seconds between one person and the next stepping out
const WALK_TIME = 1.8;

// ---------------------------------------------------------------------------
// Scene pieces
// ---------------------------------------------------------------------------

const GROUND_Y = 640; // where the sky meets the ground
const LANDER = { x: 470, y: 722 }; // the lander's feet
const HATCH = { x: 470, y: 664 }; // where the crew steps out

/** Who walks out, in order, and where each one ends up standing. */
const WALKERS = [
  { id: "commander", x: 840, s: 0.92 },
  { id: "doctor", x: 980, s: 0.92 },
  { id: "engineer", x: 1120, s: 0.92 },
  { id: "pilot", x: 1260, s: 0.92 },
  { id: "boy", x: 1400, s: 0.72 },
] as const;
const STAND_Y = 800;

function makeRocks() {
  const rand = seededRandom(31);
  return Array.from({ length: 34 }, () => {
    const y = GROUND_Y + 24 + rand() * 220;
    const depth = (y - GROUND_Y) / 240; // 0 far … 1 near
    return {
      x: rand() * 1600,
      y,
      rx: 5 + depth * 26 * (0.5 + rand()),
      ry: 3 + depth * 13 * (0.5 + rand()),
      dark: rand() > 0.5,
    };
  });
}

export default function Touchdown({ game, onDone, sound = true }: TouchdownProps) {
  const audioRef = useRef<GameAudio | null>(null);
  const { t, seek } = useTimeline({ holdAt: HOLD_AT });
  const sec = Math.floor(t);

  const [focus, setFocus] = useState<TabletFocus | null>(null);
  const [seen, setSeen] = useState<TabletFocus[]>([]);
  // True once the player jumps ahead (Skip, or a dev jump): nothing replays.
  const [skipped, setSkipped] = useState(() => devJump() >= beatAt("tablet"));

  const rocks = useMemo(() => makeRocks(), []);

  const current = Math.max(0, BEATS.findLastIndex((b) => t >= b.at));
  const atTablet = t >= beatAt("tablet");
  const learned = (["power", "water", "air"] as const).every((k) => seen.includes(k));
  const retroOn = t >= beatAt("land") - 1.8 && t < beatAt("land") + 0.5;

  // Sound on / off.
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

  // Things that happen at a given second.
  useEffect(() => {
    const audio = audioRef.current;
    if (sec === Math.floor(beatAt("entry"))) {
      audio?.hum(false);
      audio?.roar(7);
    }
    if (sec === Math.floor(beatAt("chute"))) audio?.chute();
    if (sec === Math.floor(beatAt("land"))) audio?.thud();
    if (sec === Math.floor(beatAt("out"))) audio?.hiss();
    if (sec === Math.floor(beatAt("tablet"))) audio?.chime();
  }, [sec]);

  const pick = useCallback((row: TabletFocus) => {
    setFocus((f) => (f === row ? null : row));
    setSeen((s) => (s.includes(row) ? s : [...s, row]));
    audioRef.current?.blip(row === "power" ? 660 : row === "water" ? 760 : row === "air" ? 880 : 560);
  }, []);

  const start = useCallback(() => {
    audioRef.current?.chime();
    onDone({ ...game, log: [...game.log, "Landed at Jezero Crater"] });
  }, [game, onDone]);

  const classes = [
    "ares",
    "td",
    ...BEATS.slice(0, current + 1).map((b) => `at-${b.id}`),
    skipped && "is-skipped",
    t < 1.4 && "is-opening",
  ]
    .filter(Boolean)
    .join(" ");

  const notes = atTablet ? [tabletNote(seen.length, learned)] : WATCH_NOTES;

  return (
    <div className={classes} data-beat={BEATS[current].id}>
      <div className="ares__stage">
        {/* ---------- High above Mars: approach and entry ---------- */}
        <svg className="ares__scene td__orbit" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <radialGradient id="td-fire" cx="0.5" cy="0.35" r="0.65">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.3" stopColor="#ffe08a" />
              <stop offset="0.65" stopColor="#ff8a3d" />
              <stop offset="1" stopColor="#ff4d1f" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="td-streak" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#ff9d4d" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ff4d1f" stopOpacity="0" />
            </linearGradient>
            <clipPath id="td-limb-clip">
              <circle cx="800" cy="1500" r="950" />
            </clipPath>
          </defs>
          <rect width="1600" height="900" fill="#03050d" />
          <StarField count={110} seed={77} maxY={600} />

          {/* The curve of Mars, with a glowing sliver of atmosphere */}
          <circle cx="800" cy="1500" r="992" fill="#ff9d4d" opacity="0.14" />
          <circle cx="800" cy="1500" r="968" fill="#ff9d4d" opacity="0.2" />
          <circle cx="800" cy="1500" r="950" fill="#c1583a" />
          <g clipPath="url(#td-limb-clip)">
            <ellipse cx="520" cy="700" rx="230" ry="46" fill="#9a3f27" opacity="0.7" />
            <ellipse cx="1130" cy="760" rx="300" ry="60" fill="#a84a2e" opacity="0.7" />
            <ellipse cx="830" cy="860" rx="420" ry="70" fill="#8a3820" opacity="0.55" />
            <circle cx="300" cy="820" r="30" fill="#8a3820" opacity="0.7" />
            <circle cx="1350" cy="640" r="22" fill="#8a3820" opacity="0.7" />
          </g>

          {/* The ship. Nose-down, heat shield first. */}
          <g className="td__cap">
            <g className="td__fire">
              <path d="M-26 40 L0 -300 L26 40 Z" fill="url(#td-streak)" />
              <ellipse cx="0" cy="58" rx="64" ry="92" fill="url(#td-fire)" />
            </g>
            <path d="M-18 -52 L18 -52 L34 28 L-34 28 Z" fill="#e8ecf3" />
            <path d="M-18 -52 Q0 -64 18 -52 Z" fill="#c4532d" />
            <rect x="-34" y="-8" width="68" height="9" fill="#e0663a" />
            <circle cx="0" cy="-26" r="7" fill="#13203a" stroke="#9aa6b8" strokeWidth="3" />
            <path d="M-38 28 Q0 54 38 28 L34 20 L-34 20 Z" fill="#3a2a22" />
          </g>
        </svg>

        {/* ---------- On the ground: Jezero Crater ---------- */}
        <svg className="ares__scene td__surface" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="td-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a9774f" />
              <stop offset="0.7" stopColor="#d8a87c" />
              <stop offset="1" stopColor="#e9c9a2" />
            </linearGradient>
            <linearGradient id="td-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9a5634" />
              <stop offset="1" stopColor="#5e301c" />
            </linearGradient>
            <radialGradient id="td-sun" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff6e0" stopOpacity="0.7" />
              <stop offset="1" stopColor="#fff6e0" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="td-flame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.35" stopColor="#ffe08a" />
              <stop offset="1" stopColor="#ff4d1f" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect width="1600" height="900" fill="url(#td-sky)" />
          <circle cx="1230" cy="250" r="90" fill="url(#td-sun)" />
          <circle cx="1230" cy="250" r="20" fill="#fff6e0" />

          {/* The far wall of the crater, with the river-delta fan on it */}
          <path
            d={`M0 ${GROUND_Y} L0 566 L120 526 L260 552 L380 506 L520 544 L700 514 L900 556 L1080 508 L1250 542 L1400 500 L1600 546 L1600 ${GROUND_Y} Z`}
            fill="#a27350"
          />
          <path d={`M1110 ${GROUND_Y} L1210 560 L1320 566 L1420 ${GROUND_Y} Z`} fill="#c29a70" />
          <path d="M1230 568 L1170 640 M1270 570 L1260 640 M1310 570 L1340 640" stroke="#8a6040" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect y={GROUND_Y - 40} width="1600" height="40" fill="#e9c9a2" opacity="0.35" />

          {/* Ground and rocks */}
          <rect y={GROUND_Y} width="1600" height={900 - GROUND_Y} fill="url(#td-ground)" />
          {rocks.map((r, i) => (
            <ellipse key={i} cx={r.x} cy={r.y} rx={r.rx} ry={r.ry} fill={r.dark ? "#4a2414" : "#85482c"} />
          ))}

          {/* The lander, hanging from its parachute, then standing */}
          <g className="td__lander">
            <g className="td__chute">
              <path d="M-170 -330 A170 130 0 0 1 170 -330 Q85 -300 0 -312 Q-85 -300 -170 -330 Z" fill="#f4f1e8" />
              <path d="M-100 -430 Q-60 -330 -85 -308 L-45 -312 Q-30 -380 -20 -452 Z" fill="#e0663a" />
              <path d="M20 -452 Q30 -380 45 -312 L85 -308 Q60 -330 100 -430 Z" fill="#e0663a" />
              <path d="M-170 -330 L-22 -205 M-85 -308 L-14 -205 M0 -312 L0 -208 M85 -308 L14 -205 M170 -330 L22 -205" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="2" fill="none" />
            </g>
            <g className={`td__retro${retroOn ? " is-on" : ""}`}>
              <path d="M-52 -26 Q-60 40 -48 120 Q-36 40 -34 -26 Z" fill="url(#td-flame)" />
              <path d="M34 -26 Q36 40 48 120 Q60 40 52 -26 Z" fill="url(#td-flame)" />
            </g>
            <path d="M-40 -50 L-104 2 M40 -50 L104 2 M-18 -50 L-48 2 M18 -50 L48 2" stroke="#b8c0d2" strokeWidth="8" strokeLinecap="round" />
            <ellipse cx="-104" cy="3" rx="16" ry="5" fill="#8f99ad" />
            <ellipse cx="104" cy="3" rx="16" ry="5" fill="#8f99ad" />
            <ellipse cx="-48" cy="3" rx="14" ry="4.5" fill="#8f99ad" />
            <ellipse cx="48" cy="3" rx="14" ry="4.5" fill="#8f99ad" />
            <path d="M-75 -30 L-35 -200 Q0 -216 35 -200 L75 -30 Z" fill="#dfe3ec" />
            <path d="M22 -206 L75 -30 L46 -30 L8 -209 Z" fill="#000000" opacity="0.13" />
            <path d="M-56 -116 L56 -116 L60 -98 L-60 -98 Z" fill="#e0663a" />
            <text x="0" y="-136" textAnchor="middle" className="td__lander-name">
              ARES
            </text>
            <path d="M-78 -30 Q0 -4 78 -30 L74 -42 L-74 -42 Z" fill="#3a2a22" />
            <rect x="-22" y="-92" width="44" height="58" rx="9" fill="#8f99ad" />
            <rect className="td__hatch-light" x="-22" y="-92" width="44" height="58" rx="9" fill="#ffd88a" />
            <rect className="td__hatch-door" x="-22" y="-92" width="44" height="58" rx="9" fill="#c3cad8" stroke="#6d7891" strokeWidth="2" />
            <path className="td__ramp" d="M24 -36 L40 -36 L142 2 L92 2 Z" fill="#46526e" stroke="#5a6a90" strokeWidth="2" />
          </g>

          {/* Dust from the rockets */}
          <g className="td__dust">
            {[-150, -80, -20, 40, 100, 160, 220].map((dx, i) => (
              <circle key={dx} cx={LANDER.x + dx} cy={LANDER.y - 8 - (i % 2) * 8} r={26 + (i % 3) * 8} style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </g>

          {/* The crew steps out, the boy last. Everyone wears a helmet outside. */}
          {WALKERS.map((w, i) => {
            const start = beatAt("out") + i * WALK_GAP;
            const walking = t >= start && t < start + WALK_TIME;
            const style = {
              "--sx": `${HATCH.x}px`,
              "--sy": `${HATCH.y}px`,
              "--x": `${w.x}px`,
              "--y": `${STAND_Y}px`,
              "--s": w.s,
              "--i": i,
            } as CSSProperties;
            return (
              <g key={w.id} className={`td__walker${walking ? " is-walk" : ""}`} style={style}>
                {w.id === "boy" ? (
                  <Astronaut
                    accent="#e0a63a"
                    skin="#c98b62"
                    hair="#2a1a12"
                    helmet
                    look={0}
                    mood={learned ? "smile" : atTablet ? "wow" : "worried"}
                  />
                ) : (
                  <>
                    <CrewMember id={w.id} helmet look={0} mood={atTablet ? "smile" : "calm"} />
                    {w.id === "commander" && atTablet && (
                      <g className="td__tablet-prop">
                        <rect x="38" y="-126" width="44" height="32" rx="5" fill="#0b1220" stroke="#ffcf99" strokeWidth="2.5" />
                        <path d="M46 -108h12M46 -100h28" stroke="#7ee0b0" strokeWidth="3" strokeLinecap="round" />
                      </g>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* The words */}
        <NoteLayer notes={notes} t={Math.max(t, atTablet ? 31.3 : 0)} />

        {/* The tablet: first appears here, then stays for the whole game. */}
        {atTablet && (
          <Tablet
            meters={game.meters}
            crew={game.crew}
            focus={focus}
            nudge={(["power", "water", "air"] as const).filter((k) => !seen.includes(k))}
            onPick={pick}
          />
        )}

        {learned && (
          <button type="button" className="ares__cta" onClick={start}>
            Start mission ▸
          </button>
        )}

        {!atTablet && (
          <button
            type="button"
            className="ares__skip"
            onClick={() => {
              setSkipped(true);
              seek(beatAt("tablet"));
            }}
          >
            Skip ▸
          </button>
        )}
        <div className="ares__flash" aria-hidden="true" />
      </div>
    </div>
  );
}
