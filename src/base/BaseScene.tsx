// The base, seen from the side as a cutaway: 4 rooms in a row on red Mars
// ground. All art is SVG (1600 × 800 scene units), like the prologue.
// What you see follows the game state:
//   power low → lights dim · battery cells fill with power
//   air → bubbles in the oxygen maker · food → plant height
//   grow lights used today → pink glow · shield → purple glow over the shelter
//   dust → brown panels and a hazy sky

import type { CSSProperties, KeyboardEvent } from "react";
import { ROOMS, text } from "../game/config";
import type { RoomId } from "../game/types";
import { SceneIcon } from "./Icons";
import { KID_X } from "./layout";
import type { IconName } from "./Icons";

// The art is drawn on a 1600 × 800 canvas; the camera frames just the base
// (sky and ground spill past the frame, so wide or tall screens never show bars).
const VIEW = "70 140 1460 500";

const INNER = { x: 130, y: 262, w: 1340, h: 318 };
const ROOM_W = INNER.w / 4; // 335
const FLOOR_Y = 560;

const roomX0 = (i: number) => INNER.x + i * ROOM_W;


const ROOM_ICON: Record<RoomId, IconName> = {
  power: "power",
  air: "air",
  greenhouse: "food",
  shelter: "shield",
};

type SceneProps = {
  room: RoomId;
  power: number;
  powerMax: number;
  air: number;
  airMax: number;
  food: number;
  foodMax: number;
  shield: number;
  shieldMax: number;
  dust: number;
  dustMax: number;
  solarToday: number;
  lightsOn: boolean;
  walking: { ms: number } | null;
  facing: 1 | -1;
  canWalk: boolean;
  /** Night falls after End Sol (consequences play out). */
  night: boolean;
  /** Tonight's flare, while night: blocked by the shield, or hit the crew. */
  flare: "blocked" | "hit" | null;
  onRoomTap: (room: RoomId) => void;
};

// ---------------------------------------------------------------------------

/** The kid from the prologue, seen from the side, facing right. Feet at (0, 0). */
function KidSide() {
  return (
    <g className="bkid">
      <ellipse className="bkid__shadow" cx="0" cy="2" rx="32" ry="6" />
      <g className="bkid__body">
        <g className="bkid__leg bkid__leg--back">
          <rect x="-8" y="-62" width="13" height="60" rx="6" fill="#222c47" />
          <ellipse cx="2" cy="-3" rx="11" ry="5" fill="#0e1424" />
        </g>
        <g transform="translate(-2 -112)">
          <g className="bkid__arm bkid__arm--back">
            <rect x="-5" y="0" width="10" height="46" rx="5" fill="#24697a" />
          </g>
        </g>
        <rect x="-32" y="-120" width="22" height="46" rx="8" fill="#e0a63a" />
        <rect x="-29" y="-100" width="15" height="14" rx="4" fill="#c58c27" />
        <rect x="-15" y="-124" width="32" height="64" rx="12" fill="#2f8496" />
        <rect x="-15" y="-70" width="32" height="9" rx="4" fill="#256b7a" />
        <g className="bkid__leg">
          <rect x="-6" y="-62" width="13" height="60" rx="6" fill="#26324f" />
          <ellipse cx="4" cy="-3" rx="11" ry="5" fill="#0e1424" />
        </g>
        <rect x="-4" y="-132" width="10" height="10" fill="#b57a54" />
        <circle cx="2" cy="-146" r="18" fill="#c98b62" />
        <path d="M-17 -146 Q-18 -168 2 -166 Q18 -166 20 -152 Q8 -158 -2 -154 Q-6 -146 -10 -138 Z" fill="#2a1a12" />
        <circle cx="12" cy="-147" r="2.4" fill="#1a1208" />
        <path d="M10 -137 q4 3 8 -1" fill="none" stroke="#1a1208" strokeWidth="2" strokeLinecap="round" />
        <g transform="translate(4 -112)">
          <g className="bkid__arm">
            <rect x="-5" y="0" width="10" height="48" rx="5" fill="#2b7686" />
            <circle cx="0" cy="50" r="5.5" fill="#c98b62" />
          </g>
        </g>
      </g>
    </g>
  );
}

