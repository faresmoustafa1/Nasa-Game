// Mission ARES — game rules. Pure functions only: no React, no browser,
// no JSON imports. Every function gets the balance config as an argument,
// so the balance checker (scripts/balance.ts) runs these same rules in Node.
//
// A sol:
//   morning  beginSol: dust event, food from grow lights, sun makes power
//   day      walk + doAction, paid with Time and Power (and Air for science)
//   night    endSol: crew breathes and eats, heaters use power, flare hits,
//            plants droop, shield fades. Can't pay tonight → Mission Pause.
//   retry    retrySol: back to this morning.

import type {
  ActionDef,
  AlertDef,
  AlertThreat,
  Amounts,
  BalanceConfig,
  Check,
  DayDef,
  DayReport,
  EndResult,
  GameState,
  PauseStat,
  ReportLine,
  ResourceId,
  RoomId,
  RunInfo,
  Snapshot,
  StatId,
} from "./types";

export const RESOURCES: ResourceId[] = ["power", "air", "food"];

/** Power the panels make on a sol, after dust. */
export function solarPower(cfg: BalanceConfig, dust: number): number {
  return Math.max(0, cfg.day.solarPowerPerDay - dust * cfg.day.dustPowerLossPerLevel);
}

function snapshot(state: GameState): Snapshot {
  const { morning: _ignored, ...rest } = state;
  return structuredClone(rest);
}

/** A fresh game on the morning of `startSol`. */
export function newGame(
  cfg: BalanceConfig,
  dayOrder: string[],
  firstDay: DayDef,
  startSol = 1,
  start: Partial<BalanceConfig["start"]> = {},
): GameState {
  const s = { ...cfg.start, ...start };
  const base: GameState = {
    v: 3,
    sol: startSol,
    dayOrder,
    power: s.power,
    air: s.air,
    food: s.food,
    shield: s.shield,
    dust: s.dust,
    science: 0,
    dose: 0,
    timeLeft: cfg.day.timePoints,
    room: s.room,
    events: {},
    flags: {},
    usedToday: {},
    askedEarth: 0,
    pending: [],
    log: [],
    notebook: [],
    predictions: [],
    morning: null,
    alert: null,
  };
  // Landing day: the start values ARE this morning's power (no extra sun).
  return beginSol(cfg, base, firstDay, false).state;
}

/** Morning of `state.sol`: apply the day's event, pending gains and the sun. */
export function beginSol(
  cfg: BalanceConfig,
  state: GameState,
  day: DayDef,
  withSun: boolean,
): { state: GameState; lines: ReportLine[] } {
  const lines: ReportLine[] = [];
  const s: GameState = {
    ...state,
    timeLeft: cfg.day.timePoints,
    events: { ...day.event },
    flags: {},
    usedToday: {},
    askedEarth: 0,
    log: [],
    alert: null,
  };

  if (day.event.addDust) {
    const before = s.dust;
    s.dust = Math.min(cfg.dust.max, s.dust + day.event.addDust);
    if (s.dust !== before) lines.push({ kind: "dustAdd", change: { dust: s.dust - before } });
  }

  const due = s.pending.filter((p) => p.sol <= s.sol);
  s.pending = s.pending.filter((p) => p.sol > s.sol);
  for (const p of due) {
    const { next, change } = applyChange(cfg, s, {}, p.gain);
    Object.assign(s, next);
    if (Object.keys(change).length) lines.push({ kind: "pending", from: p.from, change });
  }

  if (withSun) {
    const sun = solarPower(cfg, s.dust);
    const before = s.power;
    s.power = Math.min(cfg.resources.power.max, s.power + sun);
    lines.push({ kind: "sun", dust: s.dust, change: { power: s.power - before } });
  }

  s.morning = snapshot(s);
  return { state: s, lines };
}

function statValue(state: GameState, stat: StatId): number {
  if (stat === "time") return state.timeLeft;
  return state[stat];
}

