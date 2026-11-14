// Mission ARES — the shared game state.
//
// One object, owned by App.tsx, passed to every scene on Mars. A scene reads
// it, and reports back what the player chose. The numbers are the START values
// from the cost table (power 12, water 10, air 6, crew 4 of 6).

import { pickCrop } from "../greenhouse/crops";
import type { CropId } from "../greenhouse/crops";
import { pickBonusSite } from "../rover/sites";
import type { SiteId } from "../rover/sites";

export type Meters = { power: number; water: number; air: number };
export type MeterKey = keyof Meters;

/** A row on the tablet that can be tapped. */
export type TabletFocus = MeterKey | "crew";

/** Every bar is drawn on the same 0–12 scale, so they compare at a glance. */
export const METER_MAX = 12;
export const CREW_MAX = 6;

export const METER_LABEL: Record<MeterKey, string> = {
  power: "Power",
  water: "Water",
  air: "Air",
};

export type Order = "GR" | "RG"; // greenhouse first, or rover first

/** The two jobs at the base hub. */
export type Task = "greenhouse" | "rover";

/** The "two problems, one crew" rule: whichever job goes second gets harder. Never called a mistake. */
export const LATER_COST: Record<Task, { chip: string; note: string }> = {
  greenhouse: {
    chip: "Later: +1 water needed",
    note: "Plants grow best when planted early. Later, they will need 1 extra water.",
  },
  rover: {
    chip: "Later: only 2 samples",
    note: "A dust storm is coming. If the rover waits, it can bring back only 2 samples.",
  },
};

/** Storm and shield sizes: 1 = small / thin, 2 = medium, 3 = big / thick. */
export type Level = 1 | 2 | 3;
export const LEVEL_NAME: Record<Level, string> = { 1: "small", 2: "medium", 3: "big" };

/** What each shield costs: Power now, and water locked in the shelter walls for the rest of the sol. */
export const SHIELD: Record<Level, { name: string; power: number; lock: number }> = {
  1: { name: "thin", power: 1, lock: 2 },
  2: { name: "medium", power: 2, lock: 4 },
  3: { name: "thick", power: 3, lock: 6 },
};

/** What happened in the storm (kept for the result screen's recap). */
export type StormRecord = {
  level: Level;
  shield: Level;
  /** Cloud speed in km/s from NASA DONKI. */
  speed: number;
  /** Day of the real event, YYYY-MM-DD. */
  date: string;
  /** True if the event came live from DONKI, false if it is one of the saved real events. */
  live: boolean;
  /** Strongest flare linked to the event (e.g. "X1.8"), if any. */
  flare: string | null;
  /** The Earth message was lost (an M or X flare blocked the signal). */
  lost: boolean;
  /** How many levels the storm was bigger than the shield. Crew −2 per level. */
  hits: number;
};

/**
 * One choice the player made, shown on the tablet for the rest of the game ("what you choose always has consequences").
 *   ok     it helped         cost   it cost something         wrong   not what Mission Control asked for         info   a plain fact of the plan
 */
export type Decision = { what: string; effect: string; mark: "ok" | "cost" | "wrong" | "info" };

export type GameState = {
  meters: Meters;
  /** Crew score, 0–6. Shown as 5 faces. */
  crew: number;
  /** Mars day. Sol 1 is the first task, Sol 2 the second (the storm). */
  sol: number;
  /** Which task the player picked first. Set at the base hub. */
  order: Order | null;
  /** Jobs finished so far (the first one is done before the storm, the second after). */
  tasks: Task[];
  /** Water locked inside the shelter walls (set by the storm, freed when the sol's last job is done). */
  locked: number;
  /** Rock samples brought back by the rover (how many; the rover can carry 1–3). */
  samples: number;
  /** Points those rocks are worth (4, 6 or 7 each, depending on where they were collected). */
  rockPoints: number;
  /** Points for the greenhouse harvest (0 if the plants wilted, 4 if they grew, 7 if they were lush). */
  harvest: number;
  /** This game's greenhouse crop (a different real space-grown crop each game). */
  crop: CropId;
  /** The site with the rock the science team needs (see MISSIONS in rover/sites.ts; a different one each game). */
  bonusSite: SiteId;
  /** The storm, once it has happened. */
  storm: StormRecord | null;
  /** Points lost to emergency backups (3 each). There is no game over, only a cost. */
  penalty: number;
  /** One line per choice, for the recap on the result screen. */
  log: string[];
  /** The same choices with their consequences, shown on the tablet in every Mars scene. */
  decisions: Decision[];
};

