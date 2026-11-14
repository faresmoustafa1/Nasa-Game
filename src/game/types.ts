// Mission ARES — shared game types.
// The numbers live in src/data/balance.json, the words in src/data/*.json.

export type ResourceId = "power" | "air" | "food";
export type RoomId = "power" | "air" | "greenhouse" | "shelter";
export type StatId = ResourceId | "time" | "shield" | "dust" | "science" | "dose";

/** A set of changes, e.g. { power: 3, time: 1 }. */
export type Amounts = Partial<Record<StatId, number>>;

export type ActionDef = {
  room: RoomId;
  maxPerDay: number;
  /** Only possible while there is dust on the panels. */
  needsDust?: boolean;
  /** Only shows up on a sol with this event (e.g. "airMakerSlow"). */
  needsEvent?: string;
  /** Sets a flag for the rest of the sol (e.g. "airMakerFixed"). */
  setsFlag?: string;
  cost: Amounts;
  gain: Amounts;
  /** Gains that arrive on a later sol (e.g. food from grow lights). */
  later?: { inDays: number; gain: Amounts }[];
};

export type BalanceConfig = {
  resources: Record<ResourceId, { max: number }>;
  start: {
    power: number;
    air: number;
    food: number;
    shield: number;
    dust: number;
    room: RoomId;
  };
  day: {
    timePoints: number;
    solarPowerPerDay: number;
    dustPowerLossPerLevel: number;
    crewAirPerDay: number;
    crewFoodPerDay: number;
    nightHeatPower: number;
  };
  walk: { time: number };
  shield: { max: number; dropPerDay: number };
  dust: { max: number };
  radiation: { maxDose: number };
  events: {
    airMakerSlow: { oxygenAirGain: number };
  };
  askEarth: { perDay: number; cost: Amounts; waitSeconds: number };
  actions: Record<string, ActionDef>;
};

export type DayGoal =
  | { type: "anyAction"; actions: string[] }
  | { type: "endDay" };

export type DayEvent = {
  /** Dust added in the morning. */
  addDust?: number;
  /** A flare tonight: true = this run's flare (DONKI), or a class letter like "C". */
  flare?: boolean | string;
  /** Food lost tonight if the grow lights were not used today. */
  foodLossIfNoLights?: number;
  airMakerSlow?: boolean;
  lateMessage?: boolean;
};

export type DayDef = {
  id: string;
  slot: "first" | "shuffle" | "last";
  icon: string;
  title: string;
  todo: string;
  briefing: string;
  hint: string;
  teaches: string;
  showRadiation: boolean;
  event: DayEvent;
  goal: DayGoal;
  predict: {
    question: string;
    options: { id: string; pic: string; text: string }[];
    answer: string;
  };
  debrief: { why: string };
  factIds: string[];
  glossary: string[];
  discussion: string;
};

// ---------------------------------------------------------------------------
// Alerts (src/data/alerts.json)

export type AlertThreat = {
  id: string;
  room: RoomId;
  task: string;
  /** Real seconds of work to fix it. */
  work: number;
  cost: Amounts;
  /** Extra gain when fixed (e.g. +1 shield). */
  gain?: Amounts;
  /** What happens if it is not fixed by the end of the alert. */
  effect: Amounts;
  /** Already fixed if one of these actions was done in the plan. */
  preparedBy?: string[];
  /** Already fixed if this is true when the alert starts. */
  preparedIf?: "shieldVsFlare";
  preparedText?: string;
  /** Old advice: fixing it does nothing useful (Sol 6). */
  decoy?: boolean;
  missText: string;
  savedText: string;
};

export type AlertDef = {
  title: string;
  duration: number;
  problem: string;
  goal: string;
  afterNote?: string;
  threats: AlertThreat[];
};

export type AlertsConfig = {
  actionWorkSeconds: number;
  reactionSlackSeconds: number;
  days: Record<string, AlertDef>;
};