function statMax(cfg: BalanceConfig, stat: StatId): number {
  if (stat === "power" || stat === "air" || stat === "food") return cfg.resources[stat].max;
  if (stat === "shield") return cfg.shield.max;
  if (stat === "dust") return cfg.dust.max;
  if (stat === "time") return cfg.day.timePoints;
  return Infinity; // science and dose have no cap
}

/** Pays costs and adds gains, keeping every stat between 0 and its max. */
function applyChange(cfg: BalanceConfig, state: GameState, cost: Amounts, gain: Amounts) {
  const next = { ...state };
  const change: Amounts = {};
  const stats = new Set<StatId>([...(Object.keys(cost) as StatId[]), ...(Object.keys(gain) as StatId[])]);
  for (const stat of stats) {
    const before = statValue(state, stat);
    const raw = before - (cost[stat] ?? 0) + (gain[stat] ?? 0);
    const after = Math.max(0, Math.min(statMax(cfg, stat), raw));
    if (stat === "time") next.timeLeft = after;
    else next[stat] = after;
    if (after !== before) change[stat] = after - before;
  }
  return { next, change };
}

// ---------------------------------------------------------------------------
// Walking

export function walkCheck(cfg: BalanceConfig, state: GameState, to: RoomId): Check {
  if (to === state.room) return { ok: true };
  const need = cfg.walk.time;
  if (state.timeLeft < need) return { ok: false, reason: "noTime", stat: "time", need, have: state.timeLeft };
  return { ok: true };
}

export function walk(cfg: BalanceConfig, state: GameState, to: RoomId): GameState {
  if (to === state.room || !walkCheck(cfg, state, to).ok) return state;
  const { next, change } = applyChange(cfg, state, { time: cfg.walk.time }, {});
  next.room = to;
  next.log = [...state.log, { kind: "walk", from: state.room, to, change }];
  return next;
}

// ---------------------------------------------------------------------------
// Actions

/** Actions you can see in a room today (event-only actions appear on their day). */
export function actionsInRoom(cfg: BalanceConfig, state: GameState, room: RoomId): string[] {
  return Object.keys(cfg.actions).filter((id) => {
    const a = cfg.actions[id];
    if (a.room !== room) return false;
    if (a.needsEvent && !state.events[a.needsEvent as keyof GameState["events"]]) return false;
    return true;
  });
}

/** Cost and gain of an action right now (the slow air maker makes less air). */
export function actionDeal(cfg: BalanceConfig, state: GameState, id: string): ActionDef {
  const a = cfg.actions[id];
  if (id === "makeOxygen" && state.events.airMakerSlow && !state.flags.airMakerFixed) {
    return { ...a, gain: { ...a.gain, air: cfg.events.airMakerSlow.oxygenAirGain } };
  }
  return a;
}

/** `free` = during the alert: Time Points do not apply, only Power/Air/Food. */
export function actionCheck(cfg: BalanceConfig, state: GameState, id: string, free = false): Check {
  if (!cfg.actions[id]) return { ok: false, reason: "limit" };
  const a = actionDeal(cfg, state, id);
  if (state.room !== a.room) return { ok: false, reason: "notHere" };
  if (a.setsFlag && state.flags[a.setsFlag]) return { ok: false, reason: "fixed" };
  if ((state.usedToday[id] ?? 0) >= a.maxPerDay) return { ok: false, reason: "limit" };
  if (a.needsDust && state.dust <= 0) return { ok: false, reason: "noDust" };

  for (const [stat, need] of Object.entries(a.cost) as [StatId, number][]) {
    if (free && stat === "time") continue;
    const have = statValue(state, stat);
    if (have < need) {
      return { ok: false, reason: stat === "time" ? "noTime" : "notEnough", stat, need, have };
    }
  }

  // Block an action whose only point is a gain that is already maxed.
  const gains = Object.entries(a.gain).filter(([, n]) => (n ?? 0) > 0) as [StatId, number][];
  if (gains.length > 0 && !a.later && gains.every(([stat]) => statValue(state, stat) >= statMax(cfg, stat))) {
    return { ok: false, reason: "full", stat: gains[0][0] };
  }
  return { ok: true };
}

