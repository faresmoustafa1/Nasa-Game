// Mission ARES — the night's mini-game: connect the oxygen maker's pipe.
//
// Water comes in from the tank on the left. Tap a pipe tile to turn it a quarter turn, until the water
// reaches the "Crew air" outlet on the right. Tiles the water has reached turn blue, so the player sees
// the flow as they go. It cannot be lost: after a while a "Hint" button fixes one tile.
// Then a NASA fact about the real space-station oxygen maker, and "Continue ▸" (the night carries on).

import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import "./puzzle.css";

type Kind = "straight" | "corner" | "none";
type Tile = { kind: Kind; /** quarter turns the player has made so far (any integer) */ rot: number };

const COLS = 4;
const ROWS = 3;
const CELL = 120;
const GX = 90;
const GY = 30;
const IN_ROW = 1;
const OUT_ROW = 2;

/** The right turn for each tile on the water's path (rot mod 4, or mod 2 for a straight pipe). Others are decoys. */
const SOLUTION: Record<string, number> = { "1,0": 0, "1,1": 2, "2,1": 0, "2,2": 0, "2,3": 0 };

const START: Tile[][] = [
  [
    { kind: "corner", rot: 1 },
    { kind: "straight", rot: 0 },
    { kind: "corner", rot: 3 },
    { kind: "none", rot: 0 },
  ],
  [
    { kind: "straight", rot: 1 },
    { kind: "corner", rot: 3 },
    { kind: "straight", rot: 1 },
    { kind: "corner", rot: 2 },
  ],
  [
    { kind: "none", rot: 0 },
    { kind: "corner", rot: 1 },
    { kind: "straight", rot: 1 },
    { kind: "straight", rot: 1 },
  ],
];

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Sides a tile opens to: 0 = up, 1 = right, 2 = down, 3 = left. */
function opens(t: Tile): number[] {
  if (t.kind === "straight") return mod(t.rot, 2) === 0 ? [1, 3] : [0, 2];
  if (t.kind === "corner") return [[0, 1], [1, 2], [2, 3], [3, 0]][mod(t.rot, 4)];
  return [];
}

const STEP: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];

/** Which tiles the water has reached, and whether it gets out at the right. */
function flow(grid: Tile[][]) {
  const wet = new Set<string>();
  const first = grid[IN_ROW][0];
  if (!opens(first).includes(3)) return { wet, solved: false };
  const queue: [number, number][] = [[IN_ROW, 0]];
  wet.add(`${IN_ROW},0`);
  while (queue.length) {
    const [r, c] = queue.shift()!;
    for (const d of opens(grid[r][c])) {
      const nr = r + STEP[d][0];
      const nc = c + STEP[d][1];
      if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || wet.has(`${nr},${nc}`)) continue;
      if (!opens(grid[nr][nc]).includes((d + 2) % 4)) continue;
      wet.add(`${nr},${nc}`);
      queue.push([nr, nc]);
    }
  }
  return { wet, solved: wet.has(`${OUT_ROW},${COLS - 1}`) && opens(grid[OUT_ROW][COLS - 1]).includes(1) };
}

/** The pipe drawn for rotation 0, inside a 120 × 120 cell (the tile turns with CSS). */
function pipePath(kind: Kind) {
  if (kind === "straight") return "M0 60 H120";
  if (kind === "corner") return "M60 0 V60 H120";
  return "";
}

type Props = {
  onDone: () => void;
};