function Sky({ dust, dustMax }: { dust: number; dustMax: number }) {
  const haze = dust / dustMax;
  return (
    <g className="bscene__sky">
      <defs>
        <linearGradient id="bscene-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8794f" />
          <stop offset="0.7" stopColor="#e2ae83" />
          <stop offset="1" stopColor="#efc59c" />
        </linearGradient>
        <radialGradient id="bscene-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbea" />
          <stop offset="0.35" stopColor="#fff3cf" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3cf" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="-2000" y="-1200" width="5600" height="1820" fill="url(#bscene-sky)" />
      <g style={{ opacity: 1 - haze * 0.7 }}>
        <circle cx="1470" cy="190" r="70" fill="url(#bscene-sun)" />
        <circle cx="1470" cy="190" r="22" fill="#fffbea" />
      </g>
      <path
        d="M-2000 560 L-200 560 Q60 500 260 540 T700 520 T1150 545 T1600 515 Q1800 500 3600 540 L3600 640 L-2000 640 Z"
        fill="#b35a3a"
      />
      <path d="M-2000 600 Q300 570 800 590 T1700 580 Q2400 575 3600 600 L3600 640 L-2000 640 Z" fill="#a24d30" />
      <rect className="bscene__haze" x="-2000" y="-1200" width="5600" height="1840" fill="#8a4f2c" style={{ opacity: haze * 0.45 }} />
    </g>
  );
}

function Ground() {
  return (
    <g className="bscene__ground">
      <rect x="-2000" y="600" width="5600" height="2000" fill="#8e3b22" />
      <rect x="-2000" y="600" width="5600" height="16" fill="#a8492a" />
      {[
        [40, 690, 34, 12],
        [260, 735, 22, 8],
        [620, 668, 18, 7],
        [930, 720, 40, 13],
        [1240, 680, 20, 8],
        [1540, 740, 36, 12],
        [1580, 650, 16, 6],
        [-60, 640, 26, 9],
      ].map(([x, y, rx, ry], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#6e2c18" />
      ))}
    </g>
  );
}

function SolarPanels({ dust, dustMax }: { dust: number; dustMax: number }) {
  const panels = [150, 255, 360];
  return (
    <g className="bscene__panels">
      {panels.map((x) => (
        <g key={x}>
          <rect x={x + 42} y="214" width="8" height="30" fill="#8b93a0" />
          <path d={`M${x} 214 L${x + 92} 214 L${x + 100} 168 L${x + 12} 168 Z`} fill="#1f3f8f" stroke="#c9d1dc" strokeWidth="4" />
          <path d={`M${x + 31} 168 L${x + 27} 214 M${x + 62} 168 L${x + 60} 214 M${x + 6} 191 L${x + 96} 191`} stroke="#5a7fd6" strokeWidth="2" />
          <path
            className="bscene__panel-dust"
            d={`M${x} 214 L${x + 92} 214 L${x + 100} 168 L${x + 12} 168 Z`}
            fill="#b5774a"
            style={{ opacity: Math.min(0.92, (dust / dustMax) * 0.95) }}
          />
        </g>
      ))}
    </g>
  );
}

function PowerRoom({ power, powerMax, solarToday }: { power: number; powerMax: number; solarToday: number }) {
  const level = power / powerMax;
  return (
    <g className="bscene__room bscene__room--power">
      {[155, 210, 265].map((x, i) => {
        // The 3 cells fill one after another.
        const cell = Math.max(0, Math.min(1, level * 3 - i));
        return (
          <g key={x}>
            <rect x={x} y="372" width="44" height="176" rx="8" fill="#272b38" stroke="#7d8597" strokeWidth="4" />
            <rect x={x + 14} y="362" width="16" height="12" rx="3" fill="#7d8597" />
            <rect x={x + 6} y={378 + 164 * (1 - cell)} width="32" height={164 * cell} rx="4" fill="#ffd23f" />
          </g>
        );
      })}
      <g>
        <rect x="372" y="448" width="82" height="100" rx="6" fill="#3a4152" />
        <rect x="380" y="400" width="66" height="54" rx="6" fill="#0d1320" stroke="#7d8597" strokeWidth="3" />
        <text x="413" y="438" textAnchor="middle" className="bscene__screen-text">
          ☀{solarToday}
        </text>
      </g>
    </g>
  );
}

function AirRoom({ air, airMax }: { air: number; airMax: number }) {
  const bubbles = Math.max(1, Math.ceil((air / airMax) * 6));
  const level = air / airMax;
  return (
    <g className="bscene__room bscene__room--air">
      <path d="M545 350 V300 H760" fill="none" stroke="#7d8597" strokeWidth="12" />
      <rect x="490" y="350" width="112" height="198" rx="18" fill="#3b4b63" stroke="#8b9ab3" strokeWidth="4" />
      <rect x="508" y="372" width="76" height="120" rx="12" fill="#0f2a40" />
      <rect x="508" y={372 + 120 * (1 - level)} width="76" height={120 * level} rx="10" fill="#2a9fd6" opacity="0.8" />
      {Array.from({ length: bubbles }, (_, i) => (
        <circle
          key={i}
          className="bscene__bubble"
          cx={520 + ((i * 23) % 56)}
          cy="484"
          r={5 + (i % 3) * 2}
          style={{ animationDelay: `${-i * 0.45}s` }}
        />
      ))}
      <rect x="520" y="506" width="52" height="14" rx="4" fill="#8b9ab3" />
      <rect x="632" y="412" width="46" height="136" rx="22" fill="#d7e6f5" stroke="#8b9ab3" strokeWidth="4" />
      <text x="655" y="488" textAnchor="middle" className="bscene__tank-text">
        O₂
      </text>
    </g>
  );
}

function Greenhouse({ food, foodMax, lightsOn }: { food: number; foodMax: number; lightsOn: boolean }) {
  const growth = food / foodMax;
  const droop = growth < 0.3;
  const plant = (x: number, base: number, k: number) => {
    const h = 26 + 62 * growth + (k % 2) * 8;
    return (
      <g key={`${x}-${base}`} className={`bscene__plant${droop ? " is-droopy" : ""}`} style={{ "--sway": `${-k * 0.5}s` } as CSSProperties}>
        <path d={`M${x} ${base} V${base - h}`} stroke="#3c8a3f" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx={x - 12} cy={base - h * 0.45} rx="14" ry="7" fill="#5fd068" transform={`rotate(${droop ? 35 : -25} ${x} ${base - h * 0.45})`} />
        <ellipse cx={x + 12} cy={base - h * 0.7} rx="14" ry="7" fill="#4fbf58" transform={`rotate(${droop ? -35 : 25} ${x} ${base - h * 0.7})`} />
        <ellipse cx={x} cy={base - h} rx="9" ry="12" fill="#6fe07a" transform={droop ? `rotate(70 ${x} ${base - h + 6})` : undefined} />
      </g>
    );
  };
  return (
    <g className="bscene__room bscene__room--greenhouse">
      <rect x="826" y="352" width="222" height="12" rx="6" fill="#585f70" />
      <rect className={`bscene__growlight${lightsOn ? " is-on" : ""}`} x="836" y="364" width="202" height="184" fill="url(#bscene-glow)" />
      <defs>
        <linearGradient id="bscene-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6ad5" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff6ad5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((k) => plant(850 + k * 44, 455, k))}
      <rect x="826" y="455" width="222" height="22" rx="4" fill="#6b4a32" />
      {[0, 1, 2, 3, 4].map((k) => plant(850 + k * 44, 530, k + 1))}
      <rect x="826" y="530" width="222" height="24" rx="4" fill="#6b4a32" />
    </g>
  );
}

