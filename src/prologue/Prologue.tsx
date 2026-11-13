// Mission ARES — Step 0: the prologue (about 60 seconds).
//
// Third-person view: we watch the boy. All the words are IN the scene: one
// short note at a time, placed next to what it talks about, with a pointer
// line. Story notes are dark glass; space facts are paper notes. Nothing pauses.
//
// Timeline (seconds) — edit BEATS (what happens) and SCENE_NOTES (the words).
//    0  Asleep in the grass, right next to a launch site.
//    5  He wakes up and looks at the sky.            Fact: planet or star?
//   13  A Planetary Parade: five planets in a row.   Fact: Planetary Parade
//   22  Loudspeaker: "Launch in 5 minutes!" The launch clock appears.
//   27  He runs toward the launch pad.
//   32  Cut to the launch pad. Fog everywhere. He is lost.
//   38  He walks up a ramp, through an open door.
//   43  The door slams shut. His face appears in the rocket's window.
//   47  5…4…3…2…1, the engines roar.                  Fact: how rockets fly
//   52  Liftoff, with him inside.                     Fact: orbit speed
//   58.5 Flash, cut to black, onDone() at 60.5.
//
// Usage:
//   <Prologue onDone={() => setScene("launch")} />
// Mount it from a "Play" button so the browser allows sound.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPrologueAudio } from "./prologueAudio";
import type { PrologueAudio } from "./prologueAudio";
import "./Prologue.css";

type PrologueProps = {
  /** Called once, when the scene ends or the player presses Skip. */
  onDone: () => void;
  /** Synthesized crickets, chime, beeps and rumble. Default: on. */
  sound?: boolean;
};

/** What happens, and when. The CSS reacts to these (`.at-run`, …). */
const BEATS = [
  { id: "asleep", at: 0 },
  { id: "awake", at: 5 },
  { id: "parade", at: 13 },
  { id: "announce", at: 22 },
  { id: "run", at: 27 },
  { id: "lost", at: 32 },
  { id: "door", at: 38 },
  { id: "trapped", at: 43 },
  { id: "countdown", at: 47 },
  { id: "liftoff", at: 52 },
] as const;

type BeatId = (typeof BEATS)[number]["id"];

const beatAt = (id: BeatId) => BEATS.find((b) => b.id === id)!.at;

const FLASH_AT = 58.5;
const END_AT = 60.5;
const LAUNCH_CLOCK_START = 5 * 60; // "launches in 5 minutes"

// ---------------------------------------------------------------------------
// SCENE NOTES — the words, placed in the scene (1600 × 900 coordinates).
// Only one note shows at a time. `point` is what the note talks about: a line
// is drawn from the note to it. Keep the text short.
// Add every fact's source to your in-game Data Sources screen.
// ---------------------------------------------------------------------------

type SceneNote = {
  from: number;
  to: number;
  kind: "story" | "fact" | "shout";
  text: string;
  /** Space facts only: shown as "SPACE FACT · title". */
  title?: string;
  source?: string;
  box: { x: number; y: number; w: number };
  point?: { x: number; y: number };
};

