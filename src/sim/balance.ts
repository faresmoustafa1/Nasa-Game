// Mission ARES — the balance check (a tool, not part of the game).
//
// It plays EVERY possible set of choices with the real game rules (the same functions the scenes use), for every
// crop, order, weather, storm forecast, forecast miss and science-team rock, and prints how the final scores are
// spread. It is used to set the badge limits and to check that no choice is "free" (always best) or a trap.
//
// The storm is played the way the player meets it: the shield is picked knowing only the FORECAST; then the storm
// turns out as forecast, or one size bigger or smaller (missOdds in storm/donki.ts). Every score is weighted by
// how likely that storm is. The job after the storm is picked knowing what really happened.
// (Storms with no forecast, after a big flare, are left out: there the player can only guess.)
//
//   npm run balance

import { CROP_IDS, CROPS } from "../greenhouse/crops";
import { applyGreenhouse, lightAvailable, waterAvailable, LIGHT_MAX, WATER_MAX } from "../greenhouse/rules";
import { NIGHT_STEPS, applySample, applySteps, applyStorm, newGame } from "../game/state";
import type { GameState, Level, Task } from "../game/state";
import { SAVED_READINGS, applyGear, coldExtra, coldLevel } from "../rover/weather";
import type { Reading } from "../rover/weather";
import { SITES, rockValue, sampleCap, sampleCost } from "../rover/sites";
import type { SiteId } from "../rover/sites";
import { scoreOf } from "../result/score";
import { missOdds } from "../storm/donki";

type Tag = { task: Task; water?: number; light?: number; gear?: Level; waited?: boolean; sites?: number[] };
type Choice = { fn: (g: GameState) => GameState; tag: Tag };

const LEVELS: Level[] = [1, 2, 3];
/** One saved reading for each cold level. */
const READING: Record<Level, Reading> = {
  1: SAVED_READINGS.find((r) => coldLevel(r.temp) === 1)!,
  2: SAVED_READINGS.find((r) => coldLevel(r.temp) === 2)!,
  3: SAVED_READINGS.find((r) => coldLevel(r.temp) === 3)!,
};

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
        out.push({
          tag: { task: "rover", gear, waited, sites: sub },
          fn: (s) => {
            let c = applyGear(s, READING[cold], gear);
            const extra = coldExtra(cold, gear);
            const tired = c.crew <= 2;
            for (const i of sub) c = applySample(c, sampleCost(SITES[i], tired, waited, extra), rockValue(SITES[i], s.bonusSite));
            return c;
          },
        });
      }
    }
  return out;
}

const jobChoices = (task: Task, g: GameState, cold: Level) => (task === "greenhouse" ? greenhouseChoices(g) : roverChoices(g, cold));

const finish = (g: GameState) => ({ ...g, locked: 0 });

type Situation = { crop: (typeof CROP_IDS)[number]; order: [Task, Task]; cold: Level; forecast: Level; glancing: boolean; bonus: SiteId };

/**
 * One situation, played two ways:
 *   all    every finished game, with its weight (how likely that storm was), for the spread of scores
 *   best   the best plan's EXPECTED score: first job, then the shield (knowing only the forecast), then the best second job for the real storm
 */
function play(sit: Situation) {
  const start: GameState = { ...newGame(), crop: sit.crop, bonusSite: sit.bonus };
  const odds = missOdds(sit.forecast, sit.glancing); // [smaller, same, bigger]
  const actuals = ([-1, 0, 1] as const).map((d, i) => ({ level: (sit.forecast + d) as Level, p: odds[i] })).filter((a) => a.p > 0);
  const all: { total: number; w: number; backup: boolean }[] = [];
  let best = { expected: -Infinity, first: null as Tag | null, shield: 1 as Level, second: [] as Tag[] };

  for (const c1 of jobChoices(sit.order[0], start, sit.cold)) {
    const night = applySteps({ ...c1.fn(start), tasks: [sit.order[0]] }, NIGHT_STEPS);
    for (const shield of LEVELS) {
      let expected = 0;
      const seconds: Tag[] = [];
      for (const a of actuals) {
        const stormed = applyStorm(night, { level: a.level, forecast: sit.forecast, shield, speed: 0, date: "", live: false, flare: null, lost: false });
        let top = -Infinity;
        let topTag: Tag | null = null;
        const c2s = jobChoices(sit.order[1], stormed, sit.cold);
        for (const c2 of c2s) {
          const fin = finish(c2.fn(stormed));
          const total = scoreOf(fin).total;
          all.push({ total, w: a.p / c2s.length, backup: fin.penalty > 0 });
          if (total > top) {
            top = total;
            topTag = c2.tag;
          }
        }
        expected += a.p * top;
        if (topTag) seconds.push(topTag);
      }
      if (expected > best.expected) best = { expected, first: c1.tag, shield, second: seconds };
    }
  }
  return { all, best };
}

/** Weighted percentile. */
function wpct(list: { total: number; w: number }[], p: number) {
  const sorted = [...list].sort((a, b) => a.total - b.total);
  const sum = sorted.reduce((s, x) => s + x.w, 0);
  let acc = 0;
  for (const x of sorted) {
    acc += x.w;
    if (acc >= (p / 100) * sum) return x.total;
  }
  return sorted[sorted.length - 1].total;
}