export const addDecision = (g: GameState, d: Decision): GameState => ({ ...g, decisions: [...g.decisions, d] });

export const newGame = (): GameState => ({
  meters: { power: 12, water: 10, air: 6 },
  crew: 4,
  sol: 1,
  order: null,
  tasks: [],
  locked: 0,
  samples: 0,
  rockPoints: 0,
  harvest: 0,
  crop: pickCrop(),
  bonusSite: pickBonusSite(),
  storm: null,
  penalty: 0,
  log: [],
  decisions: [],
});

/** One change to a meter. `at` is the second it happens in a timed scene (the night). */
export type Step = { key: MeterKey; delta: number; at: number };

/**
 * Apply steps in order. A meter that would drop below 0 is refilled to 1 by the
 * emergency backup, and the run pays 3 points. Nobody ever "loses".
 */
export function applySteps(game: GameState, steps: Step[]): GameState {
  let g = game;
  for (const s of steps) {
    let v = g.meters[s.key] + s.delta;
    let penalty = g.penalty;
    let log = g.log;
    if (v < 0) {
      v = 1;
      penalty += 3;
      log = [...log, `Emergency backup used for ${METER_LABEL[s.key]} (−3 points)`];
    }
    g = { ...g, meters: { ...g.meters, [s.key]: Math.min(METER_MAX, v) }, penalty, log };
  }
  return g;
}

/** Every night: five people breathe (air −3), and the oxygen maker answers (power −1, water −1, air +2). */
export const NIGHT_STEPS: Step[] = [
  { key: "air", delta: -3, at: 6 },
  { key: "power", delta: -1, at: 10 },
  { key: "water", delta: -1, at: 10.6 },
  { key: "air", delta: 2, at: 11.4 },
];

export type Face = "happy" | "okay" | "tired";

/**
 * Crew score (0–6) → 5 faces. Each full 1.2 points is one happy face; a
 * partly-filled one shows "okay". Start (4 of 6) = 3 happy, 1 okay, 1 tired.
 */
export function crewFaces(score: number): Face[] {
  const filled = (Math.max(0, Math.min(CREW_MAX, score)) / CREW_MAX) * 5;
  const happy = Math.floor(filled);
  const partial = filled - happy >= 0.3;
  return Array.from({ length: 5 }, (_, i) =>
    i < happy ? "happy" : i === happy && partial ? "okay" : "tired",
  );
}

/**
 * The storm hits. The shield costs Power now and locks water; a storm bigger than
 * the shield costs the crew 2 points per level it is bigger.
 */
export function applyStorm(game: GameState, rec: Omit<StormRecord, "hits">): GameState {
  const shield = SHIELD[rec.shield];
  const hits = Math.max(0, rec.level - rec.shield);
  const paid = applySteps(game, [{ key: "power", delta: -shield.power, at: 0 }]);
  const crew = Math.max(0, paid.crew - 2 * hits);
  const line = `Storm (${LEVEL_NAME[rec.level]}): picked a ${shield.name} shield${hits ? `, crew −${paid.crew - crew}` : ""}`;
  const locked = Math.min(shield.lock, paid.meters.water);
  return addDecision(
    {
      ...paid,
      crew,
      locked,
      storm: { ...rec, hits },
      log: [...paid.log, line],
    },
    {
      what: `Storm (${LEVEL_NAME[rec.level]}): ${shield.name} shield`,
      effect: `Power −${shield.power}, ${locked} water locked${hits ? `, storm was bigger: crew −${paid.crew - crew}` : ", the crew was safe"}`,
      mark: hits ? "cost" : "ok",
    },
  );
}

/** One rover sample: Power (the site's cost) and 1 Air, and the rock's points. A meter that runs out is refilled by the emergency backup. */
export function applySample(game: GameState, power: number, points: number): GameState {
  const paid = applySteps(game, [
    { key: "power", delta: -power, at: 0 },
    { key: "air", delta: -1, at: 0 },
  ]);
  return { ...paid, samples: paid.samples + 1, rockPoints: paid.rockPoints + points };
}