const SCENE_NOTES: SceneNote[] = [
  {
    from: 0.6,
    to: 5,
    kind: "story",
    text: "A boy fell asleep in the grass, right next to a rocket launch site.",
    box: { x: 300, y: 500, w: 450 },
    point: { x: 585, y: 728 },
  },
  {
    from: 5.4,
    to: 8.2,
    kind: "story",
    text: "He wakes up and looks at the sky.",
    box: { x: 240, y: 470, w: 350 },
    point: { x: 628, y: 592 },
  },
  {
    from: 8.4,
    to: 13,
    kind: "fact",
    title: "Planet or star?",
    text: "Stars twinkle. Planets shine steady, because they are closer and reflect our Sun's light.",
    source: "NASA Science · Night Sky Network",
    box: { x: 250, y: 80, w: 450 },
    point: { x: 590, y: 322 },
  },
  {
    from: 13.3,
    to: 16.6,
    kind: "story",
    text: "The planets are lined up in a row!",
    box: { x: 860, y: 300, w: 400 },
    point: { x: 800, y: 250 },
  },
  {
    from: 16.8,
    to: 22,
    kind: "fact",
    title: "Planetary Parade",
    text: "All planets orbit the Sun on one flat path, so from Earth they look lined up in a row.",
    source: "NASA Science · What's Up: Skywatching",
    box: { x: 230, y: 100, w: 470 },
    point: { x: 485, y: 371 },
  },
  {
    from: 22.4,
    to: 27,
    kind: "shout",
    text: "“Attention! The rocket launches in 5 minutes!”",
    box: { x: 540, y: 380, w: 380 },
    point: { x: 950, y: 532 },
  },
  {
    from: 27.3,
    to: 31.8,
    kind: "story",
    text: "He runs to see the rocket up close!",
    box: { x: 680, y: 330, w: 380 },
    point: { x: 1150, y: 560 },
  },
  {
    from: 32.6,
    to: 37.8,
    kind: "story",
    text: "Up close it's huge and foggy… He's lost!",
    box: { x: 240, y: 460, w: 420 },
  },
  {
    from: 38.3,
    to: 42.8,
    kind: "story",
    text: "He finds an open door and walks in…",
    box: { x: 470, y: 380, w: 380 },
    point: { x: 972, y: 560 },
  },
  {
    from: 43.2,
    to: 46.8,
    kind: "story",
    text: "CLANG! The door shuts. He's inside the rocket!",
    box: { x: 450, y: 330, w: 400 },
    point: { x: 982, y: 472 },
  },
  {
    from: 47.3,
    to: 51.8,
    kind: "fact",
    title: "How rockets fly",
    text: "The engines push hot gas DOWN, so the rocket goes UP!",
    source: "NASA Glenn · Beginner's Guide to Rockets",
    box: { x: 300, y: 540, w: 440 },
    point: { x: 1000, y: 770 },
  },
  {
    from: 52.3,
    to: 55.2,
    kind: "shout",
    text: "LIFTOFF! He's on his way to space!",
    box: { x: 520, y: 300, w: 560 },
  },
  {
    from: 55.4,
    to: 58.4,
    kind: "fact",
    title: "How fast?",
    text: "To stay in orbit around Earth, a rocket needs about 28,000 km/h!",
    source: "NASA Glenn · Beginner's Guide to Rockets",
    box: { x: 520, y: 300, w: 560 },
  },
];

// Rough text metrics at the note font sizes (viewBox units), used to size each box.
const NOTE_CHAR_W = 14;
const NOTE_LINE_H = 34;

function noteHeight(note: SceneNote) {
  const perLine = Math.max(8, Math.floor((note.box.w - 40) / NOTE_CHAR_W));
  const lines = Math.ceil(note.text.length / perLine);
  return lines * NOTE_LINE_H + 36 + (note.title ? 34 : 0);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Scene coordinates (both SVGs are 1600 × 900).
const HORIZON_Y = 640;
const MARS = { x: 800, y: 250 };
const OTHER_PLANETS = [
  { name: "Mercury", x: 170, y: 540, r: 3.5, color: "#d8c8b0" },
  { name: "Venus", x: 380, y: 420, r: 7, color: "#fff4d6" },
  { name: "Jupiter", x: 590, y: 322, r: 7.5, color: "#f3e3c3" },
  { name: "Saturn", x: 1030, y: 205, r: 6, color: "#e9d39a", ring: true },
];
const PARADE_LINE = [
  OTHER_PLANETS[0],
  OTHER_PLANETS[1],
  OTHER_PLANETS[2],
  MARS,
  OTHER_PLANETS[3],
]
  .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
  .join(" ");

/**
 * The launch clock, in seconds. Real time is squeezed while he runs and gets
 * lost (5 minutes pass in ~25 s), then the last 5 seconds tick in real time.
 */
function launchClock(t: number): number | null {
  const announce = beatAt("announce");
  const countdown = beatAt("countdown");
  const liftoff = beatAt("liftoff");
  if (t < announce) return null;
  if (t < countdown) {
    const squeezed = LAUNCH_CLOCK_START - (liftoff - countdown);
    return Math.ceil(LAUNCH_CLOCK_START - ((t - announce) * squeezed) / (countdown - announce));
  }
  return Math.max(0, Math.ceil(liftoff - t));
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Small seeded random generator, so the sky looks the same on every run. */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStars(count: number) {
  const rand = seededRandom(2026);
  const planets = [...OTHER_PLANETS, MARS];
  const stars: { x: number; y: number; r: number; delay: number }[] = [];
  while (stars.length < count) {
    const x = rand() * 1600;
    const y = rand() * (HORIZON_Y - 60);
    const r = 0.6 + rand() * 1.5;
    const delay = rand() * 4;
    // Keep the sky clear right around the planets and their labels.
    if (planets.some((p) => Math.hypot(x - p.x, y - p.y - 10) < 36)) continue;
    stars.push({ x, y, r, delay });
  }
  return stars;
}

function makeGrass() {
  const rand = seededRandom(7);
  let d = "M0 900 L0 852";
  for (let x = 0; x < 1600; x += 13) {
    const h = 26 + rand() * 62;
    const lean = (rand() - 0.5) * 16;
    d += ` L${x + 3} 850 L${x + 6.5 + lean} ${850 - h} L${x + 10} 850`;
  }
  return d + " L1600 852 L1600 900 Z";
}

function Stars({ stars }: { stars: ReturnType<typeof makeStars> }) {
  return (
    <g className="prologue__stars" aria-hidden="true">
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          style={{ animationDelay: `${s.delay}s` }}
        />
      ))}
    </g>
  );
}