function Shelter({ shield, shieldMax }: { shield: number; shieldMax: number }) {
  return (
    <g className="bscene__room bscene__room--shelter">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={1146 + i * 80} y="352" width="72" height="196" rx="6" fill="#2d3a58" opacity="0.7" />
      ))}
      <path d="M1150 370 q10 -8 20 0 t20 0 t20 0 M1230 370 q10 -8 20 0 t20 0 t20 0 M1390 370 q10 -8 20 0 t20 0 t20 0" fill="none" stroke="#5f7bb0" strokeWidth="3" />
      <g>
        <rect x="1152" y="420" width="114" height="12" rx="4" fill="#8b93a0" />
        <rect x="1152" y="432" width="114" height="20" rx="6" fill="#c36b5a" />
        <rect x="1152" y="510" width="114" height="12" rx="4" fill="#8b93a0" />
        <rect x="1152" y="522" width="114" height="22" rx="6" fill="#4c7fb3" />
        <rect x="1152" y="400" width="8" height="150" fill="#8b93a0" />
        <rect x="1258" y="400" width="8" height="150" fill="#8b93a0" />
      </g>
      <g>
        <rect x="1346" y="478" width="110" height="12" rx="4" fill="#9aa3b5" />
        <rect x="1356" y="490" width="8" height="58" fill="#9aa3b5" />
        <rect x="1438" y="490" width="8" height="58" fill="#9aa3b5" />
        <path d="M1366 478 L1372 446 H1414 L1420 478 Z" fill="#1b2232" stroke="#9aa3b5" strokeWidth="3" />
        <rect x="1376" y="452" width="34" height="20" fill="#4cc3ff" opacity="0.8" />
        <path d="M1432 478 v-16 l8 -18 m-8 18 h10" stroke="#e6dcff" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <rect
        className="bscene__shield-glow"
        x={INNER.x + 3 * ROOM_W}
        y={INNER.y}
        width={ROOM_W}
        height={INNER.h}
        fill="#b48cff"
        style={{ opacity: (shield / shieldMax) * 0.32 }}
      />
    </g>
  );
}

