// Mission ARES — shared game types.
// The numbers live in src/data/balance.json, the words in src/data/*.json.

export type ResourceId = "power" | "air" | "food";
export type RoomId = "power" | "air" | "greenhouse" | "shelter";
export type StatId = ResourceId | "time" | "shield" | "dust" | "science";

/** A set of changes, e.g. { power: 3, time: 1 }. */
export type Amounts = Partial<Record<StatId, number>>;

export type ActionDef = {
  room: RoomId;
  maxPerDay: number;
  /** Only possible while there is dust on the panels. */
  needsDust?: boolean;
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
  actions: Record<string, ActionDef>;
};

export type DayGoal =
  | { type: "anyAction"; actions: string[] }
  | { type: "endDay" };

export type DayDef = {
  id: string;
  slot: "first" | "shuffle" | "last";
  icon: string;
  title: string;
  todo: string;
  briefing: string;
  teaches: string;
  showRadiation: boolean;
  event: Record<string, number | boolean>;
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

/** A gain that is waiting for a later sol. */
export type PendingGain = { sol: number; gain: Amounts; from: string };

/** One thing the player did today (feeds the Day Report in Step 3). */
export type LogEntry =
  | { kind: "walk"; from: RoomId; to: RoomId; change: Amounts }
  | { kind: "action"; id: string; change: Amounts };

export type GameState = {
  /** Save format version. Bump it when this shape changes. */
  v: 1;
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
  timeLeft: number;
  room: RoomId;
  /** How many times each action was used this sol. */
  usedToday: Record<string, number>;
  pending: PendingGain[];
  log: LogEntry[];
};

export type ReasonId =
  | "noTime"
  | "notEnough"
  | "full"
  | "limit"
  | "notHere"
  | "noDust";

/** Can the player do this? If not, why, in words the screen can show. */
export type Check =
  | { ok: true }
  | { ok: false; reason: ReasonId; stat?: StatId; need?: number; have?: number };