/** The other planets of the parade. Mars is drawn separately (it is the star of the show). */
function Planets() {
  return (
    <g className="prologue__planets" aria-hidden="true">
      <path className="prologue__parade-line" d={PARADE_LINE} />
      {OTHER_PLANETS.map((p) => (
        <g key={p.name}>
          <circle cx={p.x} cy={p.y} r={p.r * 2.2} fill={p.color} opacity="0.18" />
          {p.ring && (
            <ellipse
              cx={p.x}
              cy={p.y}
              rx={p.r * 2.1}
              ry={p.r * 0.6}
              fill="none"
              stroke={p.color}
              strokeWidth="1.4"
              transform={`rotate(-18 ${p.x} ${p.y})`}
            />
          )}
          <circle cx={p.x} cy={p.y} r={p.r} fill={p.color} />
          <text className="prologue__planet-label" x={p.x} y={p.y + p.r + 22} textAnchor="middle">
            {p.name}
          </text>
        </g>
      ))}
    </g>
  );
}

/** One note in the scene, with a pointer line to what it talks about. */
function SceneNoteView({ note, leaving }: { note: SceneNote; leaving: boolean }) {
  const { x, y, w } = note.box;
  const h = noteHeight(note);
  const p = note.point;
  const from = p && { x: clamp(p.x, x + 18, x + w - 18), y: clamp(p.y, y, y + h) };
  return (
    <g className={`scene-note scene-note--${note.kind}${leaving ? " is-leaving" : ""}`}>
      {p && from && (
        <>
          <path className="scene-note__pointer" d={`M${from.x} ${from.y} L${p.x} ${p.y}`} />
          <circle className="scene-note__target" cx={p.x} cy={p.y} r="12" />
          <circle className="scene-note__dot" cx={p.x} cy={p.y} r="4.5" />
        </>
      )}
      <foreignObject x={x} y={y} width={w} height={h}>
        <div className="scene-note__box">
          {note.title && <p className="scene-note__tag">SPACE FACT · {note.title}</p>}
          <p className="scene-note__text">{note.text}</p>
        </div>
      </foreignObject>
    </g>
  );
}