function NightSky({ on }: { on: boolean }) {
  const stars = [
    [80, 60], [240, 130], [420, 40], [610, 110], [760, 30], [930, 90], [1120, 50], [1290, 140],
    [1480, 70], [1560, 160], [330, 200], [1010, 180], [-120, 120], [1700, 40], [520, 170],
  ];
  return (
    <g className={`bscene__night${on ? " is-on" : ""}`} aria-hidden="true">
      <rect x="-2000" y="-1200" width="5600" height="3800" fill="#070b22" />
      <g fill="#e8ecff">
        {stars.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 ? 2.2 : 3.2} />
        ))}
      </g>
    </g>
  );
}

function FlareStreaks({ flare }: { flare: "blocked" | "hit" | null }) {
  if (!flare) return null;
  return (
    <g className={`bscene__flare bscene__flare--${flare}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${1650 + i * 40} ${-60 + i * 30} L${1250 + i * 45} ${flare === "blocked" ? 200 + i * 6 : 330 + i * 30}`}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </g>
  );
}

function ShieldDome({ shield, shieldMax, flash }: { shield: number; shieldMax: number; flash: boolean }) {
  if (shield <= 0) return null;
  const x0 = INNER.x + 3 * ROOM_W - 16;
  const x1 = INNER.x + 4 * ROOM_W + 26;
  return (
    <path
      className={`bscene__dome${flash ? " is-flash" : ""}`}
      d={`M${x0} 612 Q${x0} 190 ${(x0 + x1) / 2} 190 Q${x1} 190 ${x1} 612`}
      fill="none"
      stroke="#c39bff"
      strokeWidth={6 + shield * 4}
      strokeDasharray="22 10"
      style={{ opacity: 0.35 + (shield / shieldMax) * 0.55 }}
    />
  );
}

function RoomSign({ room, i }: { room: RoomId; i: number }) {
  const x = roomX0(i) + 18;
  return (
    <g className="bscene__sign" aria-hidden="true">
      <rect x={x} y="274" width={ROOM_W - 36} height="58" rx="14" />
      <SceneIcon name={ROOM_ICON[room]} x={x + 10} y={281} size={44} />
      <text x={x + 62} y="314">
        {text.rooms[room].name}
      </text>
    </g>
  );
}