const lines: string[] = [];
const orders: [Task, Task][] = [["greenhouse", "rover"], ["rover", "greenhouse"]];
const everything: { total: number; w: number; backup: boolean }[] = [];
const bests: number[] = [];
const f = { n: 0, gearMatch: 0, gearOver: 0, gearUnder: 0, waited: 0, rocks: 0, shieldMatch: 0, shieldOver: 0, shieldUnder: 0, lush: 0, bonus: 0, siteUse: [0, 0, 0] };
const LIMITS = [26, 27, 28, 29, 30, 31, 32, 33, 34];
const reach = LIMITS.map(() => 0);
const perCrop = new Map<string, number[]>();

for (const crop of CROP_IDS)
  for (const order of orders)
    for (const cold of LEVELS)
      for (const forecast of LEVELS)
        for (const glancing of [false, true])
          for (const bonus of ["floor", "foot", "top"] as SiteId[]) {
            const { all, best } = play({ crop, order, cold, forecast, glancing, bonus });
            // Each situation counts the same in the spread of scores.
            const sw = all.reduce((s, x) => s + x.w, 0);
            for (const x of all) everything.push({ ...x, w: x.w / sw });
            bests.push(best.expected);
            perCrop.set(crop, [...(perCrop.get(crop) ?? []), best.expected]);
            LIMITS.forEach((l, i) => (reach[i] += best.expected >= l ? 1 : 0));
            f.n++;
            f.shieldMatch += best.shield === forecast ? 1 : 0;
            f.shieldOver += best.shield > forecast ? 1 : 0;
            f.shieldUnder += best.shield < forecast ? 1 : 0;
            const rv = [best.first, ...best.second].find((tg) => tg?.task === "rover");
            const gh = [best.first, ...best.second].find((tg) => tg?.task === "greenhouse");
            if (rv) {
              f.gearMatch += rv.gear === cold ? 1 : 0;
              f.gearOver += (rv.gear ?? 0) > cold ? 1 : 0;
              f.gearUnder += (rv.gear ?? 0) < cold ? 1 : 0;
              f.waited += rv.waited ? 1 : 0;
              f.rocks += rv.sites?.length ?? 0;
              for (const i of rv.sites ?? []) f.siteUse[i]++;
              f.bonus += (rv.sites ?? []).some((i) => SITES[i].id === bonus) ? 1 : 0;
            }
            if (gh) f.lush += (gh.light ?? 0) > CROPS[crop].light ? 1 : 0;
          }

bests.sort((a, b) => a - b);
const pc = (x: number) => ((100 * x) / f.n).toFixed(0) + "%";
const r1 = (x: number) => x.toFixed(1);
lines.push(`situations: ${f.n} (crop × order × cold × forecast × direct/glancing × science rock), finished games checked: ${everything.length}`);
lines.push(`ALL games (weighted)  min ${wpct(everything, 0)}  p10 ${wpct(everything, 10)}  p25 ${wpct(everything, 25)}  median ${wpct(everything, 50)}  p75 ${wpct(everything, 75)}  p90 ${wpct(everything, 90)}  max ${wpct(everything, 100)}`);
lines.push(`BEST plan, expected score per situation  min ${r1(bests[0])}  median ${r1(bests[Math.floor(bests.length / 2)])}  max ${r1(bests[bests.length - 1])}`);
lines.push(`BEST plan: heater matches cold ${pc(f.gearMatch)}, more ${pc(f.gearOver)}, less ${pc(f.gearUnder)}; waited for Earth ${pc(f.waited)}; avg rocks ${(f.rocks / f.n).toFixed(2)}`);
lines.push(`BEST plan: sites used floor ${pc(f.siteUse[0])} foot ${pc(f.siteUse[1])} top ${pc(f.siteUse[2])}; science-team rock collected ${pc(f.bonus)}; extra light on plants ${pc(f.lush)}`);
lines.push(`BEST plan: shield matches FORECAST ${pc(f.shieldMatch)}, thicker ${pc(f.shieldOver)}, thinner ${pc(f.shieldUnder)}`);
lines.push(`share of situations where the best plan's expected score reaches: ${LIMITS.map((l, i) => `${l}+ ${pc(reach[i])}`).join("  ")}`);
const sumW = everything.reduce((s, x) => s + x.w, 0);
const share = (lim: number) => ((100 * everything.filter((x) => x.total >= lim).reduce((s, x) => s + x.w, 0)) / sumW).toFixed(1) + "%";
lines.push(`share of ALL games at: ${LIMITS.map((l) => `${l}+ ${share(l)}`).join("  ")}`);
lines.push(`games with an emergency backup: ${((100 * everything.filter((x) => x.backup).reduce((s, x) => s + x.w, 0)) / sumW).toFixed(1)}%`);
for (const crop of CROP_IDS) {
  const b = [...(perCrop.get(crop) ?? [])].sort((x, y) => x - y);
  lines.push(`best plan, crop ${CROPS[crop].name.padEnd(22)} min ${r1(b[0])} median ${r1(b[Math.floor(b.length / 2)])} max ${r1(b[b.length - 1])}`);
}
console.log(lines.join("\n"));
