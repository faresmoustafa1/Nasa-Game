// Mission ARES — the garage close-up: the boy in his astronaut suit, the rover, a thermometer with the real reading,
// the pilot waiting in the rover cab, and the heater switch. Everything reacts live to the heater the player is choosing:
//   too weak  frost at the edges, snow, frost on the visor, the boy shivers and his breath fogs, the battery is low and blue
//   right     a soft warm glow, a happy boy, a full green battery
//   too strong a hot red glow, heat waves, sweat drops (and the extra Power is wasted)

import type { CSSProperties } from "react";
import { Astronaut } from "../game/art";
import type { Level } from "../game/state";
import { COLD_CREW, COLD_NAME, GEAR, coldExtra } from "./weather";
import type { Reading } from "./weather";

type Props = {
  on: boolean;
  reading: Reading;
  cold: Level;
  choice: Level | null;
  /** True once the player has suited up: the switch stops working. */
  locked: boolean;
  onChoose: (level: Level) => void;
};

type Feel = "none" | "cold" | "ok" | "hot";

const LEVELS: Level[] = [1, 2, 3];
const FLOOR = 790;
const BOY_X = 560;
const BOY_SCALE = 2.2;

function feelOf(cold: Level, choice: Level | null): Feel {
  if (choice === null) return "none";
  if (choice < cold) return "cold";
  return choice === cold ? "ok" : "hot";
}

/** The thermometer: −100 °C at the bottom, 0 °C at the top. */
function Thermometer({ temp }: { temp: number }) {
  const top = 250;
  const bottom = 690;
  const y = bottom - ((temp + 100) / 100) * (bottom - top);
  return (
    <g>
      <rect x="1440" y="220" width="70" height="510" rx="35" fill="#151a28" stroke="#8a96b4" strokeWidth="4" />
      {[0, -25, -50, -75, -100].map((d) => {
        const ty = bottom - ((d + 100) / 100) * (bottom - top);
        return (
          <g key={d}>
            <path d={`M1440 ${ty} h-14`} stroke="#8a96b4" strokeWidth="3" />
            <text className="garage__tick" x="1420" y={ty + 7} textAnchor="end">
              {d}
            </text>
          </g>
        );
      })}
      <rect x="1463" y={y} width="24" height={bottom - y + 20} rx="12" fill="#4aa8f0" />
      <circle cx="1475" cy="715" r="30" fill="#4aa8f0" stroke="#8a96b4" strokeWidth="4" />
      <text className="garage__temp" x="1475" y="790" textAnchor="middle">
        {temp} °C
      </text>
      <text className="garage__tick" x="1475" y="200" textAnchor="middle">
        OUTSIDE
      </text>
    </g>
  );
}

/** The battery gauge above the rover: 4 bars. */
function Battery({ feel, short }: { feel: Feel; short: number }) {
  const bars = feel === "cold" ? 2 - short + 1 : 4;
  const color = feel === "cold" ? "#6ab8ff" : feel === "none" ? "#8a96b4" : "#7ee0b0";
  return (
    <g transform="translate(990 214)">
      <rect x="0" y="0" width="150" height="66" rx="12" fill="#151a28" stroke="#cfd8ea" strokeWidth="4" />
      <rect x="150" y="20" width="14" height="26" rx="4" fill="#cfd8ea" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={12 + i * 34} y="12" width="26" height="42" rx="5" fill={i < bars ? color : "#2a3148"} style={{ transition: "fill 0.4s" }} />
      ))}
      {feel === "cold" && (
        <text className="garage__snowflake" x="75" y="-14" textAnchor="middle">
          ❄
        </text>
      )}
      <text className="garage__tick" x="75" y="100" textAnchor="middle">
        ROVER BATTERY
      </text>
    </g>
  );
}

