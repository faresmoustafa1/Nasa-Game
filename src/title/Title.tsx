// Mission ARES — the main menu.
//
// A night field next to a launch site: Mars glowing in the sky, a rocket under floodlights, and the boy
// lying in the grass with his telescope (that is where the story starts). The menu sits in the middle:
//   Start mission · How to play · Settings · NASA data · Credits
// Settings (sound, reading speed, Judge Mode) live in ../game/settings.ts and judge.ts.
// The scene-jump panel is for demos and testing: it only shows with Judge Mode on or ?dev=1 in the address.

import { useMemo, useState } from "react";
import { StarField } from "../game/art";
import { JUDGE_DELAY_MIN, isJudge, setJudge } from "../game/judge";
import { seededRandom } from "../game/random";
import { getSettings, saveSettings } from "../game/settings";
import type { Settings, Speed } from "../game/settings";
import "./title.css";

export type JumpKey =
  | "prologue"
  | "cruise"
  | "touchdown"
  | "hub"
  | "greenhouse"
  | "rover"
  | "night"
  | "storm"
  | "greenhouse2"
  | "rover2"
  | "crowning"
  | "result"
  | "sources";

const JUMPS: { key: JumpKey; label: string }[] = [
  { key: "prologue", label: "1 · Prologue" },
  { key: "cruise", label: "2 · Cruise" },
  { key: "touchdown", label: "3 · Landing" },
  { key: "hub", label: "4 · Base hub" },
  { key: "greenhouse", label: "5 · Greenhouse (first)" },
  { key: "rover", label: "5 · Garage + rover (first)" },
  { key: "night", label: "6 · Night + oxygen puzzle" },
  { key: "storm", label: "7 · Solar storm" },
  { key: "greenhouse2", label: "8 · Greenhouse (second)" },
  { key: "rover2", label: "8 · Garage + rover (second)" },
  { key: "crowning", label: "9 · Crowning" },
  { key: "result", label: "10 · Result" },
  { key: "sources", label: "Data sources" },
];

type View = "main" | "how" | "settings" | "credits" | "jump";

/** The team, for the Credits screen. */
const TEAM = ["Fares Mostafa", "Merna Hossam", "Eman Ahmed", "Amr Obaia", "Ahmed Zahran"];

const HOW: { icon: string; title: string; text: string }[] = [
  {
    icon: "🔋",
    title: "Keep the base alive",
    text: "Power, Water and Air are your life bars. Everything you do costs some of them, and nothing is free.",
  },
  {
    icon: "🤔",
    title: "Pick, then live with it",
    text: "You have two jobs but time for one first: the greenhouse or the rover. The other waits, and waiting has a price too.",
  },
  {
    icon: "🏅",
    title: "Earn your crown",
    text: "Rocks, food, a happy crew and leftover supplies make your score. Replay it: the weather, crops and rocks change every time!",
  },
];

