// Mission ARES — the solar storm's real data, from NASA DONKI (Space Weather Database Of Notifications,
// Knowledge, Information). One call asks for the Sun's recent eruptions (CMEs, coronal mass ejections) and flares.
// NASA's WSA-Enlil model, stored in DONKI with each CME, predicts which planets and spacecraft the cloud will
// reach; the game prefers a cloud that the model says reaches MARS, and shows the predicted arrival.
// If NASA is slow, down, or the key is over its limit, the game uses one of three saved REAL events instead.
// The kid never waits.
//
//   Live key:  put VITE_NASA_API_KEY=your_key in a .env.local file (free at https://api.nasa.gov; .env.local is
//              never committed). Without one the game uses NASA's shared DEMO_KEY, which is often rate-limited,
//              so the saved events will show up. That is fine: it is what they are for.
//              Note: a VITE_ key is built into the page, so anyone who opens the game can read it. That is normal
//              for a free api.nasa.gov key (it only has a rate limit); never put a secret key here.
//   Dev only:  ?storm=small|medium|big forces a saved event, ?live=0 skips the live call.
//
// The FORECAST is the real data: the cloud's speed (and any proton event) sets the forecast size. How the storm
// really turns out is a game rule (stormLevel below): real forecasts can be off, so it can be one size bigger or
// smaller. That is listed under "Made up for the game" on the Data Sources screen.

import { JUDGE_STORM_INDEX, isJudge, judgeLive } from "../game/judge";
import { seededRandom } from "../game/random";
import type { Level } from "../game/state";

export type StormEvent = {
  /** DONKI activityID, e.g. "2024-10-09T02:12:00-CME-001". */
  id: string;
  /** Day of the eruption, YYYY-MM-DD. */
  date: string;
  /** Cloud speed in km/s (the CME's most accurate DONKI analysis). */
  speed: number;
  /** DONKI linked a solar energetic particle (proton) event to it. */
  sep: boolean;
  /** Strongest linked flare, e.g. "X1.8", or null. */
  flare: string | null;
  /** True if fetched live just now. */
  live: boolean;
  /** NASA's WSA-Enlil model predicted that this cloud reaches Mars. */
  marsHit: boolean;
  /** Predicted arrival at Mars (ISO time), when marsHit. */
  arrival: string | null;
  /** The model predicted only a glancing blow (the edge of the cloud) at Mars. */
  glancing: boolean;
  /** The event's page on NASA's DONKI website. */
  link: string | null;
};

/**
 * Three real events, copied from DONKI (speed, linked flares and proton events, and the WSA-Enlil Mars arrival),
 * one of each size. All three were predicted to reach Mars.
 */
export const SAVED_EVENTS: StormEvent[] = [
  {
    id: "2026-10-25T19:24:00-CME-001",
    date: "2026-10-25",
    speed: 275,
    sep: false,
    flare: null,
    live: false,
    marsHit: true,
    arrival: "2026-11-01T01:00Z",
    glancing: false,
    link: "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/49246/-1",
  },
  {
    id: "2025-06-06T11:12:00-CME-001",
    date: "2025-06-06",
    speed: 758,
    sep: false,
    flare: null,
    live: false,
    marsHit: true,
    arrival: "2025-06-09T22:00Z",
    glancing: true,
    link: "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/39307/-1",
  },
  {
    id: "2024-10-09T02:12:00-CME-001",
    date: "2024-10-09",
    speed: 1509,
    sep: true,
    flare: "X1.8",
    live: false,
    marsHit: true,
    arrival: "2024-10-12T14:48Z",
    glancing: false,
    link: "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/33873/-1",
  },
];

/** The FORECAST size: under 500 km/s small, 500–1000 medium, over 1000 (or any proton event) big. */
export function levelOf(e: StormEvent): Level {
  if (e.sep || e.speed > 1000) return 3;
  if (e.speed >= 500) return 2;
  return 1;
}

/**
 * A big (M or X class) flare: its light and its fastest particles reach Mars within minutes, long before
 * Earth can measure the cloud, work out a forecast and send it (a message alone takes 4 to 24 minutes).
 * The crew has to decide without a forecast.
 */
export const messageLost = (e: StormEvent) => !!e.flare && /^[MX]/.test(e.flare);

/** Chances that the storm turns out one size bigger or smaller than forecast (game values). A glancing blow is more likely to be smaller. */
export const FORECAST_MISS = {
  direct: { bigger: 0.25, smaller: 0.15 },
  glancing: { bigger: 0.1, smaller: 0.3 },
} as const;

