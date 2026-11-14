// Mission ARES — the greenhouse rules (Phase 5).
//
// The player waters the plants (0–3 drops, 1 Water each) and sets the lamp (0–3, 1 Power per step).
// Each game has a different real space-grown crop (crops.ts) with its own Water and Light needs.
// If the greenhouse is the SECOND job, the crop needs 1 more Water ("plants grow best when planted early").
// Water locked in the shelter walls cannot be used.
//   too little        wilt   crew −1, no harvest
//   enough            grow   the crop's harvest (3–6)
//   one extra of both lush   a bigger harvest, crew +1 (not for every crop, and out of reach when the tank or lamp cannot go higher)

import { CREW_MAX, applySteps } from "../game/state";
import type { GameState } from "../game/state";
import { CROPS } from "./crops";
import type { Crop } from "./crops";

export const WATER_MAX = 3;
export const LIGHT_MAX = 3;

export type Outcome = "wilt" | "grow" | "lush";

/** Water the crop needs: its own number, plus 1 if the greenhouse is the second job. */
export const needWater = (crop: Crop, first: boolean) => crop.water + (first ? 0 : 1);

/** Lush needs one more of each. It only exists when the crop has a lush harvest and the tank and lamp can reach it. */
export const canBeLush = (crop: Crop, first: boolean) => crop.lush !== null && needWater(crop, first) + 1 <= WATER_MAX && crop.light + 1 <= LIGHT_MAX;

export function outcomeOf(crop: Crop, water: number, light: number, first: boolean): Outcome {
  const nw = needWater(crop, first);
  if (water < nw || light < crop.light) return "wilt";
  if (canBeLush(crop, first) && water >= nw + 1 && light >= crop.light + 1) return "lush";
  return "grow";
}

export const resultOf = (crop: Crop, out: Outcome): { crew: number; harvest: number; label: string } =>
  out === "wilt" ? { crew: -1, harvest: 0, label: "Wilted" } : out === "grow" ? { crew: 0, harvest: crop.grow, label: "Healthy" } : { crew: 1, harvest: crop.lush ?? crop.grow, label: "Lush" };

/** How much of each the player may use now: water that is not locked, power on the tablet. */
export const waterAvailable = (game: GameState) => Math.min(WATER_MAX, Math.max(0, game.meters.water - game.locked));
export const lightAvailable = (game: GameState) => Math.min(LIGHT_MAX, Math.max(0, game.meters.power));

/** Pay for the water and light, then add the harvest and the crew's mood. */
export function applyGreenhouse(game: GameState, water: number, light: number): GameState {
  const first = game.tasks.length === 0;
  const crop = CROPS[game.crop];
  const out = outcomeOf(crop, water, light, first);
  const r = resultOf(crop, out);
  const paid = applySteps(game, [
    { key: "water", delta: -water, at: 0 },
    { key: "power", delta: -light, at: 0 },
  ]);
  const crew = Math.max(0, Math.min(CREW_MAX, paid.crew + r.crew));
  const line = `Greenhouse (${crop.name.toLowerCase()}): water ${water}, light ${light} → ${r.label.toLowerCase()} plants${r.harvest ? `, harvest ${r.harvest}` : ""}`;
  return { ...paid, crew, harvest: paid.harvest + r.harvest, log: [...paid.log, line] };
}
