// Mission ARES — game rules. Pure functions only: no React, no browser,
// no JSON imports. Every function gets the balance config as an argument,
// so the Step 3 balance checker can run these same rules in Node.
//
// Step 2 covers: new game, walking, doing an action.
// Step 3 adds: ending the sol (solar power, crew use, pending gains,
// day report, Mission Pause and retry).

import type {
  ActionDef,
  Amounts,
  BalanceConfig,
  Check,
  DayDef,
  GameState,
  ResourceId,
  RoomId,
  StatId,
} from "./types";

const RESOURCES: ResourceId[] = ["power", "air", "food"];

/** Power the panels make on a sol, after dust. */
export function solarPower(cfg: BalanceConfig, dust: number): number {
  return Math.max(0, cfg.day.solarPowerPerDay - dust * cfg.day.dustPowerLossPerLevel);
}

export function newGame(cfg: BalanceConfig, dayOrder: string[], startSol = 1): GameState {
  const s = cfg.start;
  return {
    v: 1,
    sol: startSol,
    dayOrder,
    power: s.power,
    air: s.air,
    food: s.food,
    shield: s.shield,
    dust: s.dust,
    science: 0,
    timeLeft: cfg.day.timePoints,
    room: s.room,
    usedToday: {},
    pending: [],
    log: [],
  };
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
  return Infinity; // science has no cap
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

export function actionsInRoom(cfg: BalanceConfig, room: RoomId): string[] {
  return Object.keys(cfg.actions).filter((id) => cfg.actions[id].room === room);
}

export function actionCheck(cfg: BalanceConfig, state: GameState, id: string): Check {
  const a: ActionDef | undefined = cfg.actions[id];
  if (!a) return { ok: false, reason: "limit" };
  if (state.room !== a.room) return { ok: false, reason: "notHere" };
  if ((state.usedToday[id] ?? 0) >= a.maxPerDay) return { ok: false, reason: "limit" };
  if (a.needsDust && state.dust <= 0) return { ok: false, reason: "noDust" };

  for (const [stat, need] of Object.entries(a.cost) as [StatId, number][]) {
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

export function doAction(cfg: BalanceConfig, state: GameState, id: string): GameState {
  if (!actionCheck(cfg, state, id).ok) return state;
  const a = cfg.actions[id];
  const { next, change } = applyChange(cfg, state, a.cost, a.gain);
  next.usedToday = { ...state.usedToday, [id]: (state.usedToday[id] ?? 0) + 1 };
  next.pending = [
    ...state.pending,
    ...(a.later ?? []).map((l) => ({ sol: state.sol + l.inDays, gain: l.gain, from: id })),
  ];
  next.log = [...state.log, { kind: "action", id, change }];
  return next;
}

// ---------------------------------------------------------------------------
// The day's to-do

export function goalMet(day: DayDef, state: GameState): boolean {
  if (day.goal.type === "anyAction") {
    return day.goal.actions.some((id) => (state.usedToday[id] ?? 0) > 0);
  }
  return false; // "endDay" goals tick in the Day Report (Step 3)
}

/** Is a resource low enough to warn about? (a quarter of its max or less) */
export function isLow(cfg: BalanceConfig, stat: ResourceId, value: number): boolean {
  return value <= Math.floor(cfg.resources[stat].max / 4);
}

export { RESOURCES };