/** The boy standing, seen from behind. Feet at (0, 0), about 200 units tall. */
function Kid() {
  return (
    <g className="kid">
      <ellipse className="kid__shadow" cx="0" cy="2" rx="38" ry="7" />
      <g className="kid__body">
        <g className="kid__leg">
          <rect x="-17" y="-80" width="14" height="76" rx="6" fill="#26324f" />
          <ellipse cx="-10" cy="-3" rx="10" ry="5" fill="#0e1424" />
        </g>
        <g className="kid__leg kid__leg--back">
          <rect x="3" y="-80" width="14" height="76" rx="6" fill="#222c47" />
          <ellipse cx="10" cy="-3" rx="10" ry="5" fill="#0e1424" />
        </g>
        <g transform="translate(-27 -146)">
          <g className="kid__arm">
            <rect x="-6" y="0" width="12" height="64" rx="6" fill="#2b7686" />
            <circle cx="0" cy="66" r="6.5" fill="#c98b62" />
          </g>
        </g>
        <path d="M-28 -150 Q0 -158 28 -150 L31 -84 Q0 -76 -31 -84 Z" fill="#2f8496" />
        <rect x="-31" y="-90" width="62" height="10" rx="4" fill="#256b7a" />
        <rect x="-6" y="-162" width="12" height="12" fill="#b57a54" />
        <circle cx="-19" cy="-176" r="4.5" fill="#c98b62" />
        <circle cx="19" cy="-176" r="4.5" fill="#c98b62" />
        <circle cx="0" cy="-180" r="20" fill="#2a1a12" />
        <path d="M-20 -184 Q0 -206 20 -184 Q10 -192 0 -191 Q-10 -192 -20 -184 Z" fill="#3a2418" />
        <rect x="-21" y="-144" width="42" height="54" rx="10" fill="#e0a63a" />
        <rect x="-14" y="-120" width="28" height="18" rx="5" fill="#c58c27" />
        <rect x="-6" y="-152" width="12" height="9" rx="4" fill="#c58c27" />
        <g transform="translate(27 -146)">
          <g className="kid__arm kid__arm--right">
            <rect x="-6" y="0" width="12" height="64" rx="6" fill="#2b7686" />
            <circle cx="0" cy="66" r="6.5" fill="#c98b62" />
          </g>
        </g>
      </g>
    </g>
  );
}

/** The boy lying on his back, head on his backpack. Ground at y = 0. */
function SleepingKid() {
  return (
    <g className="kid kid--asleep">
      <ellipse className="kid__shadow" cx="0" cy="1" rx="100" ry="7" />
      <rect x="-104" y="-24" width="44" height="24" rx="9" fill="#e0a63a" />
      <rect x="-98" y="-14" width="30" height="10" rx="4" fill="#c58c27" />
      <g className="kid__breath">
        <rect x="16" y="-21" width="70" height="13" rx="6" fill="#222c47" />
        <rect x="16" y="-33" width="72" height="14" rx="6" fill="#26324f" />
        <ellipse cx="90" cy="-14" rx="6" ry="9" fill="#0e1424" />
        <ellipse cx="92" cy="-27" rx="6" ry="9" fill="#0e1424" />
        <rect x="-48" y="-40" width="66" height="32" rx="13" fill="#2f8496" />
        <rect x="-40" y="-44" width="46" height="11" rx="5" fill="#2b7686" />
        <circle cx="8" cy="-39" r="6" fill="#c98b62" />
      </g>
      <circle cx="-70" cy="-26" r="18" fill="#2a1a12" />
      <circle cx="-62" cy="-28" r="15" fill="#c98b62" />
      <path d="M-58 -33 q4 3 8 0" fill="none" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" />
      <path d="M-76 -42 Q-62 -50 -50 -40 Q-62 -44 -76 -38 Z" fill="#3a2418" />
    </g>
  );
}

