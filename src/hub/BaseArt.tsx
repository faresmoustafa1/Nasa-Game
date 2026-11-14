// Mission ARES — the base, drawn as a cut-away: four rooms side by side, Jezero behind.
// Used by the hub (day) and the night scene. All 2D, all drawn here: no image files.
//
// Props that change the picture:
//   night    the sky darkens and the stars come out
//   running  the oxygen maker's fan spins and bubbles rise
//   glow     rooms that glow gold and can be tapped (the two jobs)
//   picked   the job the boy is walking to (it stays lit, the other goes quiet)
//   later    a job that has to wait: it gets a "Later: …" chip under its room
//   roverAway the rover has driven out of the garage door (used by the garage zoom)
//   pilotInRover the pilot waits in the rover's cab
//   children the people (drawn on top of the rooms)

import { useMemo } from "react";
import type { ReactNode } from "react";
import { StarField } from "../game/art";
import { seededRandom } from "../game/random";
import { LATER_COST } from "../game/state";
import type { Task } from "../game/state";
import { FLOOR_Y, ROOF_Y, ROOMS, TASK_ROOM, roomCenter } from "./layout";
import type { RoomId } from "./layout";
import "./hub.css";

type BaseArtProps = {
  night?: boolean;
  running?: boolean;
  glow?: Task[];
  picked?: Task | null;
  later?: Task | null;
  onPick?: (task: Task) => void;
  /** Solar storm: red sky, particles raining down. */
  storm?: boolean;
  /** Water tanks around the shelter walls: 0 = none, 1 = thin, 2 = medium, 3 = thick. */
  shield?: 0 | 1 | 2 | 3;
  /** The storm got through: the shelter flashes red. */
  hit?: boolean;
  /** The rover has driven out of the garage door (it slides back in when this turns false). */
  roverAway?: boolean;
  /** The pilot sits in the rover's cab, waiting (drawn as part of the rover, so it drives out with it). */
  pilotInRover?: boolean;
  children?: ReactNode;
};

const HORIZON = 430;

function makeRocks() {
  const rand = seededRandom(404);
  return Array.from({ length: 16 }, () => ({
    x: rand() * 1600,
    y: 790 + rand() * 100,
    rx: 10 + rand() * 24,
    ry: 5 + rand() * 9,
    dark: rand() > 0.5,
  }));
}

const TASK_LABEL: Record<Task, string> = { greenhouse: "the greenhouse", rover: "the rover" };

function Room({ id, fill, children }: { id: RoomId; fill: string; children: ReactNode }) {
  const r = ROOMS[id];
  return (
    <g className="hub__interior">
      <rect x={r.x} y={ROOF_Y} width={r.w} height={FLOOR_Y - ROOF_Y} fill={fill} />
      {children}
      <text className="hub__label" x={roomCenter(id)} y={ROOF_Y + 36} textAnchor="middle">
        {r.name}
      </text>
    </g>
  );
}

function makeStreaks() {
  const rand = seededRandom(1859);
  return Array.from({ length: 34 }, () => ({
    x: rand() * 1700,
    y: rand() * 520,
    len: 26 + rand() * 30,
    delay: rand() * 1.6,
  }));
}