/** The menu's night field: Mars in the sky, the rocket under floodlights, the boy with his telescope. */
function MenuArt() {
  const grass = useMemo(() => {
    const rand = seededRandom(9);
    let d = "M0 900 L0 840";
    for (let x = 0; x < 1600; x += 14) {
      const h = 24 + rand() * 60;
      d += ` L${x + 3} 838 L${x + 7 + (rand() - 0.5) * 14} ${838 - h} L${x + 11} 838`;
    }
    return d + " L1600 840 L1600 900 Z";
  }, []);
  return (
    <svg className="title__art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="menu-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#02040c" />
          <stop offset="0.5" stopColor="#0b1430" />
          <stop offset="0.78" stopColor="#2a1a3a" />
          <stop offset="1" stopColor="#5a2a1a" />
        </linearGradient>
        <radialGradient id="menu-mars" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffb384" />
          <stop offset="0.6" stopColor="#c1583a" />
          <stop offset="1" stopColor="#6a2412" />
        </radialGradient>
        <radialGradient id="menu-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff7a4a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ff7a4a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="menu-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#menu-sky)" />
      <StarField count={150} seed={5} maxY={620} />

      {/* Mars, big and glowing */}
      <circle cx="1180" cy="230" r="190" fill="url(#menu-halo)" />
      <circle cx="1180" cy="230" r="66" fill="url(#menu-mars)" />
      <path d="M1135 215 Q1160 195 1190 210 Q1210 225 1190 245 Q1160 255 1135 240 Z" fill="#8a3420" opacity="0.6" />
      <ellipse cx="1180" cy="170" rx="30" ry="7" fill="#f2e6dc" opacity="0.85" />
      <circle cx="1180" cy="230" r="66" fill="none" stroke="#ffd9bd" strokeOpacity="0.25" strokeWidth="2" />

      {/* A far hill, the launch site and the floodlit rocket */}
      <path d="M0 700 C260 650 520 720 800 690 S1300 650 1600 700 L1600 900 L0 900 Z" fill="#0a101d" />
      <ellipse cx="1330" cy="700" rx="230" ry="60" fill="url(#menu-glow)" />
      <g fill="#05080f">
        <rect x="1296" y="520" width="9" height="182" />
        <rect x="1296" y="552" width="40" height="3" />
        <rect x="1296" y="598" width="40" height="3" />
        <rect x="1296" y="644" width="40" height="3" />
        <rect x="1332" y="544" width="22" height="158" rx="3" />
        <path d="M1332 544 L1343 506 L1354 544 Z" />
      </g>
      <circle className="title__beacon" cx="1300" cy="514" r="4" />

      {/* The boy on his back in the grass, his telescope pointing at Mars */}
      <g transform="translate(0 -26)">
      <g transform="translate(330 846) scale(1.7)">
        <ellipse cx="0" cy="2" rx="120" ry="8" fill="#02050a" />
        <rect x="-104" y="-26" width="44" height="26" rx="9" fill="#e0a63a" />
        <rect x="14" y="-22" width="74" height="14" rx="6" fill="#222c47" />
        <rect x="14" y="-35" width="76" height="15" rx="6" fill="#26324f" />
        <rect x="-48" y="-42" width="66" height="34" rx="13" fill="#2f8496" />
        <circle cx="-66" cy="-27" r="17" fill="#c98b62" />
        <path d="M-82 -38 Q-66 -50 -50 -38 Q-66 -42 -82 -34 Z" fill="#2a1a12" />
        <path d="M-72 -28 q3 2 6 0" fill="none" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g stroke="#0a0f1b" strokeLinecap="round">
        <path d="M560 846 L600 740 M650 846 L612 740 M605 846 L606 740" strokeWidth="9" />
        <path d="M584 760 L760 636" strokeWidth="32" stroke="#26324f" />
        <path d="M584 760 L760 636" strokeWidth="14" stroke="#5a6a90" />
      </g>
      <circle cx="772" cy="628" r="12" fill="#9fc4ff" opacity="0.55" />
      </g>

      <path d={grass} fill="#03060b" />
    </svg>
  );
}

function Seg<T extends string | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; text: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="title__row" role="radiogroup" aria-label={label}>
      <span className="title__rowlabel">{label}</span>
      <span className="title__seg">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? "is-on" : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.text}
          </button>
        ))}
      </span>
    </div>
  );
}