export default function Prologue({ onDone, sound = true }: PrologueProps) {
  const [t, setT] = useState(0);

  const audioRef = useRef<PrologueAudio | null>(null);
  const doneRef = useRef(false);

  const stars = useMemo(() => makeStars(110), []);
  const grass = useMemo(() => makeGrass(), []);

  const sec = Math.floor(t);
  const current = Math.max(0, BEATS.findLastIndex((b) => t >= b.at));
  const beat = BEATS[current];
  const clock = launchClock(t);
  const noteIndex = SCENE_NOTES.findIndex((n) => t >= n.from && t < n.to);
  const note = noteIndex >= 0 ? SCENE_NOTES[noteIndex] : undefined;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    audioRef.current?.stop();
    onDone();
  }, [onDone]);

  // The clock. Uses real elapsed time, so a slow frame never stretches the scene.
  // Dev only: open http://localhost:5173/?t=40 and press Play to start at 40 s.
  useEffect(() => {
    const jump = import.meta.env.DEV
      ? Number(new URLSearchParams(window.location.search).get("t")) || 0
      : 0;
    const startedAt = performance.now() - jump * 1000;
    const id = window.setInterval(() => {
      setT(Math.floor((performance.now() - startedAt) / 100) / 10);
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  // Sound on / off.
  useEffect(() => {
    if (!sound) return;
    const audio = createPrologueAudio();
    audioRef.current = audio;
    return () => {
      audio.stop();
      audioRef.current = null;
    };
  }, [sound]);

  // Things that happen at a given second.
  useEffect(() => {
    const audio = audioRef.current;
    if (sec === beatAt("announce")) audio?.announce();
    if (sec === beatAt("lost")) audio?.hushCrickets();
    if (sec === beatAt("trapped")) audio?.clang();
    if (sec === beatAt("countdown")) audio?.rumble(beatAt("liftoff") - beatAt("countdown") + 1);
    if (sec >= beatAt("countdown") && sec < beatAt("liftoff")) audio?.tick();
    if (sec >= END_AT) finish();
  }, [sec, finish]);

  const classes = [
    "prologue",
    ...BEATS.slice(0, current + 1).map((b) => `at-${b.id}`),
    t >= FLASH_AT && "is-ending",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-beat={beat.id}>
      <div className="prologue__stage">
        {/* ---------- Scene 1: the field next to the launch site ---------- */}
        <svg className="prologue__scene prologue__field" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="prologue-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#03050d" />
              <stop offset="0.55" stopColor="#0a1226" />
              <stop offset="0.72" stopColor="#16203a" />
            </linearGradient>
            <radialGradient id="prologue-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g className="prologue__far">
            <rect width="1600" height="900" fill="url(#prologue-sky)" />
            <Stars stars={stars} />
            <Planets />

            {/* Mars: a steady dot. Planets don't twinkle the way stars do. */}
            <g className="prologue__mars" aria-hidden="true">
              <circle className="prologue__mars-glow" cx={MARS.x} cy={MARS.y} r="10" />
              <circle className="prologue__mars-dot" cx={MARS.x} cy={MARS.y} r="5" />
              <text
                className="prologue__planet-label prologue__planet-label--mars"
                x={MARS.x}
                y={MARS.y + 28}
                textAnchor="middle"
              >
                Mars
              </text>
            </g>

            <g aria-hidden="true">
              <path
                d={`M0 ${HORIZON_Y} C200 600 380 655 560 ${HORIZON_Y - 8} S900 612 1100 ${HORIZON_Y - 4} S1450 600 1600 ${HORIZON_Y - 14} L1600 900 L0 900 Z`}
                fill="#0a101d"
              />
              <rect y={HORIZON_Y + 14} width="1600" height="260" fill="#070b14" />

              {/* Loudspeaker on a pole, between the boy and the launch site. */}
              <g className="prologue__speaker">
                <rect x="977" y="528" width="6" height="118" fill="#05080f" />
                <path d="M980 532 L954 519 L954 551 Z" fill="#0b1220" stroke="#2a3550" strokeWidth="1.5" />
                <path className="prologue__speaker-wave" d="M945 524 Q936 535 945 546" />
                <path className="prologue__speaker-wave prologue__speaker-wave--2" d="M934 514 Q920 535 934 556" />
                <path className="prologue__speaker-wave prologue__speaker-wave--3" d="M922 504 Q904 535 922 566" />
              </g>

              {/* Launch site: a generic tower and rocket. No logos, no real site. */}
              <g className="prologue__launch" transform="translate(344 0)">
                <ellipse cx="806" cy={HORIZON_Y - 6} rx="150" ry="60" fill="url(#prologue-glow)" />
                <g fill="#05080f">
                  <rect x="786" y={HORIZON_Y - 128} width="7" height="128" />
                  <rect x="776" y={HORIZON_Y - 6} width="52" height="8" />
                  <rect x="786" y={HORIZON_Y - 100} width="26" height="3" />
                  <rect x="786" y={HORIZON_Y - 68} width="26" height="3" />
                  <rect x="786" y={HORIZON_Y - 36} width="26" height="3" />
                  <rect x="810" y={HORIZON_Y - 104} width="13" height="98" rx="2" />
                  <path d={`M810 ${HORIZON_Y - 104} L816.5 ${HORIZON_Y - 126} L823 ${HORIZON_Y - 104} Z`} />
                  <rect x="805" y={HORIZON_Y - 40} width="5" height="34" rx="2" />
                  <rect x="823" y={HORIZON_Y - 40} width="5" height="34" rx="2" />
                </g>
                <circle className="prologue__beacon" cx="789.5" cy={HORIZON_Y - 132} r="3" />
                <circle className="prologue__beacon prologue__beacon--late" cx="789.5" cy={HORIZON_Y - 68} r="2.4" />
              </g>
            </g>
          </g>

          {/* The boy asleep, then standing. */}
          <g className="prologue__sleeper" aria-hidden="true">
            <SleepingKid />
            <g className="prologue__zzz">
              <text x="-50" y="-60">z</text>
              <text x="-38" y="-84">z</text>
              <text x="-24" y="-110">Z</text>
            </g>
          </g>
          <g className="prologue__hero" aria-hidden="true">
            <Kid />
            <text className="prologue__bubble prologue__bubble--alert" x="0" y="-222" textAnchor="middle">
              !
            </text>
          </g>

          <path className="prologue__grass" d={grass} fill="#03060b" aria-hidden="true" />
        </svg>

        {/* ---------- Scene 2: the launch pad, up close ---------- */}
        <svg className="prologue__scene prologue__pad" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="prologue-pad-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#03050d" />
              <stop offset="0.6" stopColor="#0c1530" />
              <stop offset="0.8" stopColor="#1c2644" />
            </linearGradient>
            <linearGradient id="prologue-rocket-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8a94a8" />
              <stop offset="0.35" stopColor="#e8ecf3" />
              <stop offset="1" stopColor="#7c879c" />
            </linearGradient>
            <linearGradient id="prologue-beam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff2cc" stopOpacity="0.28" />
              <stop offset="1" stopColor="#fff2cc" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="prologue-beam-r" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stopColor="#fff2cc" stopOpacity="0.28" />
              <stop offset="1" stopColor="#fff2cc" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="prologue-flame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.3" stopColor="#ffe08a" />
              <stop offset="0.75" stopColor="#ff8a3d" />
              <stop offset="1" stopColor="#ff4d1f" stopOpacity="0" />
            </linearGradient>
            <clipPath id="prologue-porthole">
              <circle cx="1000" cy="472" r="15" />
            </clipPath>
          </defs>

          <rect width="1600" height="900" fill="url(#prologue-pad-sky)" />
          <Stars stars={stars} />
          <g opacity="0.7">
            <Planets />
            <circle cx={MARS.x} cy={MARS.y} r="5" fill="#ff6a3d" />
          </g>

          {/* Floodlights */}
          <polygon points="330,380 960,170 960,720" fill="url(#prologue-beam)" />
          <polygon points="1460,380 1040,170 1040,720" fill="url(#prologue-beam-r)" />
          <rect x="326" y="380" width="8" height="340" fill="#05080f" />
          <rect x="314" y="370" width="32" height="16" rx="3" fill="#fff6d8" />
          <rect x="1456" y="380" width="8" height="340" fill="#05080f" />
          <rect x="1444" y="370" width="32" height="16" rx="3" fill="#fff6d8" />

          {/* Ground and the concrete pad */}
          <rect y="720" width="1600" height="180" fill="#0b111e" />
          <ellipse cx="1000" cy="735" rx="330" ry="34" fill="#161e30" />

          {/* Gantry tower */}
          <g className="prologue__gantry" fill="#0a0f1b" stroke="#1f2a42" strokeWidth="1.5">
            <rect x="1120" y="140" width="8" height="580" />
            <rect x="1172" y="140" width="8" height="580" />
            {Array.from({ length: 14 }, (_, i) => (
              <path
                key={i}
                d={`M1128 ${150 + i * 40} L1172 ${190 + i * 40} M1172 ${150 + i * 40} L1128 ${190 + i * 40}`}
                fill="none"
              />
            ))}
            <rect x="1058" y="300" width="64" height="10" />
            <rect x="1058" y="430" width="64" height="10" />
          </g>
          <circle className="prologue__beacon" cx="1150" cy="132" r="5" />

          {/* Smoke at the base */}
          <g className="prologue__smoke">
            {[840, 900, 960, 1040, 1100, 1160, 880, 1120].map((x, i) => (
              <circle key={i} cx={x} cy={i < 6 ? 712 : 690} r={i < 6 ? 46 : 36} />
            ))}
          </g>

          {/* The rocket. Everything inside this group lifts off together. */}
          <g className="prologue__rocket">
            <path className="prologue__flame" d="M962 688 Q1000 700 1038 688 Q1030 780 1000 860 Q970 780 962 688 Z" fill="url(#prologue-flame)" />
            <path d="M962 640 L1038 640 L1046 692 L954 692 Z" fill="#3a4256" />
            <path d="M940 540 L888 662 L940 640 Z" fill="#b8432a" />
            <path d="M1060 540 L1112 662 L1060 640 Z" fill="#b8432a" />
            <rect x="940" y="200" width="120" height="444" fill="url(#prologue-rocket-body)" />
            <path d="M940 200 L1000 86 L1060 200 Z" fill="#e0663a" />
            <rect x="940" y="200" width="120" height="16" fill="#c4532d" />
            <rect x="940" y="404" width="120" height="10" fill="#e0663a" />
            <g className="prologue__rocket-name">
              {"ARES".split("").map((ch, i) => (
                <text key={ch} x="1000" y={262 + i * 34} textAnchor="middle">
                  {ch}
                </text>
              ))}
            </g>
            {/* Porthole: his face shows up here once he is trapped inside. */}
            <circle cx="1000" cy="472" r="20" fill="#9aa6b8" />
            <circle cx="1000" cy="472" r="15" fill="#13203a" />
            <g className="prologue__window-face" clipPath="url(#prologue-porthole)">
              <circle cx="1000" cy="476" r="11" fill="#c98b62" />
              <path d="M988 474 Q1000 454 1012 474 Q1006 466 1000 466 Q994 466 988 474 Z" fill="#2a1a12" />
              <circle cx="996" cy="475" r="1.7" fill="#14100c" />
              <circle cx="1004" cy="475" r="1.7" fill="#14100c" />
              <ellipse cx="1000" cy="482" rx="2" ry="2.6" fill="#5a2a1a" />
            </g>
            <path d="M988 462 a15 15 0 0 1 16 -4" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
            {/* Hatch: lit and open, then the door slides down over it. */}
            <rect className="prologue__hatch-light" x="972" y="528" width="56" height="72" rx="10" fill="#ffd88a" />
            <rect className="prologue__hatch-door" x="972" y="528" width="56" height="72" rx="10" fill="#c3cad8" stroke="#6d7891" strokeWidth="2" />
          </g>

          {/* Ramp up to the hatch */}
          <polygon className="prologue__ramp" points="974,600 1026,600 852,724 800,724" fill="#2a3349" stroke="#46526e" strokeWidth="2" />

          {/* Launch mount */}
          <rect x="900" y="692" width="200" height="34" fill="#141b2b" stroke="#2a3550" strokeWidth="2" />

          {/* The boy, wandering, then walking up the ramp. */}
          <g className="prologue__pad-hero">
            <Kid />
            <text className="prologue__bubble prologue__bubble--lost" x="0" y="-226" textAnchor="middle">
              ?
            </text>
          </g>

          <path d={grass} fill="#03060b" transform="translate(0 40)" />
        </svg>

        <div className="prologue__fog" aria-hidden="true">
          <span />
          <span />
        </div>

        {/* The sign plants "packed for 4" before the doctor says it in Step 1. */}
        <div className="prologue__sign" aria-hidden="true">
          <div className="prologue__sign-board">
            <small>LAUNCH SITE</small>
            <strong>MISSION ARES</strong>
            <span>CREW OF 4</span>
          </div>
          <div className="prologue__sign-post" />
        </div>

        {/* The words: one note at a time, drawn on top of everything. */}
        <svg
          className="prologue__scene prologue__notes"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {note && <SceneNoteView key={noteIndex} note={note} leaving={t >= note.to - 0.4} />}
        </svg>
        <p className="prologue__sr-only" aria-live="polite">
          {note ? `${note.title ? `Space fact, ${note.title}: ` : ""}${note.text}` : ""}
        </p>

        <div className="prologue__progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (t / END_AT) * 100)}%` }} />
        </div>

        {clock !== null && t < FLASH_AT && (
          <div className={`prologue__clock${clock <= 10 ? " is-final" : ""}`} role="timer" aria-label={`Launch in ${clock} seconds`}>
            <small>LAUNCH IN</small>
            <strong>{formatClock(clock)}</strong>
          </div>
        )}

        <div className="prologue__flash" aria-hidden="true" />

        <button type="button" className="prologue__skip" onClick={finish}>
          Skip ▸
        </button>
      </div>

    </div>
  );
}
