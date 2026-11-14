// Mission ARES — the balance check (a tool, not part of the game).
//
// It plays EVERY possible set of choices with the real game rules (the same functions the scenes use), for every
// crop, order, weather, storm size and bonus rock, and prints how the final scores are spread. Phase 7 uses it to
// set the badge limits and to check that no choice is "free" (always best) or a trap.
//
//   npx rolldown src/sim/balance.ts --platform node --format esm -o /tmp/balance.mjs && node /tmp/balance.mjs

import { CROP_IDS, CROPS } from "../greenhouse/crops";
import { applyGreenhouse, lightAvailable, waterAvailable, LIGHT_MAX, WATER_MAX } from "../greenhouse/rules";
import { NIGHT_STEPS, applySample, applySteps, applyStorm, newGame } from "../game/state";
import type { GameState, Level, Task } from "../game/state";
import { GEAR, coldExtra } from "../rover/weather";
import { SITES, rockValue, sampleCap, sampleCost } from "../rover/sites";
import type { SiteId } from "../rover/sites";
import { scoreOf } from "../result/score";

type Tag = { task: Task; water?: number; light?: number; gear?: Level; waited?: boolean; sites?: number[] };
type Choice = { fn: (g: GameState) => GameState; tag: Tag };

const LEVELS: Level[] = [1, 2, 3];

/** All greenhouse choices (water 0–3, light 0–3) the player could make now. */
function greenhouseChoices(g: GameState): Choice[] {
  const out: Choice[] = [];
  for (let w = 0; w <= Math.min(WATER_MAX, waterAvailable(g)); w++)
    for (let l = 0; l <= Math.min(LIGHT_MAX, lightAvailable(g)); l++) out.push({ tag: { task: "greenhouse", water: w, light: l }, fn: (s) => applyGreenhouse(s, w, l) });
  return out;
}

/** All rover choices: heater level, wait or go, and which sites (at least one rock, up to the cap). */
function roverChoices(g: GameState, cold: Level): Choice[] {
  const first = g.tasks.length === 0;
  const out: Choice[] = [];
  const subsets: number[][] = [];
  for (let m = 1; m < 8; m++) subsets.push([0, 1, 2].filter((i) => m & (1 << i)));
  for (const gear of LEVELS)
    for (const waited of [false, true]) {
      const cap = sampleCap(first, waited);
      for (const sub of subsets) {
        if (sub.length > cap) continue;
        out.push({ tag: { task: "rover", gear, waited, sites: sub }, fn: (s) => {
          let c = applySteps(s, [{ key: "power", delta: -GEAR[gear].power, at: 0 }]);
          const extra = coldExtra(cold, gear);
          const tired = c.crew <= 2;
          for (const i of sub) c = applySample(c, sampleCost(SITES[i], tired, waited, extra), rockValue(SITES[i], s.bonusSite));
          return c;
        } });
      }
    }
  return out;
}

const jobChoices = (task: Task, g: GameState, cold: Level) => (task === "greenhouse" ? greenhouseChoices(g) : roverChoices(g, cold));

/** All finished games for one situation. Returns every final score. */
function allScores(crop: (typeof CROP_IDS)[number], order: [Task, Task], cold: Level, storm: Level, bonus: SiteId): { total: number; backups: number; plan: [Tag, Level, Tag] }[] {
  const start: GameState = { ...newGame(), crop, bonusSite: bonus };
  const scores: { total: number; backups: number; plan: [Tag, Level, Tag] }[] = [];
  for (const c1 of jobChoices(order[0], start, cold)) {
    let g = c1.fn(start);
    g = { ...g, tasks: [order[0]] };
    g = applySteps(g, NIGHT_STEPS);
    for (const shield of LEVELS) {
      const stormed = applyStorm(g, { level: storm, shield, speed: 0, date: "", live: false, flare: null, lost: false });
      for (const c2 of jobChoices(order[1], stormed, cold)) {
        const done = c2.fn({ ...stormed, locked: stormed.locked });
        const fin = { ...done, locked: 0 };
        scores.push({ total: scoreOf(fin).total, backups: fin.penalty / 3, plan: [c1.tag, shield, c2.tag] });
      }
    }
  }
  return scores;
}

const pct = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];

