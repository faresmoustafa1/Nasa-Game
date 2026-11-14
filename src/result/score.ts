// Mission ARES — the final score and badge.
//
//   score = rock points + harvest + crew + what is left (Power + Water + Air) − emergency-backup penalty
// Everyone gets a badge: there is no "fail". The limits come from the balance check (npm run balance), which plays
// every possible set of choices: scores run 17–39, and the best plan's expected score in any situation is 31–39, so
// Gold (31+) can always be reached by good choices (about 10% of random play), Silver (27+) is about half of random
// play, everyone else gets Bronze.

import { METER_LABEL } from "../game/state";
import type { GameState } from "../game/state";

export type Score = {
  rocks: number;
  harvest: number;
  crew: number;
  leftover: number;
  penalty: number;
  total: number;
};

export function scoreOf(g: GameState): Score {
  const leftover = g.meters.power + g.meters.water + g.meters.air;
  const total = g.rockPoints + g.harvest + g.crew + leftover - g.penalty;
  return { rocks: g.rockPoints, harvest: g.harvest, crew: g.crew, leftover, penalty: g.penalty, total };
}

export type Badge = { id: "gold" | "silver" | "bronze"; name: string; min: number; color: string; rim: string; line: string };

export const BADGES: Badge[] = [
  { id: "gold", name: "Gold · Mars Commander", min: 31, color: "#ffd84a", rim: "#b98a10", line: "Amazing! Your crew is safe, fed and full of discoveries." },
  { id: "silver", name: "Silver · Mars Pioneer", min: 27, color: "#d6deee", rim: "#8a97b0", line: "Great job! Your outpost made it through the storm." },
  { id: "bronze", name: "Bronze · Mars Explorer", min: -999, color: "#e0a070", rim: "#9a5f30", line: "You made it! Try again and see what else you can discover." },
];

export const badgeOf = (total: number): Badge => BADGES.find((b) => total >= b.min) ?? BADGES[BADGES.length - 1];

/** What is left on each meter, for the result screen. */
export const leftoverLines = (g: GameState) => (["power", "water", "air"] as const).map((k) => ({ label: METER_LABEL[k], value: g.meters[k] }));