export default function BaseScene(props: SceneProps) {
  const { room, walking, facing, canWalk, onRoomTap, night, flare } = props;
  const dim = props.power <= 2 ? 0.5 : props.power <= 5 ? 0.25 : 0;

  const onKey = (r: RoomId) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRoomTap(r);
    }
  };

  return (
    <svg
      className={`bscene${night ? " is-night" : ""}`}
      viewBox={VIEW}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="The Mars base. Tap a room to walk there."
    >
      <Sky dust={props.dust} dustMax={props.dustMax} />
      <Ground />
      <NightSky on={night} />

      {/* Hull */}
      <rect x="130" y="606" width="40" height="22" fill="#6c7383" />
      <rect x="1430" y="606" width="40" height="22" fill="#6c7383" />
      <rect x="780" y="606" width="40" height="22" fill="#6c7383" />
      <rect x="110" y="240" width="1380" height="372" rx="60" fill="#d9dde3" stroke="#8b93a0" strokeWidth="6" />
      <SolarPanels dust={props.dust} dustMax={props.dustMax} />
      <g className="bscene__antenna">
        <path d="M1340 240 V196" stroke="#8b93a0" strokeWidth="8" />
        <path d="M1302 196 Q1340 150 1378 196 Z" fill="#e6e9ee" stroke="#8b93a0" strokeWidth="4" />
      </g>
      <ShieldDome shield={props.shield} shieldMax={props.shieldMax} flash={flare === "blocked"} />

      {/* Inside */}
      <rect x={INNER.x} y={INNER.y} width={INNER.w} height={INNER.h} rx="42" fill="#1d2333" />
      <rect x={roomX0(0)} y={INNER.y} width={ROOM_W} height={INNER.h} fill="#3a3324" opacity="0.6" />
      <rect x={roomX0(1)} y={INNER.y} width={ROOM_W} height={INNER.h} fill="#1f3a4f" opacity="0.6" />
      <rect x={roomX0(2)} y={INNER.y} width={ROOM_W} height={INNER.h} fill="#1f3d2b" opacity="0.6" />
      <rect x={roomX0(3)} y={INNER.y} width={ROOM_W} height={INNER.h} fill="#2e2646" opacity="0.6" />

      <PowerRoom power={props.power} powerMax={props.powerMax} solarToday={props.solarToday} />
      <AirRoom air={props.air} airMax={props.airMax} />
      <Greenhouse food={props.food} foodMax={props.foodMax} lightsOn={props.lightsOn} />
      <Shelter shield={props.shield} shieldMax={props.shieldMax} />

      {/* Walls with doors, and the floor */}
      {[1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={roomX0(i) - 7} y={INNER.y} width="14" height="150" fill="#8b93a0" />
          <rect x={roomX0(i) - 11} y={INNER.y + 146} width="22" height="10" rx="3" fill="#6c7383" />
        </g>
      ))}
      <rect x={INNER.x} y={FLOOR_Y} width={INNER.w} height="20" fill="#454d61" />
      <path d={`M${INNER.x} ${FLOOR_Y + 10} H${INNER.x + INNER.w}`} stroke="#5a6378" strokeWidth="3" strokeDasharray="30 14" />

      {/* Radiation got in */}
      <rect
        className={`bscene__hitflash${flare === "hit" ? " is-on" : ""}`}
        x={INNER.x}
        y={INNER.y}
        width={INNER.w}
        height={INNER.h}
        rx="42"
        fill="#ff6a3d"
        aria-hidden="true"
      />

      {/* Lights dim when power is low */}
      <rect className="bscene__dim" x={INNER.x} y={INNER.y} width={INNER.w} height={INNER.h} rx="42" fill="#05070d" style={{ opacity: dim }} />

      {ROOMS.map((r, i) => (
        <RoomSign key={r} room={r} i={i} />
      ))}

      <FlareStreaks flare={night ? flare : null} />

      {/* The kid */}
      <g
        className={`bscene__kid${walking ? " is-walking" : ""}`}
        style={{
          transform: `translate(${KID_X[room]}px, ${FLOOR_Y}px)`,
          transitionDuration: `${walking?.ms ?? 0}ms`,
        }}
      >
        <g transform={facing < 0 ? "scale(-1 1)" : undefined}>
          <KidSide />
        </g>
      </g>

      {/* Tap areas (on top of everything) */}
      {ROOMS.map((r, i) => {
        const here = r === room;
        const name = text.rooms[r].name;
        return (
          <g
            key={r}
            className={`bscene__hit${here ? " is-here" : ""}${!here && !canWalk ? " is-blocked" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={here ? `${name}. ${text.panel.youAreHere}.` : `${name}. ${text.panel.walkCost}: minus 1 time.`}
            onClick={() => onRoomTap(r)}
            onKeyDown={onKey(r)}
          >
            <rect x={roomX0(i) + 4} y={INNER.y + 4} width={ROOM_W - 8} height={INNER.h - 8} rx="18" />
            {here ? (
              <g className="bscene__pill bscene__pill--here" transform={`translate(${roomX0(i) + ROOM_W / 2} 360)`}>
                <rect x="-92" y="-22" width="184" height="44" rx="22" />
                <text y="9" textAnchor="middle">
                  {text.panel.youAreHere}
                </text>
              </g>
            ) : (
              <g className="bscene__pill" transform={`translate(${roomX0(i) + ROOM_W / 2} 360)`}>
                <rect x="-66" y="-22" width="132" height="44" rx="22" />
                <SceneIcon name="walk" x={-56} y={-14} size={28} />
                <text x="-20" y="10">
                  −1
                </text>
                <SceneIcon name="time" x={22} y={-14} size={28} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
