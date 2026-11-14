// Mission ARES — Step 1: the cruise (about 35 seconds, a watch scene).
//
// Right after the prologue's liftoff. Third-person, same 1600 × 900 stage.
//
// Timeline (seconds) — edit BEATS (what happens) here, and the words in ./notes.ts.
//    0  Space. The ship leaves Earth. Calendar: month 1.
//    6  Cut inside. Day 2. THUMP, THUMP from the storage locker.
//   11  The door opens: the boy! A stowaway.
//   16  The Doctor: "We packed for 4. Now we are 5."
//   21  The Commander: "Nobody is in trouble. We'll make it work."
//   24.5 Back outside. The calendar flips month 1 … 7 while Mars grows.
//   32  Arrival. Fade out. onDone() at 35.
//
// Usage:  <Cruise onDone={() => setScene("touchdown")} />
// Dev:    ?scene=cruise&at=20 starts at 20 seconds.

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Boy, CrewMember, StarField } from "../game/art";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import { NoteLayer } from "../game/notes";
import { seededRandom } from "../game/random";
import { useTimeline } from "../game/useTimeline";
import "../game/game.css";
import { CRUISE_NOTES } from "./notes";
import "./cruise.css";

type CruiseProps = {
  /** Called once, when the scene ends or the player presses Skip. */
  onDone: () => void;
  /** Synthesized hum, thumps and chimes. Default: on. */
  sound?: boolean;
};

const BEATS = [
  { id: "leave", at: 0 },
  { id: "locker", at: 6 },
  { id: "open", at: 11 },
  { id: "doctor", at: 16 },
  { id: "commander", at: 21 },
  { id: "trip", at: 24.5 },
  { id: "arrive", at: 32 },
] as const;

type BeatId = (typeof BEATS)[number]["id"];
const beatAt = (id: BeatId) => BEATS.find((b) => b.id === id)!.at;

const FLASH_AT = 33.8;
const END_AT = 35;

// ---------------------------------------------------------------------------
// The flight path: a curve from Earth to Mars. `p` goes 0 → 1.
// ---------------------------------------------------------------------------

const P0 = { x: 400, y: 520 };
const P1 = { x: 790, y: 250 };
const P2 = { x: 1180, y: 470 };
const FLIGHT_PATH = `M${P0.x} ${P0.y} Q${P1.x} ${P1.y} ${P2.x} ${P2.y}`;

