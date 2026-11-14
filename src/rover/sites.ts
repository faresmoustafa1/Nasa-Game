// Mission ARES — the three sample sites on the map. Elevation is real in spirit (the delta is higher
// than the crater floor) and drawn by hand: no map images. A climb costs more Power.

import { pickNoRepeat } from "../game/random";

export type SiteId = "floor" | "foot" | "top";

export type Site = {
  id: SiteId;
  name: string;
  /** Flat, gentle or steep: shown on the map. */
  climb: string;
  /** Power cost of one sample here, before the tired-crew and Earth-advice changes. */
  base: number;
  /** Points the rock from here is worth. The best rocks (old river mud) are up on the delta. */
  points: number;
  /** Where it is on the 1600 × 900 map. */
  x: number;
  y: number;
  blurb: string;
};

export const BASE_POS = { x: 1250, y: 650 };

export const SITES: Site[] = [
  { id: "floor", name: "Crater floor", climb: "Flat", base: 2, points: 4, x: 1010, y: 560, blurb: "Flat ground close to the base. Easy and cheap, but plain old rocks." },
  { id: "foot", name: "Delta foot", climb: "Gentle climb", base: 3, points: 6, x: 650, y: 620, blurb: "Where the old river met the lake: layers of old mud. A gentle climb." },
  { id: "top", name: "Delta top", climb: "Steep climb", base: 4, points: 7, x: 370, y: 480, blurb: "Up on the delta: the best rocks for finding signs of life. A steep climb." },
];

/** Power for one sample: the site's cost, +1 if the crew is tired (2 faces or fewer), + the cold-battery extra, −1 with Earth's advice, never below 1. */
export function sampleCost(site: Site, tired: boolean, advice: boolean, cold = 0): number {
  return Math.max(1, site.base + (tired ? 1 : 0) + cold - (advice ? 1 : 0));
}

/** Samples the dust storm allows: 3 if the rover goes first, 2 if second, one less if you waited for Earth. */
export function sampleCap(first: boolean, waited: boolean): number {
  return Math.max(1, (first ? 3 : 2) - (waited ? 1 : 0));
}

/** Bonus points for the interesting rock Mission Control spots (a game value; Phase 7 balances it). */
export const BONUS_POINTS = 2;

/** A random site for the interesting rock, never the same as last game's in this tab. Dev: ?rock=floor|foot|top. */
export function pickBonusSite(): SiteId {
  const ids: SiteId[] = ["floor", "foot", "top"];
  if (import.meta.env.DEV) {
    const f = new URLSearchParams(window.location.search).get("rock") as SiteId | null;
    if (f && ids.includes(f)) return f;
  }
  return pickNoRepeat("rock", ids);
}

/** Points for a rock from this site: its own points, plus the bonus if it is the interesting one. */
export const rockValue = (site: Site, bonusSite: SiteId) => site.points + (site.id === bonusSite ? BONUS_POINTS : 0);