export function doAction(cfg: BalanceConfig, state: GameState, id: string, free = false): GameState {
  if (!actionCheck(cfg, state, id, free).ok) return state;
  const a = actionDeal(cfg, state, id);
  const cost = free ? withoutTime(a.cost) : a.cost;
  const { next, change } = applyChange(cfg, state, cost, a.gain);
  next.usedToday = { ...state.usedToday, [id]: (state.usedToday[id] ?? 0) + 1 };
  if (a.setsFlag) next.flags = { ...state.flags, [a.setsFlag]: true };
  next.pending = [
    ...state.pending,
    ...(a.later ?? []).map((l) => ({ sol: state.sol + l.inDays, gain: l.gain, from: id })),
  ];
  next.log = [...state.log, { kind: "action", id, change }];
  return next;
}

function withoutTime(a: Amounts): Amounts {
  const { time: _t, ...rest } = a;
  return rest;
}

// ---------------------------------------------------------------------------
// Alert: a countdown at the end of the plan (the UI runs the clock).
// Three problems; fixing one costs Power/Air/Food and real seconds of work.

/** Start the alert: find the problems the plan already took care of. */
export function beginAlert(state: GameState, def: AlertDef, run: RunInfo): GameState {
  const flare = flareTonight(state, run);
  const prepared = def.threats
    .filter(
      (t) =>
        !t.decoy &&
        ((t.preparedBy ?? []).some((id) => (state.usedToday[id] ?? 0) > 0) ||
          (t.preparedIf === "shieldVsFlare" && (!flare || state.shield >= flare.strength))),
    )
    .map((t) => t.id);
  return { ...state, alert: { handled: [], prepared } };
}

export function alertThreat(def: AlertDef, id: string): AlertThreat | undefined {
  return def.threats.find((t) => t.id === id);
}

export function alertTaskCheck(state: GameState, def: AlertDef, id: string): Check {
  const t = alertThreat(def, id);
  if (!t || !state.alert) return { ok: false, reason: "limit" };
  if (state.alert.handled.includes(id) || state.alert.prepared.includes(id)) return { ok: false, reason: "fixed" };
  if (state.room !== t.room) return { ok: false, reason: "notHere" };
  for (const [stat, need] of Object.entries(t.cost) as [StatId, number][]) {
    const have = statValue(state, stat);
    if (have < need) return { ok: false, reason: "notEnough", stat, need, have };
  }
  return { ok: true };
}

export function alertDoTask(cfg: BalanceConfig, state: GameState, def: AlertDef, id: string): GameState {
  if (!alertTaskCheck(state, def, id).ok || !state.alert) return state;
  const t = alertThreat(def, id)!;
  const { next } = applyChange(cfg, state, t.cost, t.gain ?? {});
  next.alert = { ...state.alert, handled: [...state.alert.handled, id] };
  return next;
}

/** Every real problem fixed or prepared? (The alert can end early.) */
export function alertAllFixed(state: GameState, def: AlertDef): boolean {
  const a = state.alert;
  if (!a) return false;
  return def.threats.every((t) => t.decoy || a.handled.includes(t.id) || a.prepared.includes(t.id));
}