function shipAt(p: number) {
  const u = 1 - p;
  const x = u * u * P0.x + 2 * u * p * P1.x + p * p * P2.x;
  const y = u * u * P0.y + 2 * u * p * P1.y + p * p * P2.y;
  const dx = 2 * u * (P1.x - P0.x) + 2 * p * (P2.x - P1.x);
  const dy = 2 * u * (P1.y - P0.y) + 2 * p * (P2.y - P1.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** Trip progress by time: a short hop away from Earth, then (after the cabin) the long flight. */
function tripProgress(t: number): number {
  const trip = beatAt("trip");
  const arrive = beatAt("arrive");
  if (t < beatAt("locker")) return (t / beatAt("locker")) * 0.06;
  if (t < trip) return 0.06;
  return Math.min(1, 0.06 + ((t - trip) / (arrive - trip)) * 0.94);
}

const monthFor = (p: number) => 1 + Math.floor(Math.min(p, 0.999) * 7);

const EARTH = { x: 250, y: 450, r: 170 };
const MARS = { x: 1400, y: 440, r: 168 };

// Little stars outside the porthole, so the window feels like space.
function portholeStars() {
  const rand = seededRandom(11);
  return Array.from({ length: 16 }, () => ({ x: 140 + rand() * 200, y: 200 + rand() * 200, r: 0.8 + rand() * 1.6 }));
}

export default function Cruise({ onDone, sound = true }: CruiseProps) {
  const audioRef = useRef<GameAudio | null>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    audioRef.current?.stop();
    onDone();
  }, [onDone]);

  const { t } = useTimeline({ endAt: END_AT, onEnd: finish });
  const sec = Math.floor(t);

  const current = Math.max(0, BEATS.findLastIndex((b) => t >= b.at));
  const p = tripProgress(t);
  const month = monthFor(p);
  const ship = shipAt(p);
  const earthScale = (EARTH.r - 130 * p) / EARTH.r;
  const marsScale = (8 + 160 * p * p) / MARS.r;

  const stars = useMemo(() => portholeStars(), []);

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
    if (sec === 7 || sec === 9) audio?.thump();
    if (sec === Math.floor(beatAt("open"))) audio?.creak();
    if (sec === Math.floor(beatAt("commander"))) audio?.chime();
    if (sec === Math.floor(beatAt("arrive"))) audio?.hum(false);
  }, [sec]);

  // A tick for every calendar page that flips.
  const lastMonth = useRef(1);
  useEffect(() => {
    if (month !== lastMonth.current) {
      lastMonth.current = month;
      if (t >= beatAt("trip")) audioRef.current?.blip(600 + month * 60);
    }
  }, [month, t]);

  const inCabin = t >= beatAt("locker") && t < beatAt("trip");
  const afterDoctor = t >= beatAt("doctor");
  const afterCommander = t >= beatAt("commander");
  const boyWalking = t >= beatAt("open") + 0.8 && t < beatAt("open") + 2.6;

  const classes = [
    "ares",
    "cruise",
    ...BEATS.slice(0, current + 1).map((b) => `at-${b.id}`),
    t >= FLASH_AT && "is-ending",
    t < 1.4 && "is-opening",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-beat={BEATS[current].id}>
      <div className="ares__stage">
        {/* ---------- Outside: Earth, the flight path, the ship, Mars ---------- */}
        <svg className="ares__scene cruise__space" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <radialGradient id="cruise-earth-shade" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="1" stopColor="#000a1e" stopOpacity="0.55" />
            </radialGradient>
            <radialGradient id="cruise-mars-shade" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#ffe0c0" stopOpacity="0.3" />
              <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="1" stopColor="#1a0500" stopOpacity="0.55" />
            </radialGradient>
            <linearGradient id="cruise-flame" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.35" stopColor="#ffe08a" />
              <stop offset="0.75" stopColor="#ff8a3d" />
              <stop offset="1" stopColor="#ff4d1f" stopOpacity="0" />
            </linearGradient>
            <clipPath id="cruise-earth-clip">
              <circle r="170" />
            </clipPath>
            <clipPath id="cruise-mars-clip">
              <circle r="168" />
            </clipPath>
          </defs>

          <rect width="1600" height="900" fill="#03050d" />
          <StarField count={130} seed={2026} />

          {/* Earth */}
          <g className="cruise__abs" style={{ transform: `translate(${EARTH.x}px, ${EARTH.y}px) scale(${earthScale})` }}>
            <circle r="182" fill="#6fa8ff" opacity="0.18" />
            <circle r="170" fill="#2a6fb0" />
            <g clipPath="url(#cruise-earth-clip)">
              <path d="M-90 -70 Q-60 -110 -20 -90 Q10 -70 -10 -40 Q-30 -10 -70 -20 Q-110 -30 -90 -70 Z" fill="#4a9a5a" />
              <path d="M30 -90 Q70 -80 80 -40 Q95 0 60 40 Q40 80 10 60 Q-5 20 15 -10 Q0 -50 30 -90 Z" fill="#4a9a5a" />
              <path d="M-50 20 Q-20 10 -10 50 Q-20 100 -45 110 Q-70 80 -50 20 Z" fill="#3f8a50" />
              <ellipse cx="-40" cy="-40" rx="60" ry="9" fill="#ffffff" opacity="0.55" />
              <ellipse cx="50" cy="20" rx="46" ry="8" fill="#ffffff" opacity="0.5" />
              <ellipse cx="-20" cy="90" rx="52" ry="8" fill="#ffffff" opacity="0.45" />
            </g>
            <circle r="170" fill="url(#cruise-earth-shade)" />
          </g>

          {/* Mars */}
          <g className="cruise__abs" style={{ transform: `translate(${MARS.x}px, ${MARS.y}px) scale(${marsScale})` }}>
            <circle r="176" fill="#ff9d4d" opacity="0.16" />
            <circle r="168" fill="#c1583a" />
            <g clipPath="url(#cruise-mars-clip)">
              <path d="M-80 -20 Q-30 -60 20 -30 Q60 -10 40 30 Q-10 60 -70 30 Z" fill="#9a3f27" opacity="0.75" />
              <path d="M30 70 Q80 50 110 90 Q90 130 40 120 Z" fill="#9a3f27" opacity="0.75" />
              <path d="M-120 70 Q-90 50 -60 80 Q-80 110 -120 100 Z" fill="#a84a2e" opacity="0.8" />
              <ellipse cx="0" cy="-158" rx="70" ry="18" fill="#f2e6dc" />
              <circle cx="-30" cy="60" r="12" fill="#8a3820" opacity="0.7" />
              <circle cx="60" cy="-60" r="9" fill="#8a3820" opacity="0.7" />
            </g>
            <circle r="168" fill="url(#cruise-mars-shade)" />
          </g>

          {/* The flight path and the ship */}
          <path className="cruise__path" d={FLIGHT_PATH} />
          <g className="cruise__abs cruise__ship" style={{ transform: `translate(${ship.x}px, ${ship.y}px) rotate(${ship.angle}deg)` }}>
            <path className="cruise__flame" d="M-62 -9 L-130 0 L-62 9 Z" fill="url(#cruise-flame)" />
            <path d="M-62 -14 L30 -14 L30 14 L-62 14 Z" fill="#e8ecf3" />
            <path d="M30 -14 Q74 0 30 14 Z" fill="#e0663a" />
            <path d="M-62 -14 L-78 -34 L-40 -14 Z" fill="#b8432a" />
            <path d="M-62 14 L-78 34 L-40 14 Z" fill="#b8432a" />
            <rect x="-20" y="-16" width="6" height="32" fill="#c4532d" />
            <circle cx="6" cy="0" r="7" fill="#13203a" stroke="#9aa6b8" strokeWidth="3" />
          </g>
        </svg>

        {/* ---------- Inside: the cabin, day 2 ---------- */}
        <svg className="ares__scene cruise__cabin" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <clipPath id="cruise-porthole">
              <circle cx="240" cy="300" r="96" />
            </clipPath>
          </defs>

          <rect width="1600" height="900" fill="#0e1628" />
          <rect y="130" width="1600" height="10" fill="#17223a" />
          <rect y="600" width="1600" height="8" fill="#17223a" />
          {[400, 560, 720, 880, 1040].map((x) => (
            <rect key={x} x={x} y="140" width="4" height="620" fill="#111b30" />
          ))}
          <rect y="760" width="1600" height="140" fill="#1a2338" />
          <rect y="760" width="1600" height="6" fill="#2a3550" />

          {/* Porthole with stars drifting past */}
          <circle cx="240" cy="300" r="110" fill="#2a3550" />
          <circle cx="240" cy="300" r="96" fill="#03050d" />
          <g clipPath="url(#cruise-porthole)">
            <g className="cruise__drift">
              {stars.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" />
              ))}
              <circle cx="200" cy="330" r="16" fill="#2a6fb0" />
            </g>
          </g>
          <circle cx="240" cy="300" r="96" fill="none" stroke="#46526e" strokeWidth="6" />

          {/* Control panel with blinking lights */}
          <rect x="640" y="200" width="420" height="100" rx="12" fill="#17223a" stroke="#2a3550" strokeWidth="3" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <circle
              key={i}
              className="cruise__led"
              cx={680 + i * 52}
              cy={250}
              r="9"
              fill={i % 3 === 0 ? "#ffcf99" : i % 3 === 1 ? "#7ee0b0" : "#5bb8ff"}
              style={{ animationDelay: `${i * 0.35}s` }}
            />
          ))}

          {/* The storage locker (the boy is inside, behind the door) */}
          <g className="cruise__locker">
            <rect x="1190" y="420" width="200" height="340" rx="10" fill="#2a3550" stroke="#46526e" strokeWidth="4" />
            <rect x="1206" y="436" width="168" height="324" fill="#080c18" />
            <g className="cruise__boy">
              <g className={boyWalking ? "is-walk" : undefined}>
                <Boy mood={t >= beatAt("commander") + 1 ? "smile" : "worried"} look={-1} />
              </g>
            </g>
            <g className="cruise__door">
              <rect x="1206" y="436" width="168" height="324" fill="#3a4766" stroke="#5a6a90" strokeWidth="3" />
              {[0, 1, 2, 3].map((i) => (
                <rect key={i} x="1236" y={468 + i * 14} width="108" height="5" rx="2" fill="#2a3550" />
              ))}
              <rect x="1346" y="580" width="12" height="52" rx="5" fill="#9aa6b8" />
            </g>
          </g>

          {/* The crew, looking toward the locker */}
          <g transform="translate(500 760) scale(1.3)">
            <CrewMember id="commander" look={1} mood={afterCommander ? "smile" : afterDoctor ? "calm" : "wow"} />
          </g>
          <g transform="translate(660 760) scale(1.3)">
            <CrewMember id="doctor" look={1} mood={afterDoctor ? "calm" : "wow"} />
            {afterDoctor && (
              <g className="cruise__clipboard">
                <rect x="44" y="-128" width="34" height="46" rx="4" fill="#f1ead3" stroke="#9a8a5c" strokeWidth="2" />
                <rect x="55" y="-132" width="12" height="7" rx="2" fill="#46526e" />
                <path d="M50 -112h22M50 -104h22M50 -96h14" stroke="#7a6a3c" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
          </g>
          <g transform="translate(820 760) scale(1.3)">
            <CrewMember id="engineer" look={1} mood={afterCommander ? "smile" : "wow"} />
          </g>
          <g transform="translate(980 760) scale(1.3)">
            <CrewMember id="pilot" look={1} mood={afterCommander ? "smile" : "wow"} />
          </g>

          {/* "!" over their heads when the door opens */}
          <g className="cruise__bangs">
            {[500, 660, 820, 980].map((x, i) => (
              <text key={x} className="cruise__bang" x={x} y="440" textAnchor="middle" style={{ animationDelay: `${i * 0.08}s` }}>
                !
              </text>
            ))}
          </g>
        </svg>

        {/* The words */}
        <NoteLayer notes={CRUISE_NOTES} t={t} />

        {/* Calendar (outside) / day chip (inside) */}
        {!inCabin && t < FLASH_AT && (
          <div className="cruise__calendar" role="timer" aria-label={`Month ${month} of the trip to Mars`}>
            <small>MONTH</small>
            <strong key={month}>{month}</strong>
          </div>
        )}
        {inCabin && (
          <div className="cruise__calendar cruise__calendar--day">
            <small>DAY</small>
            <strong>2</strong>
          </div>
        )}

        <div className="ares__progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (t / END_AT) * 100)}%` }} />
        </div>
        <div className="ares__flash" aria-hidden="true" />

        <button type="button" className="ares__skip" onClick={finish}>
          Skip ▸
        </button>
      </div>
    </div>
  );
}
