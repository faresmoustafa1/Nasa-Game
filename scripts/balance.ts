// Mission ARES — balance checker.   npm run balance [-- --all-orders]
//
// Plays EVERY combination of walks and actions on every sol, using the real
// game rules (src/game/engine.ts) and the real numbers (src/data/balance.json).
//
// For each sol it reports:
//   UNWINNABLE  no choice survives the night, from any start the earlier
//               sols can lead to
//   DOMINANT    from most starts, one choice beats or ties every other
//               choice on every bar (so there is no real trade-off)
//   no-brainer  an action that is in EVERY best choice from most starts (warning)
//   never       an action that is in no best choice from any start (warning)
//   survival-only   same check ignoring science stars (for info)
//
// "Best choices" = the Pareto front: outcomes that no other outcome beats on
// every count (power, air, food, science, shield, dust, dose, food on the way).
// Earlier sols feed later ones: only best outcomes are carried forward.
//
// Exit code 1 if any sol is UNWINNABLE or DOMINANT.

import balanceJson from "../src/data/balance.json";
import daysJson from "../src/data/days.json";
import flareJson from "../src/data/flare-table.json";
import {
  actionCheck,
  actionsInRoom,
  doAction,
  endSol,
  newGame,
  walk,
} from "../src/game/engine";
import type { BalanceConfig, DayDef, GameState, RoomId, RunInfo } from "../src/game/types";

const cfg = balanceJson as unknown as BalanceConfig;
const allDays = daysJson.days as unknown as DayDef[];
const ROOMS: RoomId[] = ["power", "air", "greenhouse", "shelter"];
let MAX_STARTS = 250;

const args = process.argv.slice(2);
const allOrders = args.includes("--all-orders");

// ---------------------------------------------------------------------------

function dayKey(s: GameState): string {
  const used = Object.keys(s.usedToday)
    .sort()
    .map((k) => `${k}${s.usedToday[k]}`)
    .join(",");
  const pend = s.pending.map((p) => `${p.sol}:${JSON.stringify(p.gain)}`).sort().join(",");
  return [s.room, s.timeLeft, s.power, s.air, s.food, s.shield, s.dust, s.science, used, pend, JSON.stringify(s.flags)].join("|");
}

/** Every state reachable during one sol (walks + actions in any order). */
function reachable(start: GameState): GameState[] {
  const seen = new Map<string, GameState>();
  const stack = [start];
  while (stack.length) {
    const s = stack.pop()!;
    const k = dayKey(s);
    if (seen.has(k)) continue;
    seen.set(k, s);
    for (const r of ROOMS) if (r !== s.room && s.timeLeft >= cfg.walk.time) stack.push(walk(cfg, s, r));
    for (const id of actionsInRoom(cfg, s, s.room)) if (actionCheck(cfg, s, id).ok) stack.push(doAction(cfg, s, id));
  }
  return [...seen.values()];
}

type Outcome = { vec: number[]; strategy: string; next: GameState };

function pendingFood(s: GameState) {
  return s.pending.reduce((n, p) => n + (p.gain.food ?? 0), 0);
}

function vector(s: GameState): number[] {
  return [s.power, s.air, s.food, s.science, s.shield, -s.dust, -s.dose, pendingFood(s)];
}

function strategyOf(s: GameState): string {
  const parts = Object.keys(s.usedToday)
    .filter((k) => s.usedToday[k] > 0)
    .sort()
    .map((k) => (s.usedToday[k] > 1 ? `${k}×${s.usedToday[k]}` : k));
  return parts.length ? parts.join(" + ") : "(do nothing)";
}

function dominates(a: number[], b: number[]) {
  let better = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return false;
    if (a[i] > b[i]) better = true;
  }
  return better;
}

function paretoFront<T extends { vec: number[] }>(items: T[]): T[] {
  const uniq = new Map<string, T>();
  for (const it of items) if (!uniq.has(it.vec.join())) uniq.set(it.vec.join(), it);
  const list = [...uniq.values()];
  return list.filter((a) => !list.some((b) => b !== a && dominates(b.vec, a.vec)));
}

function outcomes(start: GameState, today: DayDef, next: DayDef | null, run: RunInfo): Outcome[] {
  const out: Outcome[] = [];
  for (const s of reachable(start)) {
    const r = endSol(cfg, s, today, next, run);
    if (r.report.paused) continue;
    const after = r.next ?? r.night;
    out.push({ vec: vector(after), strategy: strategyOf(s), next: after });
  }
  return out;
}

function sample<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list;
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
}

type DayStats = {
  day: DayDef;
  starts: number;
  winnableStarts: number;
  dominantStarts: number;
  avgFront: number;
  survivalOneBest: number;
  always: string[];
  never: string[];
  exampleFront: string[];
};