export default function BaseArt({ night = false, running = false, glow = [], picked = null, later = null, onPick, storm = false, shield = 0, hit = false, roverAway = false, pilotInRover = false, children }: BaseArtProps) {
  const rocks = useMemo(() => makeRocks(), []);
  const streaks = useMemo(() => makeStreaks(), []);
  const classes = ["hub__svg", night && "is-night", running && "is-running", storm && "is-storm"].filter(Boolean).join(" ");

  // The two rooms that are also jobs.
  const jobs: Task[] = ["greenhouse", "rover"];

  return (
    <svg className={`ares__scene ${classes}`} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="group" aria-label="The Mars base, cut open so you can see the rooms">
      <defs>
        <linearGradient id="hub-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9774f" />
          <stop offset="0.7" stopColor="#d8a87c" />
          <stop offset="1" stopColor="#e9c9a2" />
        </linearGradient>
        <linearGradient id="hub-sky-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060a1c" />
          <stop offset="0.75" stopColor="#1b1a3a" />
          <stop offset="1" stopColor="#3a2540" />
        </linearGradient>
        <linearGradient id="hub-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a5634" />
          <stop offset="1" stopColor="#5e301c" />
        </linearGradient>
        <radialGradient id="hub-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6e0" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff6e0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ---------- Sky, crater wall and delta ---------- */}
      <rect width="1600" height="900" fill="url(#hub-sky)" />
      <g className="hub__sun">
        <circle cx="1230" cy="220" r="90" fill="url(#hub-sun)" />
        <circle cx="1230" cy="220" r="20" fill="#fff6e0" />
      </g>
      <g className="hub__night">
        <rect width="1600" height={HORIZON + 40} fill="url(#hub-sky-night)" />
        <StarField count={90} seed={91} maxY={HORIZON - 40} />
        <circle cx="1230" cy="200" r="16" fill="#e8ecf6" opacity="0.9" />
      </g>
      <path
        d={`M0 ${HORIZON} L0 360 L120 326 L260 350 L380 306 L520 342 L700 312 L900 354 L1080 308 L1250 340 L1400 300 L1600 344 L1600 ${HORIZON} Z`}
        fill="#a27350"
      />
      <path d={`M1110 ${HORIZON} L1210 330 L1320 338 L1420 ${HORIZON} Z`} fill="#c29a70" />
      <path d="M1230 340 L1170 420 M1270 342 L1260 420 M1310 342 L1340 420" stroke="#8a6040" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect className="hub__rim-dark" y="300" width="1600" height={HORIZON - 300} fill="#0a0f24" />

      {/* ---------- Ground ---------- */}
      <rect y={HORIZON} width="1600" height={900 - HORIZON} fill="url(#hub-ground)" />
      <rect className="hub__ground-dark" y={HORIZON} width="1600" height={900 - HORIZON} fill="#0a0f24" />
      {rocks.map((r, i) => (
        <ellipse key={i} cx={r.x} cy={r.y} rx={r.rx} ry={r.ry} fill={r.dark ? "#4a2414" : "#85482c"} />
      ))}

      {/* ---------- Solar storm: red sky and a rain of particles ---------- */}
      <rect className="hub__storm-sky" width="1600" height={HORIZON + 40} fill="#c2371f" />
      <g className="hub__storm" aria-hidden="true">
        {streaks.map((st, i) => (
          <path key={i} d={`M${st.x} ${st.y} l-${st.len * 0.5} ${st.len}`} style={{ animationDelay: `${st.delay}s` }} />
        ))}
      </g>

      {/* ---------- The base shell ---------- */}
      <rect x="84" y={ROOF_Y - 14} width="1448" height={FLOOR_Y - ROOF_Y + 44} rx="30" fill="#1a2135" stroke="#5a6685" strokeWidth="4" />

      {/* Greenhouse */}
      <Room id="greenhouse" fill="#1e3d3c">
        <path d={`M100 ${ROOF_Y} Q300 ${ROOF_Y - 84} 500 ${ROOF_Y}`} fill="rgba(160,230,220,0.18)" stroke="#a8e8df" strokeWidth="4" />
        <rect className="hub__growlight" x="150" y="540" width="300" height="12" rx="6" fill="#e3b8ff" />
        <path className="hub__growlight" d="M160 552 L120 700 L480 700 L440 552 Z" fill="rgba(227,184,255,0.1)" />
        <rect x="112" y="600" width="44" height="130" rx="14" fill="#3b7fb8" />
        <rect x="120" y="610" width="8" height="100" rx="4" fill="#ffffff" opacity="0.25" />
        <path d="M156 700 L180 700 L180 712 L156 712 Z" fill="#7a86a6" />
        {[190, 310, 430].map((x) => (
          <g key={x}>
            <rect x={x - 56} y="708" width="112" height="40" rx="8" fill="#5a3a22" />
            {[-26, 0, 26].map((dx, i) => (
              <g key={dx}>
                <path d={`M${x + dx} 708 L${x + dx} ${676 - i * 4}`} stroke="#4f9a4a" strokeWidth="5" strokeLinecap="round" />
                <ellipse cx={x + dx - 9} cy={684 - i * 4} rx="10" ry="5" fill="#6fbf62" transform={`rotate(-30 ${x + dx - 9} ${684 - i * 4})`} />
                <ellipse cx={x + dx + 9} cy={680 - i * 4} rx="10" ry="5" fill="#6fbf62" transform={`rotate(30 ${x + dx + 9} ${680 - i * 4})`} />
              </g>
            ))}
          </g>
        ))}
      </Room>

      {/* Oxygen maker */}
      <Room id="oxygen" fill="#232c4a">
        <rect x="520" y="620" width="44" height="128" rx="14" fill="#4c9bd6" />
        <rect x="528" y="630" width="8" height="100" rx="4" fill="#ffffff" opacity="0.25" />
        <rect x="590" y="566" width="180" height="182" rx="16" fill="#38425f" stroke="#6d7891" strokeWidth="3" />
        <rect x="610" y="592" width="140" height="92" rx="10" fill="#0e1a30" stroke="#6d7891" strokeWidth="2" />
        <text x="680" y="650" textAnchor="middle" className="hub__o2">
          O₂
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} className="hub__bubble" cx={628 + i * 24} cy="676" r={4 + (i % 3)} style={{ animationDelay: `${i * 0.45}s` }} />
        ))}
        <circle className="hub__led" cx="626" cy="712" r="7" />
        <rect x="650" y="706" width="80" height="12" rx="6" fill="#0e1a30" />
        <g className="hub__fan">
          <circle cx="680" cy="545" r="22" fill="#2b334f" stroke="#6d7891" strokeWidth="3" />
          <path d="M680 527 L680 563 M662 545 L698 545" stroke="#b8c0d2" strokeWidth="6" strokeLinecap="round" />
        </g>
        <rect x="770" y="696" width="90" height="12" fill="#7a86a6" />
      </Room>

      {/* Shelter: thick walls, six bunks */}
      <Room id="shelter" fill="#2d2842">
        <rect x="862" y={ROOF_Y} width="316" height={FLOOR_Y - ROOF_Y} fill="none" stroke="#8a93ad" strokeWidth="14" />
        <rect x="882" y="540" width="6" height="208" fill="#59607c" />
        <rect x="1088" y="540" width="6" height="208" fill="#59607c" />
        {[
          [892, 610],
          [958, 610],
          [1024, 610],
          [892, 700],
          [958, 700],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="60" height="16" rx="5" fill="#4a5070" />
            <ellipse cx={x + 12} cy={y - 2} rx="12" ry="6" fill="#d9dde8" />
          </g>
        ))}
        {/* The shield: water tanks slide in around the beds (more levels, more tanks) */}
        {[
          { level: 1, cls: "from-top", tanks: [882, 950, 1018, 1086].map((x) => ({ x, y: 532, w: 60, h: 30 })) },
          { level: 2, cls: "from-right", tanks: [572, 628, 684].map((y) => ({ x: 1106, y, w: 52, h: 52 })) },
          { level: 3, cls: "from-bottom", tanks: [882, 950, 1018].map((x) => ({ x, y: 722, w: 60, h: 24 })) },
        ].map((set) => (
          <g key={set.level} className={`hub__tanks ${set.cls}${shield >= set.level ? " is-on" : ""}`}>
            {set.tanks.map((t) => (
              <g key={`${t.x}-${t.y}`}>
                <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="9" fill="#3b7fb8" stroke="#8fd0ff" strokeWidth="2" />
                <rect x={t.x + 8} y={t.y + 5} width={t.w - 16} height="4" rx="2" fill="#ffffff" opacity="0.3" />
              </g>
            ))}
          </g>
        ))}
        <rect className={`hub__hit-ring${hit ? " is-on" : ""}`} x="866" y={ROOF_Y + 4} width="308" height={FLOOR_Y - ROOF_Y - 8} rx="10" />
      </Room>

      {/* Garage with the rover */}
      <Room id="garage" fill="#2a2f3d">
        <rect x="1480" y="540" width="40" height="208" fill="#0e1424" />
        <path d={`M1480 540 L1520 540 L1520 ${FLOOR_Y} L1480 ${FLOOR_Y} Z`} fill="#c98b62" opacity="0.5" />
        <g className={`hub__rover${roverAway ? " is-away" : ""}`}>
          <rect x="1262" y="684" width="190" height="44" rx="12" fill="#e8ecf3" stroke="#b8c0d2" strokeWidth="2" />
          <rect x="1280" y="660" width="130" height="14" rx="3" fill="#2b4a7a" />
          <path d="M1290 674 L1400 674" stroke="#6d7891" strokeWidth="3" />
          <path d="M1434 684 L1434 640" stroke="#b8c0d2" strokeWidth="6" strokeLinecap="round" />
          <rect x="1420" y="624" width="30" height="18" rx="4" fill="#46526e" />
          <circle cx="1444" cy="633" r="5" fill="#7ee0b0" />
          <path d="M1262 700 L1230 724" stroke="#b8c0d2" strokeWidth="7" strokeLinecap="round" />
          {pilotInRover && (
            <g aria-hidden="true">
              <rect x="1286" y="676" width="46" height="14" rx="6" fill="#4a8be0" />
              <circle cx="1309" cy="660" r="15" fill="#a9703f" />
              <path d="M1294 656 Q1309 640 1324 656 Q1316 649 1309 649 Q1302 649 1294 656 Z" fill="#14100c" />
              <circle cx="1303" cy="662" r="2" fill="#14100c" />
              <circle cx="1315" cy="662" r="2" fill="#14100c" />
              <path d="M1303 669 Q1309 674 1315 669" stroke="#14100c" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M1284 690 V656 Q1284 630 1309 630 Q1334 630 1334 656 V690" fill="rgba(150,195,235,0.22)" stroke="#d6deee" strokeWidth="3" />
            </g>
          )}
          {[1286, 1356, 1426].map((x) => (
            <g key={x}>
              <circle cx={x} cy="728" r="22" fill="#1a1f2e" stroke="#6d7891" strokeWidth="4" />
              <circle cx={x} cy="728" r="7" fill="#6d7891" />
            </g>
          ))}
        </g>
      </Room>

      {/* Floor */}
      <rect x="100" y={FLOOR_Y} width="1420" height="18" fill="#3b4560" />

      {/* ---------- Glowing, tappable jobs ---------- */}
      {jobs.map((job) => {
        const room = TASK_ROOM[job];
        const r = ROOMS[room];
        const active = glow.includes(job) && !picked;
        const lit = picked === job;
        const quiet = !!picked && picked !== job;
        return (
          <g
            key={job}
            className={`hub__job${active ? " is-glow" : ""}${lit ? " is-lit" : ""}${quiet ? " is-quiet" : ""}`}
            role={active ? "button" : undefined}
            tabIndex={active ? 0 : undefined}
            aria-label={active ? `Send the boy to ${TASK_LABEL[job]}` : undefined}
            onClick={active ? () => onPick?.(job) : undefined}
            onKeyDown={
              active
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPick?.(job);
                    }
                  }
                : undefined
            }
          >
            <rect className="hub__ring" x={r.x + 4} y={ROOF_Y + 4} width={r.w - 8} height={FLOOR_Y - ROOF_Y - 8} rx="14" />
            <rect className="hub__hit" x={r.x} y={ROOF_Y - 90} width={r.w} height={FLOOR_Y - ROOF_Y + 90} />
          </g>
        );
      })}

      {/* The rule: the job that waits gets harder. Said once, kindly. */}
      {later && (
        <g className="hub__chip">
          <rect x={roomCenter(TASK_ROOM[later]) - 170} y="782" width="340" height="46" rx="23" />
          <text x={roomCenter(TASK_ROOM[later])} y="813" textAnchor="middle">
            {LATER_COST[later].chip}
          </text>
        </g>
      )}

      {children}
    </svg>
  );
}