/** Time's up (or all fixed): problems that were not fixed take effect now. */
export function resolveAlert(
  cfg: BalanceConfig,
  state: GameState,
  def: AlertDef,
): { state: GameState; lines: ReportLine[] } {
  const a = state.alert ?? { handled: [], prepared: [] };
  let s = state;
  const lines: ReportLine[] = [];
  for (const t of def.threats) {
    if (t.decoy) {
      const text = a.handled.includes(t.id) ? t.savedText : t.missText;
      lines.push({ kind: "alert", id: t.id, outcome: "decoy", text, change: {} });
    } else if (a.prepared.includes(t.id)) {
      lines.push({ kind: "alert", id: t.id, outcome: "prepared", text: t.preparedText ?? t.savedText, change: {} });
    } else if (a.handled.includes(t.id)) {
      lines.push({ kind: "alert", id: t.id, outcome: "saved", text: t.savedText, change: {} });
    } else {
      const { next, change } = applyChange(cfg, s, {}, t.effect);
      s = next;
      lines.push({ kind: "alert", id: t.id, outcome: "missed", text: t.missText, change });
    }
  }
  return { state: s, lines };
}

// ---------------------------------------------------------------------------
// Ask Earth (a hint that arrives late; the UI handles the wait)

export function askEarthCheck(cfg: BalanceConfig, state: GameState): Check {
  if (state.askedEarth >= cfg.askEarth.perDay) return { ok: false, reason: "limit" };
  for (const [stat, need] of Object.entries(cfg.askEarth.cost) as [StatId, number][]) {
    const have = statValue(state, stat);
    if (have < need) return { ok: false, reason: stat === "time" ? "noTime" : "notEnough", stat, need, have };
  }
  return { ok: true };
}

export function askEarth(cfg: BalanceConfig, state: GameState): GameState {
  if (!askEarthCheck(cfg, state).ok) return state;
  const { next } = applyChange(cfg, state, cfg.askEarth.cost, {});
  next.askedEarth = state.askedEarth + 1;
  return next;
}

// ---------------------------------------------------------------------------
// Night

/** What tonight will take, so the screen can show it before End Sol. */
export function tonightNeeds(cfg: BalanceConfig, state: GameState): Amounts {
  const needs: Amounts = {
    air: cfg.day.crewAirPerDay,
    food: cfg.day.crewFoodPerDay,
    power: cfg.day.nightHeatPower,
  };
  const loss = state.events.foodLossIfNoLights;
  if (loss && !(state.usedToday.growLights > 0)) needs.food = (needs.food ?? 0) + loss;
  return needs;
}

export function flareTonight(state: GameState, run: RunInfo): { cls: string; word: string; strength: number } | null {
  const f = state.events.flare;
  if (!f) return null;
  const cls = typeof f === "string" ? f : run.flareClass;
  const entry = run.flareTable[cls.charAt(0).toUpperCase()] ?? { word: "tiny", strength: 0 };
  return { cls, word: entry.word, strength: entry.strength };
}

export function goalMet(day: DayDef, state: GameState): boolean {
  if (day.goal.type === "anyAction") {
    return day.goal.actions.some((id) => (state.usedToday[id] ?? 0) > 0);
  }
  return false; // "endDay" goals tick when the sol ends safely
}

function todayLines(state: GameState): ReportLine[] {
  const lines: ReportLine[] = [];
  const walks = state.log.filter((l) => l.kind === "walk");
  const walkTime = walks.reduce((n, l) => n + (l.change.time ?? 0), 0);
  if (walks.length && walkTime) lines.push({ kind: "walked", count: walks.length, change: { time: walkTime } });
  const byAction = new Map<string, { count: number; change: Amounts }>();
  for (const l of state.log) {
    if (l.kind !== "action") continue;
    const t = byAction.get(l.id) ?? { count: 0, change: {} };
    t.count += 1;
    for (const [k, v] of Object.entries(l.change) as [StatId, number][]) t.change[k] = (t.change[k] ?? 0) + v;
    byAction.set(l.id, t);
  }
  for (const [id, t] of byAction) lines.push({ kind: "did", id, count: t.count, change: t.change });
  return lines;
}

/**
 * Ends the sol. `nextDay` is null on the last sol.
 * Rule: the base must pay tonight's needs. If it can't, Mission Pause.
 */