function runMission(order: DayDef[], run: RunInfo, collect: boolean) {
  let starts: GameState[] = [newGame(cfg, order.map((d) => d.id), order[0])];
  const stats: DayStats[] = [];
  for (let i = 0; i < order.length; i++) {
    const today = order[i];
    const next = order[i + 1] ?? null;
    const used = sample(starts, MAX_STARTS);
    const carried: Outcome[] = [];
    let winnable = 0;
    let dominant = 0;
    let frontTotal = 0;
    let survivalOneBest = 0;
    const inEvery = new Map<string, number>();
    const inFront = new Map<string, number>();
    const available = new Set<string>();
    let example: string[] = [];

    for (const st of used) {
      const outs = outcomes(st, today, next, run);
      if (!outs.length) continue;
      winnable++;
      const front = paretoFront(outs);
      frontTotal += front.length;
      if (front.length === 1) dominant++;
      carried.push(...front);
      if (collect) {
        for (const r of ROOMS) for (const id of actionsInRoom(cfg, st, r)) available.add(id);
        const actionsOf = (f: Outcome) => new Set(f.strategy.split(" + ").map((a) => a.replace(/×\d+$/, "")));
        const sets = front.map(actionsOf);
        const union = new Set(sets.flatMap((x) => [...x]));
        for (const a of union) {
          inFront.set(a, (inFront.get(a) ?? 0) + 1);
          if (sets.every((x) => x.has(a))) inEvery.set(a, (inEvery.get(a) ?? 0) + 1);
        }
        const noScience = paretoFront(outs.map((o) => ({ ...o, vec: o.vec.filter((_, k) => k !== 3) })));
        if (noScience.length === 1) survivalOneBest++;
        if (!example.length) example = front.slice(0, 6).map((f) => f.strategy);
      }
    }

    if (collect) {
      stats.push({
        day: today,
        starts: used.length,
        winnableStarts: winnable,
        dominantStarts: dominant,
        avgFront: winnable ? frontTotal / winnable : 0,
        survivalOneBest,
        always: [...available].filter((a) => winnable > 0 && (inEvery.get(a) ?? 0) / winnable > 0.5),
        never: [...available].filter((a) => !inFront.get(a)),
        exampleFront: example,
      });
    }
    starts = paretoFront(carried).map((o) => o.next);
    if (!starts.length) return { stats, winnable: false, failedAt: i };
  }
  return { stats, winnable: true, failedAt: -1 };
}

function permutations<T>(list: T[]): T[][] {
  if (list.length <= 1) return [list];
  return list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((p) => [x, ...p]));
}

// ---------------------------------------------------------------------------

const first = allDays.filter((d) => d.slot === "first");
const middle = allDays.filter((d) => d.slot === "shuffle");
const last = allDays.filter((d) => d.slot === "last");
const fileOrder = [...first, ...middle, ...last];
let problems = 0;

for (const flareClass of ["C", "M", "X"]) {
  const run: RunInfo = { flareClass, flareTable: flareJson.classes };
  console.log(`\n=== Flare class ${flareClass} (file day order) ===`);
  const res = runMission(fileOrder, run, true);
  for (const s of res.stats) {
    const unwinnable = s.winnableStarts === 0;
    const dominantDay = s.winnableStarts > 0 && s.dominantStarts / s.winnableStarts > 0.5;
    if (unwinnable || dominantDay) problems++;
    const tag = unwinnable ? "UNWINNABLE" : dominantDay ? "DOMINANT" : "ok";
    console.log(
      `Sol ${fileOrder.indexOf(s.day) + 1} ${s.day.id.padEnd(9)} ${tag.padEnd(10)} ` +
        `winnable from ${s.winnableStarts}/${s.starts} starts, ` +
        `one-best-choice from ${s.dominantStarts}, avg ${s.avgFront.toFixed(1)} best choices ` +
        `(survival-only one-best: ${s.survivalOneBest})`,
    );
    if (s.always.length) console.log(`        no-brainer (in every best choice): ${s.always.join(", ")}`);
    if (s.never.length) console.log(`        never worth it today:              ${s.never.join(", ")}`);
    console.log(`        e.g. ${s.exampleFront.slice(0, 4).join("  |  ")}`);
  }
  console.log(res.winnable ? "Mission can be finished." : `Mission CANNOT be finished (stuck on sol ${res.failedAt + 1}).`);
  if (!res.winnable) problems++;
}

if (allOrders) {
  MAX_STARTS = 30;
  console.log(`\n=== All ${permutations(middle).length} orders of the shuffled days ===`);
  for (const flareClass of ["C", "M", "X"]) {
    const run: RunInfo = { flareClass, flareTable: flareJson.classes };
    const bad = permutations(middle).filter((p) => !runMission([...first, ...p, ...last], run, false).winnable);
    console.log(`Flare ${flareClass}: ${bad.length} order(s) cannot be finished.`);
    for (const p of bad.slice(0, 5)) console.log(`   ${p.map((d) => d.id).join(" → ")}`);
    problems += bad.length;
  }
}

console.log(problems ? `\n${problems} problem(s) found.` : "\nNo unwinnable or one-answer sols. ✓");
process.exit(problems ? 1 : 0);
