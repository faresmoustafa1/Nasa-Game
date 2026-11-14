// Mission ARES — how cold it is at Jezero, from real NASA Perseverance (MEDA weather station) readings.
//
// There is no public live weather feed for Jezero, so the game picks at random from five real
// readings (never the same one twice in a row), like the storm's saved DONKI events. The reading picks how cold today is; the player picks the gear.
//   cold level 1 mild (−40 °C or warmer), 2 cold (−40 to −70 °C), 3 freezing (below −70 °C)
//   gear       the suit and rover heater: 1 low (Power −1), 2 medium (Power −2), 3 high (Power −3)
// Gear weaker than the cold: the battery is cold, so each rover sample costs +1 Power per level short,
// AND the crew gets cold (crew −1): saving heater Power is never free.
// Gear stronger than needed works fine, it just used more Power than it had to.

import { CREW_MAX, addDecision, applySteps } from "../game/state";
import type { GameState, Level } from "../game/state";
import { pickNoRepeat } from "../game/random";

export type Reading = {
  id: string;
  /** Air temperature in °C. */
  temp: number;
  /** When it was measured, for the card. */
  when: string;
};

export const WEATHER_SOURCE =
  "NASA/JPL · NASA's First Weather Report From Jezero Crater on Mars (April 6, 2021) · jpl.nasa.gov/news/nasas-first-weather-report-from-jezero-crater-on-mars; average: Rodriguez-Manfredi et al., The diverse meteorology of Jezero crater over the first 250 sols of Perseverance (Nature Geoscience, 2023), NASA's MEDA team";

export const SAVED_READINGS: Reading[] = [
  { id: "start", temp: -20, when: "Feb 19, 2021 (the very first reading on Mars)" },
  { id: "first", temp: -26, when: "Feb 19, 2021, 30 minutes later (it dropped to −25.6 °C)" },
  { id: "high", temp: -22, when: "Afternoon high on April 3–4, 2021 (sols 43–44)" },
  { id: "average", temp: -55, when: "Jezero's average air temperature (MEDA, first 250 sols)" },
  { id: "night", temp: -83, when: "Night low on April 3–4, 2021 (sols 43–44)" },
];

export const coldLevel = (temp: number): Level => (temp >= -40 ? 1 : temp >= -70 ? 2 : 3);
export const COLD_NAME: Record<Level, string> = { 1: "mild", 2: "cold", 3: "freezing" };

export const GEAR: Record<Level, { name: string; power: number }> = {
  1: { name: "Low heat", power: 1 },
  2: { name: "Medium heat", power: 2 },
  3: { name: "High heat", power: 3 },
};

/** Extra Power per sample when the gear is weaker than the cold. */
export const coldExtra = (cold: Level, gear: Level) => Math.max(0, cold - gear);

/** Crew points lost when the gear is weaker than the cold (a cold, shivering crew). */
export const COLD_CREW = 1;

/** Pay for the heater. Too weak for the cold: the crew gets cold (crew −1), and each sample will cost more Power. */
export function applyGear(game: GameState, reading: Reading, level: Level): GameState {
  const cold = coldLevel(reading.temp);
  const g = GEAR[level];
  const paid = applySteps(game, [{ key: "power", delta: -g.power, at: 0 }]);
  const short = coldExtra(cold, level);
  const crew = short ? Math.max(0, Math.min(CREW_MAX, paid.crew - COLD_CREW)) : paid.crew;
  const line = `Garage: ${reading.temp} °C (${COLD_NAME[cold]}), picked ${g.name.toLowerCase()}${short ? `, crew got cold (−${COLD_CREW}), cold battery +${short} Power per sample` : ""}`;
  return addDecision(
    { ...paid, crew, log: [...paid.log, line] },
    {
      what: `Garage heater: ${g.name.toLowerCase()}`,
      effect: `Power −${g.power}${short ? `, too cold: crew −${COLD_CREW}, each sample +${short} Power` : level > cold ? ", warm (more heat than needed)" : ", the crew and battery stay warm"}`,
      mark: short ? "cost" : "ok",
    },
  );
}

/** A random saved reading, never the same one twice in a row. Dev: ?cold=mild|cold|freezing picks one of each level. */
export function nextReading(): Reading {
  if (import.meta.env.DEV) {
    const i = ["mild", "cold", "freezing"].indexOf(new URLSearchParams(window.location.search).get("cold") ?? "");
    if (i >= 0) return SAVED_READINGS[[1, 3, 4][i]];
  }
  const id = pickNoRepeat("cold", SAVED_READINGS.map((r) => r.id));
  return SAVED_READINGS.find((r) => r.id === id) ?? SAVED_READINGS[0];
}
