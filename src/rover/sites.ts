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
  /** What kind of rock is there, shown on the map so the player can match it to Mission Control's request. */
  rock: string;
};

export const BASE_POS = { x: 1250, y: 650 };

export const SITES: Site[] = [
  { id: "floor", name: "Crater floor", climb: "Flat", base: 2, points: 4, x: 1010, y: 560, blurb: "Flat ground close to the base. Rock made from hot lava.", rock: "LAVA rock" },
  { id: "foot", name: "Delta foot", climb: "Gentle climb", base: 3, points: 6, x: 650, y: 620, blurb: "Where the old river met the lake: rock made of lake mud. A gentle climb.", rock: "LAKE MUD rock" },
  { id: "top", name: "Delta top", climb: "Steep climb", base: 4, points: 7, x: 370, y: 480, blurb: "Up on the delta: rock made of sand the river carried from far away. A steep climb.", rock: "RIVER SAND rock" },
];

/** Power for one sample: the site's cost, +1 if the crew is tired (2 faces or fewer), + the cold-battery extra, −1 with Earth's advice, never below 1. */
export function sampleCost(site: Site, tired: boolean, advice: boolean, cold = 0): number {
  return Math.max(1, site.base + (tired ? 1 : 0) + cold - (advice ? 1 : 0));
}

/** Samples the dust storm allows: 3 if the rover goes first, 2 if second, one less if you waited for Earth. */
export function sampleCap(first: boolean, waited: boolean): number {
  return Math.max(1, (first ? 3 : 2) - (waited ? 1 : 0));
}

/**
 * Mission Control's science request: each game the team needs one kind of rock, for a real NASA reason.
 * The map does not mark the place: the player matches the rock word (LAVA, LAKE MUD, RIVER SAND) to a site.
 * Bringing that rock home is worth MISSION_POINTS extra (a game value; the balance check in src/sim covers it).
 * (The game state still calls the needed site `bonusSite`.)
 */
export const MISSION_POINTS = 2;

export type Mission = { site: SiteId; need: string; title: string; text: string; source: string };

export const MISSIONS: Record<SiteId, Mission> = {
  floor: {
    site: "floor",
    need: "LAVA rock",
    title: "Science team: we need LAVA rock!",
    text: "We want to know WHEN the lake was here. Rock made from hot lava has tiny crystals that work like a clock: scientists can tell its age. Where is the LAVA rock?",
    source: "NASA Science · Perseverance science highlights: igneous rocks on the crater floor",
  },
  foot: {
    site: "foot",
    need: "LAKE MUD rock",
    title: "Science team: we need LAKE MUD rock!",
    text: "We are looking for signs of ancient life. Mud that settled in a lake traps tiny clues, and NASA found the most organic matter of the mission in a lake-mud rock. Where is the LAKE MUD rock?",
    source: "NASA · Perseverance Rover Investigates Geologically Rich Mars Terrain (Sept 15, 2022): Wildcat Ridge",
  },
  top: {
    site: "top",
    need: "RIVER SAND rock",
    title: "Science team: we need RIVER SAND rock!",
    text: "We want pieces of places the rover can never reach. The old river carried sand and rock bits from far outside the crater. Where is the RIVER SAND rock?",
    source: "NASA · Perseverance Rover Investigates Geologically Rich Mars Terrain (Sept 15, 2022): Skinner Ridge",
  },
};

/** The rock the team needs, never the same as last game's in this tab. Dev: ?rock=floor|foot|top. */
export function pickBonusSite(): SiteId {
  const ids: SiteId[] = ["floor", "foot", "top"];
  if (import.meta.env.DEV) {
    const f = new URLSearchParams(window.location.search).get("rock") as SiteId | null;
    if (f && ids.includes(f)) return f;
  }
  return pickNoRepeat("rock", ids);
}

/** Points for a rock from this site: its own points, plus the mission points if it is the rock the team needs. */
export const rockValue = (site: Site, missionSite: SiteId) => site.points + (site.id === missionSite ? MISSION_POINTS : 0);