export default function OxygenPuzzle({ onDone }: Props) {
  const [grid, setGrid] = useState<Tile[][]>(START);
  const [hint, setHint] = useState(false);
  const { wet, solved } = useMemo(() => flow(grid), [grid]);

  useEffect(() => {
    const id = window.setTimeout(() => setHint(true), 14000);
    return () => window.clearTimeout(id);
  }, []);

  const turn = (r: number, c: number) => {
    if (solved) return;
    setGrid((g) => g.map((row, ri) => row.map((t, ci) => (ri === r && ci === c && t.kind !== "none" ? { ...t, rot: t.rot + 1 } : t))));
  };

  const fixOne = () => {
    setGrid((g) => {
      for (const key of Object.keys(SOLUTION)) {
        const [r, c] = key.split(",").map(Number);
        const t = g[r][c];
        const period = t.kind === "straight" ? 2 : 4;
        const need = mod(SOLUTION[key] - t.rot, period);
        if (need !== 0) return g.map((row, ri) => row.map((x, ci) => (ri === r && ci === c ? { ...x, rot: x.rot + need } : x)));
      }
      return g;
    });
  };

  const onKey = (e: KeyboardEvent<SVGGElement>, r: number, c: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      turn(r, c);
    }
  };

  return (
    <div className="oxp" role="dialog" aria-label="Oxygen maker: connect the pipe">
      <div className="oxp__panel">
        <h2>OXYGEN MAKER</h2>
        <p className="oxp__ask">{solved ? "The water flows! The machine can make oxygen." : "Tap the pipes to turn them. Send the water to the crew's air."}</p>
        <svg viewBox="0 0 760 420" className="oxp__svg" role="group" aria-label="A grid of pipes. Water enters on the left and must reach the outlet on the right.">
          <rect x="10" y={GY + IN_ROW * CELL - 10} width="62" height="140" rx="22" fill="rgba(59,127,184,0.3)" stroke="#7fb6e6" strokeWidth="4" />
          <rect x="18" y={GY + IN_ROW * CELL + 40} width="46" height="82" rx="14" fill="#3b7fb8" />
          <text className="oxp__tag" x="41" y={GY + IN_ROW * CELL - 22} textAnchor="middle">
            WATER
          </text>
          <path d={`M72 ${GY + IN_ROW * CELL + 60} H${GX}`} stroke="#4aa8f0" strokeWidth="26" />
          <path d={`M${GX + COLS * CELL} ${GY + OUT_ROW * CELL + 60} H660`} stroke={solved ? "#7ee0b0" : "#7a86a6"} strokeWidth="26" />
          <rect x="650" y={GY + OUT_ROW * CELL + 10} width="100" height="100" rx="18" fill={solved ? "rgba(126,224,176,0.3)" : "rgba(122,134,166,0.2)"} stroke={solved ? "#7ee0b0" : "#7a86a6"} strokeWidth="4" />
          <text className="oxp__tag" x="700" y={GY + OUT_ROW * CELL + 56} textAnchor="middle">
            CREW
          </text>
          <text className="oxp__tag" x="700" y={GY + OUT_ROW * CELL + 82} textAnchor="middle">
            AIR
          </text>
          {grid.map((row, r) =>
            row.map((t, c) => {
              const isWet = wet.has(`${r},${c}`);
              const x = GX + c * CELL;
              const y = GY + r * CELL;
              return (
                <g
                  key={`${r},${c}`}
                  transform={`translate(${x} ${y})`}
                  className={`oxp__tile${t.kind === "none" ? " is-none" : ""}`}
                  role={t.kind === "none" ? undefined : "button"}
                  tabIndex={t.kind === "none" || solved ? undefined : 0}
                  aria-label={t.kind === "none" ? undefined : `Pipe, row ${r + 1}, column ${c + 1}${isWet ? ", water inside" : ""}. Turn it.`}
                  onClick={() => turn(r, c)}
                  onKeyDown={(e) => onKey(e, r, c)}
                >
                  <rect x="4" y="4" width="112" height="112" rx="14" fill="#1c2540" stroke="#3a4668" strokeWidth="3" />
                  {t.kind !== "none" && (
                    <g className="oxp__pipe" style={{ transform: `rotate(${t.rot * 90}deg)` }}>
                      <path d={pipePath(t.kind)} fill="none" stroke={isWet ? "#4aa8f0" : "#8a96b4"} strokeWidth="26" strokeLinecap="butt" strokeLinejoin="round" />
                      <circle cx="60" cy="60" r="10" fill={isWet ? "#d4ecff" : "#c4cbe0"} />
                    </g>
                  )}
                </g>
              );
            }),
          )}
        </svg>

        {solved ? (
          <div className="oxp__fact" role="status">
            <b>SPACE FACT · The real oxygen maker</b>
            <p>
              The space station has an oxygen maker too. It uses electricity to split water into oxygen and hydrogen. The oxygen goes into the cabin for the crew to breathe, and the hydrogen goes to another machine that helps recover water.
            </p>
            <small>Source: NASA Technical Reports Server · ISS Oxygen Generation Assembly (ICES-2019-153)</small>
          </div>
        ) : (
          hint && (
            <button type="button" className="oxp__hint" onClick={fixOne}>
              Hint: fix one pipe for me
            </button>
          )
        )}
        {solved && (
          <button type="button" className="ares__cta oxp__go" onClick={onDone}>
            Continue ▸
          </button>
        )}
      </div>
    </div>
  );
}