/** Alert progress, while the alert runs. */
export type AlertState = { handled: string[]; prepared: string[] };

/** A gain that is waiting for a later sol. */
export type PendingGain = { sol: number; gain: Amounts; from: string };

/** One thing the player did today. */
export type LogEntry =
  | { kind: "walk"; from: RoomId; to: RoomId; change: Amounts }
  | { kind: "action"; id: string; change: Amounts };

export type Prediction = { sol: number; dayId: string; choice: string; right: boolean };

export type GameState = {
  /** Save format version. Bump it when this shape changes. */
  v: 3;
  /** Which mission day it is, 1-based. */
  sol: number;
  /** Day ids in play order (Step 8 shuffles the middle ones). */
  dayOrder: string[];
  power: number;
  air: number;
  food: number;
  shield: number;
  dust: number;
  science: number;
  /** Radiation the crew has taken in so far (Mission Pause at radiation.maxDose). */
  dose: number;
  timeLeft: number;
  room: RoomId;
  /** Today's event, copied from the day in the morning. */
  events: DayEvent;
  /** Things fixed today, e.g. { airMakerFixed: true }. */
  flags: Record<string, boolean>;
  /** How many times each action was used this sol. */
  usedToday: Record<string, number>;
  askedEarth: number;
  pending: PendingGain[];
  log: LogEntry[];
  /** Mars Notebook: fact ids collected. */
  notebook: string[];
  predictions: Prediction[];
  /** The state at the start of this sol, for "Retry this sol". */
  morning: Snapshot | null;
  /** Set while the alert runs (and until the sol ends). */
  alert: AlertState | null;
};

export type Snapshot = Omit<GameState, "morning">;

/** Per-run info that is not in balance.json (from NASA data or the mode). */
export type RunInfo = {
  /** Flare class for "flare: true" days, e.g. "M2.4". */
  flareClass: string;
  flareTable: Record<string, { word: string; strength: number }>;
};

export type ReportLine =
  | { kind: "did"; id: string; count: number; change: Amounts }
  | { kind: "walked"; count: number; change: Amounts }
  | { kind: "breathe"; change: Amounts }
  | { kind: "eat"; change: Amounts }
  | { kind: "heat"; change: Amounts }
  | { kind: "plantsDroop"; change: Amounts }
  | { kind: "flare"; cls: string; word: string; strength: number; blocked: number; through: number; change: Amounts }
  | { kind: "shieldFade"; change: Amounts }
  | { kind: "sun"; dust: number; change: Amounts }
  | { kind: "pending"; from: string; change: Amounts }
  | { kind: "dustAdd"; change: Amounts }
  | { kind: "alert"; id: string; outcome: "saved" | "prepared" | "missed" | "decoy"; text: string; change: Amounts };

export type PauseStat = "air" | "food" | "power" | "dose";

export type DayReport = {
  sol: number;
  dayId: string;
  /** Bars at the start of the sol and after the night. */
  before: { power: number; air: number; food: number };
  after: { power: number; air: number; food: number };
  today: ReportLine[];
  /** What the alert fixed or missed. */
  alert: ReportLine[];
  night: ReportLine[];
  /** What tomorrow morning brings (sun, food from grow lights, dust). */
  tomorrow: ReportLine[];
  paused: PauseStat | null;
  complete: boolean;
  goalDone: boolean;
};

export type EndResult = {
  report: DayReport;
  /** The base after the night (bars dropped). */
  night: GameState;
  /** Tomorrow morning, or null if paused or the mission is over. */
  next: GameState | null;
};

export type ReasonId =
  | "noTime"
  | "notEnough"
  | "full"
  | "limit"
  | "notHere"
  | "noDust"
  | "fixed";

/** Can the player do this? If not, why, in words the screen can show. */
export type Check =
  | { ok: true }
  | { ok: false; reason: ReasonId; stat?: StatId; need?: number; have?: number };