export function endSol(
  cfg: BalanceConfig,
  state: GameState,
  today: DayDef,
  nextDay: DayDef | null,
  run: RunInfo,
  alertLines: ReportLine[] = [],
): EndResult {
  const night: ReportLine[] = [];
  const n: GameState = { ...state };
  let paused = null as PauseStat | null;
  const pay = (stat: ResourceId, amount: number) => {
    const before = n[stat];
    n[stat] = before - amount;
    if (n[stat] < 0 && !paused) paused = stat;
    n[stat] = Math.max(0, n[stat]);
    return n[stat] - before;
  };

  night.push({ kind: "breathe", change: { air: pay("air", cfg.day.crewAirPerDay) } });
  night.push({ kind: "eat", change: { food: pay("food", cfg.day.crewFoodPerDay) } });
  night.push({ kind: "heat", change: { power: pay("power", cfg.day.nightHeatPower) } });

  const loss = state.events.foodLossIfNoLights;
  if (loss && !(state.usedToday.growLights > 0)) {
    night.push({ kind: "plantsDroop", change: { food: pay("food", loss) } });
  }

  const flare = flareTonight(state, run);
  if (flare) {
    const blocked = Math.min(n.shield, flare.strength);
    const through = flare.strength - blocked;
    n.dose += through;
    night.push({ kind: "flare", ...flare, blocked, through, change: through ? { dose: through } : {} });
    if (n.dose >= cfg.radiation.maxDose && !paused) paused = "dose";
  }

  if (n.shield > 0) {
    const before = n.shield;
    n.shield = Math.max(0, n.shield - cfg.shield.dropPerDay);
    night.push({ kind: "shieldFade", change: { shield: n.shield - before } });
  }

  const goalDone = !paused && (today.goal.type === "endDay" || goalMet(today, state));
  const report: DayReport = {
    sol: state.sol,
    dayId: today.id,
    before: {
      power: state.morning?.power ?? state.power,
      air: state.morning?.air ?? state.air,
      food: state.morning?.food ?? state.food,
    },
    after: { power: n.power, air: n.air, food: n.food },
    today: todayLines(state),
    alert: alertLines,
    night,
    tomorrow: [],
    paused,
    complete: false,
    goalDone,
  };

  if (paused) return { report, night: n, next: null };
  if (!nextDay) {
    report.complete = true;
    return { report, night: n, next: null };
  }

  const morning = beginSol(cfg, { ...n, sol: n.sol + 1 }, nextDay, true);
  report.tomorrow = morning.lines;
  return { report, night: n, next: morning.state };
}

/**
 * Can this sol still be survived from `state`? Tries every walk + action
 * combination (a few hundred states). Used after a Mission Pause: if the
 * answer is no, the player is offered to go back one more sol.
 */
export function canSurviveSol(
  cfg: BalanceConfig,
  state: GameState,
  today: DayDef,
  nextDay: DayDef | null,
  run: RunInfo,
): boolean {
  const rooms: RoomId[] = ["power", "air", "greenhouse", "shelter"];
  const seen = new Set<string>();
  const stack = [state];
  while (stack.length) {
    const s = stack.pop()!;
    const key = JSON.stringify([s.room, s.timeLeft, s.power, s.air, s.food, s.shield, s.dust, s.science, s.usedToday, s.flags]);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!endSol(cfg, s, today, nextDay, run).report.paused) return true;
    for (const r of rooms) if (r !== s.room && s.timeLeft >= cfg.walk.time) stack.push(walk(cfg, s, r));
    for (const id of actionsInRoom(cfg, s, s.room)) if (actionCheck(cfg, s, id).ok) stack.push(doAction(cfg, s, id));
  }
  return false;
}

/** Mission Pause → try this sol again from its morning. */
export function retrySol(state: GameState): GameState {
  if (!state.morning) return state;
  return { ...structuredClone(state.morning), morning: state.morning };
}

/** Is a resource low enough to warn about? (a quarter of its max or less) */
export function isLow(cfg: BalanceConfig, stat: ResourceId, value: number): boolean {
  return value <= Math.floor(cfg.resources[stat].max / 4);
}