const lines: string[] = [];
const feat = { situations: 0, gearMatch: 0, gearOver: 0, gearUnder: 0, waited: 0, rocks: 0, siteUse: [0, 0, 0], shieldMatch: 0, shieldOver: 0, shieldUnder: 0, lush: 0, bonusUsed: 0, ghFirst: 0 };
const GOLD_LIMITS = [26, 27, 28, 29, 30, 31, 32];
const reach: number[] = GOLD_LIMITS.map(() => 0);
const bests: number[] = [];
const all: number[] = [];
let backupGames = 0;
let n = 0;
const orders: [Task, Task][] = [["greenhouse", "rover"], ["rover", "greenhouse"]];
const colds: Level[] = [1, 2, 3];
for (const crop of CROP_IDS)
  for (const order of orders)
    for (const cold of colds)
      for (const storm of LEVELS)
        for (const bonus of ["floor", "foot", "top"] as SiteId[]) {
          const sc = allScores(crop, order, cold, storm, bonus);
          const totals = sc.map((s) => s.total).sort((a, b) => a - b);
          bests.push(totals[totals.length - 1]);
          const top = sc.reduce((a, b) => (b.total > a.total ? b : a));
          const rv = top.plan[0].task === "rover" ? top.plan[0] : top.plan[2];
          const gh = top.plan[0].task === "greenhouse" ? top.plan[0] : top.plan[2];
          feat.situations++;
          feat.gearMatch += rv.gear === cold ? 1 : 0;
          feat.gearOver += (rv.gear ?? 0) > cold ? 1 : 0;
          feat.gearUnder += (rv.gear ?? 0) < cold ? 1 : 0;
          feat.waited += rv.waited ? 1 : 0;
          feat.rocks += rv.sites?.length ?? 0;
          for (const i of rv.sites ?? []) feat.siteUse[i]++;
          feat.shieldMatch += top.plan[1] === storm ? 1 : 0;
          feat.shieldOver += top.plan[1] > storm ? 1 : 0;
          feat.shieldUnder += top.plan[1] < storm ? 1 : 0;
          feat.lush += (gh.light ?? 0) > CROPS[crop].light ? 1 : 0;
          feat.bonusUsed += (rv.sites ?? []).some((i) => SITES[i].id === bonus) ? 1 : 0;
          feat.ghFirst += order[0] === "greenhouse" ? 1 : 0;
          GOLD_LIMITS.forEach((l, i) => (reach[i] += totals[totals.length - 1] >= l ? 1 : 0));
          for (const s of sc) {
            all.push(s.total);
            n++;
            if (s.backups > 0) backupGames++;
          }
        }
all.sort((a, b) => a - b);
bests.sort((a, b) => a - b);
lines.push(`situations: ${bests.length}, finished games checked: ${n}`);
lines.push(`ALL games      min ${all[0]}  p10 ${pct(all, 10)}  p25 ${pct(all, 25)}  median ${pct(all, 50)}  p75 ${pct(all, 75)}  p90 ${pct(all, 90)}  max ${all[all.length - 1]}`);
lines.push(`BEST per situation  min ${bests[0]}  median ${pct(bests, 50)}  max ${bests[bests.length - 1]}`);
const f = (x: number) => ((100 * x) / feat.situations).toFixed(0) + "%";
lines.push(`BEST plan: heater matches cold ${f(feat.gearMatch)}, over ${f(feat.gearOver)}, under ${f(feat.gearUnder)}; waited for Earth ${f(feat.waited)}; avg rocks ${(feat.rocks / feat.situations).toFixed(2)}`);
lines.push(`BEST plan: sites used floor ${f(feat.siteUse[0])} foot ${f(feat.siteUse[1])} top ${f(feat.siteUse[2])}; bonus rock collected ${f(feat.bonusUsed)}`);
lines.push(`BEST plan: shield matches storm ${f(feat.shieldMatch)}, over ${f(feat.shieldOver)}, under ${f(feat.shieldUnder)}; extra light on plants ${f(feat.lush)}; greenhouse first ${f(feat.ghFirst)}`);
lines.push(`share of situations where the best score reaches: ${GOLD_LIMITS.map((l, i) => `${l}+ ${f(reach[i])}`).join("  ")}`);
const share = (lim: number) => ((100 * all.filter((x) => x >= lim).length) / all.length).toFixed(1) + "%";
lines.push(`share of ALL games at: ${GOLD_LIMITS.map((l) => `${l}+ ${share(l)}`).join("  ")}`);
lines.push(`games with an emergency backup: ${((100 * backupGames) / n).toFixed(1)}%`);
for (const crop of CROP_IDS) {
  const b: number[] = [];
  for (const order of orders) for (const cold of colds) for (const storm of LEVELS) for (const bonus of ["floor", "foot", "top"] as SiteId[]) b.push(Math.max(...allScores(crop, order, cold, storm, bonus).map((s) => s.total)));
  b.sort((x, y) => x - y);
  lines.push(`best, crop ${CROPS[crop].name.padEnd(22)} min ${b[0]} median ${pct(b, 50)} max ${b[b.length - 1]}`);
}
console.log(lines.join("\n"));