function BigRover({ feel, waving }: { feel: Feel; waving: boolean }) {
  return (
    <g transform="translate(830 0)">
      <rect x="0" y="600" width="460" height="104" rx="26" fill="#e8ecf3" stroke="#b8c0d2" strokeWidth="4" />
      <rect x="200" y="548" width="150" height="32" rx="6" fill="#2b4a7a" />
      <path d="M210 580 L340 580" stroke="#6d7891" strokeWidth="6" />

      {/* The pilot waits in the cab and feels the weather too */}
      <g className={feel === "cold" ? "garage__shiver" : ""}>
        <rect x="52" y="568" width="112" height="40" rx="14" fill="#4a8be0" />
        <circle cx="108" cy="524" r="40" fill="#a9703f" />
        <path d="M68 514 Q108 462 148 514 Q128 490 108 490 Q88 490 68 514 Z" fill="#14100c" />
        <circle cx="94" cy="528" r="5" fill="#14100c" />
        <circle cx="122" cy="528" r="5" fill="#14100c" />
        {feel === "cold" ? (
          <path d="M92 552 Q108 540 124 552" stroke="#14100c" strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : feel === "hot" ? (
          <ellipse cx="108" cy="550" rx="8" ry="6" fill="#14100c" />
        ) : (
          <path d="M92 546 Q108 562 124 546" stroke="#14100c" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        {feel === "hot" && (
          <path className="garage__sweat" d="M146 504 c-5 8 -5 13 0 13 c5 0 5 -5 0 -13z" fill="#7fc8ff" />
        )}
        {feel === "cold" && <circle className="garage__breath" cx="112" cy="556" r="7" />}
      </g>
      <path d="M44 612 V524 Q44 446 108 446 Q172 446 172 524 V612" fill="rgba(150,195,235,0.2)" stroke="#d6deee" strokeWidth="6" />
      <path d="M62 500 Q72 468 100 460" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="5" strokeLinecap="round" />
      {waving && (
        <g className="garage__wave">
          <path d="M150 596 L194 506" stroke="#4a8be0" strokeWidth="16" strokeLinecap="round" />
          <circle cx="195" cy="498" r="12" fill="#a9703f" />
        </g>
      )}
      {feel === "cold" && <path d="M44 612 V524 Q44 446 108 446 Q172 446 172 524 V612" fill="#e6f4ff" opacity="0.32" />}
      <path d="M410 600 L410 500" stroke="#b8c0d2" strokeWidth="14" strokeLinecap="round" />
      <rect x="376" y="460" width="72" height="44" rx="8" fill="#46526e" />
      <circle cx="430" cy="482" r="11" fill="#7ee0b0" />
      {[70, 230, 390].map((x) => (
        <g key={x}>
          <circle cx={x} cy={FLOOR - 52} r="52" fill="#1a1f2e" stroke="#6d7891" strokeWidth="8" />
          <circle cx={x} cy={FLOOR - 52} r="16" fill="#6d7891" />
        </g>
      ))}
      {feel === "cold" && (
        <g fill="#e6f4ff">
          {[30, 90, 150, 210, 270, 330, 400].map((x, i) => (
            <path key={x} d={`M${x} 702 l8 0 l-4 ${16 + (i % 3) * 8} z`} />
          ))}
        </g>
      )}
    </g>
  );
}

export default function GarageCloseup({ on, reading, cold, choice, locked, onChoose }: Props) {
  const feel = feelOf(cold, choice);
  const short = choice === null ? 0 : coldExtra(cold, choice);
  const heat = choice ?? 0;
  const mood = feel === "cold" ? "worried" : feel === "hot" ? "wow" : "smile";

  const label =
    feel === "none"
      ? `Pilot: “Ready when you are! It is ${COLD_NAME[cold]} outside. Pick a heater.”`
      : feel === "cold"
        ? `Pilot: “Brrr! It is ${reading.temp} °C. We'll be shivering (crew −${COLD_CREW}), and the cold battery makes each sample cost +${short} Power.”`
        : feel === "ok"
          ? "Pilot: “Warm and cozy. Just right!”"
          : "Pilot: “Too hot in here! The extra heat wastes Power.”";

  return (
    <div className={`gh__closeup${on ? " is-on" : ""}`}>
      <div className="gh__frame">
        <svg className="gh__art" viewBox="0 0 1600 900" role="group" aria-label={`Close-up of the garage. The boy in his astronaut suit next to the rover, with the pilot waiting in the cab. ${label}`}>
          <defs>
            <radialGradient id="ga-frost" cx="0.5" cy="0.5" r="0.75">
              <stop offset="0.55" stopColor="#bfe3ff" stopOpacity="0" />
              <stop offset="1" stopColor="#bfe3ff" stopOpacity="0.95" />
            </radialGradient>
            <radialGradient id="ga-warm" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffb05c" stopOpacity="0.7" />
              <stop offset="1" stopColor="#ffb05c" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ga-hot" cx="0.5" cy="0.5" r="0.75">
              <stop offset="0.5" stopColor="#ff4a2a" stopOpacity="0" />
              <stop offset="1" stopColor="#ff4a2a" stopOpacity="0.75" />
            </radialGradient>
          </defs>

          {/* The garage: wall, panels, the open door on the right, floor */}
          <rect width="1600" height="900" fill="#2a2f3d" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={40 + i * 230} y="120" width="210" height="300" rx="10" fill="#323848" stroke="#3d4458" strokeWidth="3" />
          ))}
          <rect y={FLOOR} width="1600" height={900 - FLOOR} fill="#3b4560" />
          <path d={`M0 ${FLOOR + 30} H1600`} stroke="#4a5574" strokeWidth="3" />
          {/* Suit hooks on the wall, one suit gone (he is wearing it) */}
          <g>
            <path d="M315 300 V350" stroke="#8a96b4" strokeWidth="6" strokeLinecap="round" />
            <rect x="270" y="350" width="90" height="190" rx="22" fill="#e4e8f1" opacity="0.85" />
            <rect x="270" y="410" width="90" height="12" fill="#e0663a" />
          </g>

          {/* Warm glow behind the boy, stronger with more heat */}
          <ellipse cx={BOY_X} cy={FLOOR - 230} rx={160 + heat * 40} ry={260 + heat * 30} fill="url(#ga-warm)" style={{ opacity: feel === "none" ? 0 : feel === "cold" ? 0.25 : feel === "ok" ? 0.7 : 1, transition: "opacity 0.5s" }} />

          <BigRover feel={feel} waving={locked} />
          <Battery feel={feel} short={short} />
          <text className="garage__name" x="1060" y="408" textAnchor="middle">
            THE ROVER
          </text>
          <text className="garage__tick" x="1060" y="438" textAnchor="middle" style={{ fontSize: 20 }}>
            a robot car that drives on Mars
          </text>
          <Thermometer temp={reading.temp} />

          {/* The boy in his astronaut suit */}
          <g transform={`translate(${BOY_X} ${FLOOR}) scale(${BOY_SCALE})`}>
            <g className={feel === "cold" ? "garage__shiver" : ""}>
              <Astronaut accent="#2f8496" skin="#c98b62" hair="#2a1a12" helmet mood={mood} look={0} />
              {/* The suit heater on his chest: one light per heat level */}
              <rect x="-20" y="-147" width="40" height="18" rx="5" fill="#2b334f" />
              {LEVELS.map((n) => (
                <circle key={n} cx={-12 + (n - 1) * 12} cy="-138" r="4.5" fill={n <= heat ? "#ff8a2c" : "#46526e"} style={{ transition: "fill 0.3s" }} />
              ))}
              {/* Too cold: frost on the visor and foggy breath */}
              {feel === "cold" && (
                <g>
                  <path d="M-26 -162 A32 32 0 0 1 -30 -196 M26 -162 A32 32 0 0 0 30 -196" stroke="#e6f4ff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9" />
                  <circle cx="-22" cy="-168" r="4" fill="#e6f4ff" />
                  <circle cx="21" cy="-190" r="3" fill="#e6f4ff" />
                  <circle cx="-12" cy="-205" r="3" fill="#e6f4ff" />
                  {short > 1 && <circle cx="0" cy="-179" r="30" fill="#e6f4ff" opacity="0.28" />}
                  <circle className="garage__breath" cx="4" cy="-166" r="6" />
                  <circle className="garage__breath" cx="10" cy="-166" r="5" style={{ animationDelay: "0.8s" }} />
                </g>
              )}
              {/* Too hot: sweat drops */}
              {feel === "hot" && (
                <g fill="#7fc8ff">
                  <path className="garage__sweat" d="M-18 -188 c-4 6 -4 10 0 10 c4 0 4 -4 0 -10z" />
                  <path className="garage__sweat" d="M17 -184 c-4 6 -4 10 0 10 c4 0 4 -4 0 -10z" style={{ animationDelay: "0.6s" }} />
                </g>
              )}
            </g>
          </g>

          {/* Heat waves above the boy when he is warm or hot */}
          {(feel === "ok" || feel === "hot") && (
            <g className="garage__waves" stroke={feel === "hot" ? "#ff6a3c" : "#ffb05c"} strokeWidth="6" fill="none" strokeLinecap="round">
              {[-60, 0, 60].map((dx, i) => (
                <path key={dx} d={`M${BOY_X + dx} 260 q14 -20 0 -40 q-14 -20 0 -40`} style={{ animationDelay: `${i * 0.3}s` } as CSSProperties} />
              ))}
            </g>
          )}

          {/* Too cold: frost creeping in from the edges, and snow */}
          <rect width="1600" height="900" fill="url(#ga-frost)" pointerEvents="none" style={{ opacity: feel === "cold" ? (short > 1 ? 0.95 : 0.6) : 0, transition: "opacity 0.5s" }} />
          {feel === "cold" && (
            <g className="garage__snow" fill="#ffffff">
              {Array.from({ length: 18 }, (_, i) => (
                <circle key={i} cx={(i * 97) % 1600} cy={-20} r={4 + (i % 3) * 2} style={{ animationDelay: `${(i % 6) * 0.5}s`, animationDuration: `${3 + (i % 4)}s` } as CSSProperties} />
              ))}
            </g>
          )}
          {/* Too hot: a red edge */}
          <rect width="1600" height="900" fill="url(#ga-hot)" pointerEvents="none" style={{ opacity: feel === "hot" ? 0.8 : 0, transition: "opacity 0.5s" }} />
        </svg>

        {/* The heater switch */}
        <div className="gh__lamp garage__switch" role="radiogroup" aria-label="Suit and rover heater">
          <b>HEATER</b>
          {LEVELS.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={choice === n} className={choice === n ? "is-on" : ""} disabled={locked} onClick={() => onChoose(n)}>
              <span>{GEAR[n].name}</span>
              <em>Power −{GEAR[n].power}</em>
            </button>
          ))}
        </div>

        <div className={`gh__preview garage__feel is-${feel}`} role="status">
          <b>{label}</b>
          {choice !== null && <span>Power −{GEAR[choice].power}{short > 0 ? ` · crew −${COLD_CREW} · each sample +${short} Power` : ""}</span>}
        </div>
      </div>
    </div>
  );
}