export default function Title({
  onPlay,
  onSkipIntro,
  onJump,
  onSources,
}: {
  onPlay: () => void;
  /** Start a new game at the landing (skips the prologue and the trip): for replays and classrooms. */
  onSkipIntro: () => void;
  onJump: (key: JumpKey) => void;
  onSources: () => void;
}) {
  const [view, setView] = useState<View>("main");
  const [settings, setSettings] = useState<Settings>(getSettings);
  const [judge, setJ] = useState(isJudge);
  const dev = judge || new URLSearchParams(window.location.search).get("dev") === "1";

  const change = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <main className="title">
      <MenuArt />

      <div className="title__box">
        {view === "main" && (
          <>
            <div className="title__head">
              <p className="title__small">A Mars outpost game</p>
              <h1>Mission ARES</h1>
            </div>
            <nav className="title__menu" aria-label="Main menu">
              <button type="button" className="title__play" onClick={onPlay}>
                ▶ Start mission
              </button>
              <button type="button" className="title__dev" onClick={onSkipIntro}>
                Skip the story: start at the landing ▸
              </button>
              <button type="button" onClick={() => setView("how")}>
                How to play
              </button>
              <button type="button" onClick={() => setView("settings")}>
                Settings
              </button>
              <button type="button" onClick={onSources}>
                NASA data
              </button>
              <button type="button" onClick={() => setView("credits")}>
                Credits
              </button>
              {dev && (
                <button type="button" className="title__dev" onClick={() => setView("jump")}>
                  Jump to a scene
                </button>
              )}
            </nav>
          </>
        )}

        {view === "how" && (
          <section className="title__card" aria-label="How to play">
            <h2>How to play</h2>
            <div className="title__how">
              {HOW.map((h) => (
                <div key={h.title}>
                  <span aria-hidden="true">{h.icon}</span>
                  <strong>{h.title}</strong>
                  <p>{h.text}</p>
                </div>
              ))}
            </div>
            <button type="button" className="title__back" onClick={() => setView("main")}>
              ◂ Back
            </button>
          </section>
        )}

        {view === "settings" && (
          <section className="title__card" aria-label="Settings">
            <h2>Settings</h2>
            <Seg
              label="Sound"
              value={settings.sound}
              options={[
                { value: true, text: "On" },
                { value: false, text: "Off" },
              ]}
              onChange={(sound) => change({ sound })}
            />
            <Seg<Speed>
              label="Story speed"
              value={settings.speed}
              options={[
                { value: "slow", text: "Slower" },
                { value: "normal", text: "Normal" },
                { value: "fast", text: "Faster" },
              ]}
              onChange={(speed) => change({ speed })}
            />
            <Seg
              label="Judge mode"
              value={judge}
              options={[
                { value: false, text: "Off" },
                { value: true, text: "On" },
              ]}
              onChange={(on) => {
                setJudge(on);
                setJ(on);
              }}
            />
            <p className="title__hint">
              Judge mode makes every game the same (for demos): cold weather (−55 °C), Hatch chile
              peppers, the science team asking for LAKE MUD rock, the saved medium storm and a {JUDGE_DELAY_MIN}-minute message to Earth.
            </p>
            <button type="button" className="title__back" onClick={() => setView("main")}>
              ◂ Back
            </button>
          </section>
        )}

        {view === "credits" && (
          <section className="title__card" aria-label="Credits">
            <h2>Credits</h2>
            <p>Mission ARES was made for the NASA Space Apps Challenge 2026 (Cairo), challenge: run a lunar or Martian outpost.</p>
            <p className="title__team-head">Made by</p>
            <ul className="title__team">
              {TEAM.map((name) => (
                <li key={name}>
                  <b>{name}</b>
                </li>
              ))}
            </ul>
            <p>
              All drawings and sounds are made in code. One real NASA photo is used (Jezero Crater from orbit, NASA/JPL-Caltech/MSSS/JHU-APL).
              Real data: NASA DONKI (solar storms) with the WSA-Enlil model, NASA RadLab (Mars radiation), NASA OSDR (space lettuce study),
              Perseverance MEDA (weather), NASA/JPL planet positions (message delay), and the Canadian Space Agency food toolkit. Game numbers are made up
              to make a fair puzzle. See “NASA data” for every source.
            </p>
            <p>
              <b>AI use:</b> we used Claude, an AI assistant by Anthropic, to help write and review code and text. Every NASA fact and number is listed
              with its source under “NASA data”, so anyone can check it.
            </p>
            <button type="button" className="title__back" onClick={() => setView("main")}>
              ◂ Back
            </button>
          </section>
        )}

        {view === "jump" && dev && (
          <section className="title__card" aria-label="Jump to a scene">
            <h2>Jump to a scene</h2>
            <div className="title__jumps">
              {JUMPS.map((j) => (
                <button key={j.key} type="button" onClick={() => onJump(j.key)}>
                  {j.label}
                </button>
              ))}
            </div>
            <button type="button" className="title__back" onClick={() => setView("main")}>
              ◂ Back
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