/** The odds for one forecast: [smaller, as forecast, bigger], each 0–1. Used by the game and the balance check. */
export function missOdds(forecast: Level, glancing: boolean): [number, number, number] {
  const m = glancing ? FORECAST_MISS.glancing : FORECAST_MISS.direct;
  const smaller = forecast > 1 ? m.smaller : 0;
  const bigger = forecast < 3 ? m.bigger : 0;
  return [smaller, 1 - smaller - bigger, bigger];
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * How big the storm really is when it arrives. The same event always turns out the same way (seeded by its ID),
 * so a replay or a judge sees the same result. Judge Mode: always exactly as forecast.
 */
export function stormLevel(e: StormEvent): Level {
  const forecast = levelOf(e);
  if (isJudge() || messageLost(e)) return forecast;
  const [smaller, same] = missOdds(forecast, e.glancing);
  const r = seededRandom(hash(e.id))();
  if (r < smaller) return (forecast - 1) as Level;
  if (r < smaller + same) return forecast;
  return (forecast + 1) as Level;
}

const BASE = "https://api.nasa.gov/DONKI";

type RawImpact = { location?: string; arrivalTime?: string; isGlancingBlow?: boolean };
type RawCme = {
  activityID?: string;
  startTime?: string;
  link?: string;
  note?: string;
  cmeAnalyses?: { isMostAccurate?: boolean; speed?: number | null; enlilList?: { impactList?: RawImpact[] | null }[] | null }[] | null;
  linkedEvents?: { activityID?: string }[] | null;
};
type RawFlr = { flrID?: string; classType?: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Flare classes the CME's note names as a flare, e.g. "The source is a C1.3 flare" (not the coronagraph names "C2/C3"). */
export function flaresInNote(note: string | undefined): string[] {
  return [...(note ?? "").matchAll(/\b([ABCMX]\d+(?:\.\d+)?)(?:-class)?\s+flare/gi)].map((m) => m[1].toUpperCase());
}

/** Ranks "X1.8" above "M5.0" above "C9.9". */
function flareRank(c: string) {
  return "ABCMX".indexOf(c[0]) * 100 + (parseFloat(c.slice(1)) || 0);
}

/**
 * Asks DONKI for the last 30 days. Picks at random among the clouds NASA's model says reach Mars.
 * Returns null (so the game uses a saved real event) if none reached Mars, or NASA is slow, offline,
 * over its limit, or sends odd data. Gives up after `timeoutMs`.
 */
export async function fetchLiveEvent(timeoutMs = 2500): Promise<StormEvent | null> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const key = import.meta.env.VITE_NASA_API_KEY || "DEMO_KEY";
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 86_400_000);
    const q = `startDate=${iso(start)}&endDate=${iso(end)}&api_key=${key}`;
    const [cmeRes, flrRes] = await Promise.all([fetch(`${BASE}/CME?${q}`, { signal: ctl.signal }), fetch(`${BASE}/FLR?${q}`, { signal: ctl.signal })]);
    if (!cmeRes.ok) return null;
    const cmes: unknown = await cmeRes.json();
    const flrs: unknown = flrRes.ok ? await flrRes.json() : [];
    if (!Array.isArray(cmes)) return null;

    const flareClass = new Map<string, string>();
    if (Array.isArray(flrs)) for (const f of flrs as RawFlr[]) if (f.flrID && f.classType) flareClass.set(f.flrID, f.classType);

    const usable = (cmes as RawCme[]).flatMap((c) => {
      const analyses = c.cmeAnalyses ?? [];
      const best = analyses.find((a) => a.isMostAccurate) ?? analyses[0];
      if (!c.activityID || !c.startTime || !best?.speed || best.speed <= 0) return [];
      const links = (c.linkedEvents ?? []).map((l) => l.activityID ?? "");
      const flrLinks = links.filter((l) => l.includes("-FLR-"));
      // The flare's class comes from the FLR list; if NASA's FLR service is down, from the CME's own note.
      let classes = flrLinks.flatMap((l) => flareClass.get(l) ?? []);
      if (classes.length === 0 && flrLinks.length > 0) classes = flaresInNote(c.note);
      const strongest = classes.sort((a, b) => flareRank(b) - flareRank(a))[0] ?? null;
      // Mars arrivals from the best analysis' model runs (any analysis if the best one has none).
      const impacts = (a: (typeof analyses)[number]) => (a.enlilList ?? []).flatMap((e) => e.impactList ?? []).filter((i) => i.location === "Mars" && i.arrivalTime);
      const mars = impacts(best).length ? impacts(best) : analyses.flatMap(impacts);
      const hit = mars.find((i) => !i.isGlancingBlow) ?? mars[0];
      const event: StormEvent = {
        id: c.activityID,
        date: c.startTime.slice(0, 10),
        speed: Math.round(best.speed),
        sep: links.some((l) => l.includes("-SEP-")),
        flare: strongest,
        live: true,
        marsHit: !!hit,
        arrival: hit?.arrivalTime ?? null,
        glancing: !!hit && mars.every((i) => i.isGlancingBlow),
        link: c.link ?? null,
      };
      return [event];
    });
    // Only clouds that NASA's model sends to Mars. None this month: null, and a saved real Mars-bound event is used.
    const toMars = usable.filter((e) => e.marsHit && e.speed > 0 && e.speed < 4000);
    if (toMars.length === 0) return null;
    return toMars[Math.floor(Math.random() * toMars.length)];
  } catch {
    return null; // slow, offline, over the limit, or odd data: use a saved event
  } finally {
    window.clearTimeout(timer);
  }
}

/** The saved events take turns, so the next game shows a different one. */
export function nextSaved(): StormEvent {
  let n = 0;
  try {
    n = Number(window.sessionStorage.getItem("ares-storm-n")) || 0;
    window.sessionStorage.setItem("ares-storm-n", String(n + 1));
  } catch {
    /* private mode: always start with the first */
  }
  return SAVED_EVENTS[n % SAVED_EVENTS.length];
}

/** Dev only: a forced event from the URL, or null to go on as normal. */
export function devEvent(): { forced: StormEvent | null; skipLive: boolean } {
  if (isJudge() && !judgeLive()) return { forced: SAVED_EVENTS[JUDGE_STORM_INDEX], skipLive: true };
  if (!import.meta.env.DEV) return { forced: null, skipLive: false };
  const params = new URLSearchParams(window.location.search);
  const which = ["small", "medium", "big"].indexOf(params.get("storm") ?? "");
  return { forced: which >= 0 ? SAVED_EVENTS[which] : null, skipLive: params.get("live") === "0" };
}
