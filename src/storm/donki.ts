// Mission ARES — the solar storm's real data, from NASA DONKI (Space Weather Database Of Notifications,
// Knowledge, Information). One call asks for the Sun's recent eruptions; if NASA is slow, down, or the
// key is over its limit, the game uses one of three saved REAL events instead. The kid never waits.
//
//   Live key:  put VITE_NASA_API_KEY=your_key in a .env file (free at https://api.nasa.gov).
//              Without one the game uses NASA's shared DEMO_KEY, which is often rate-limited,
//              so the saved events will show up. That is fine: it is what they are for.
//   Dev only:  ?storm=small|medium|big forces a saved event, ?live=0 skips the live call.
//
// Add the sources to the Data Sources screen: NASA DONKI (CME and FLR), https://api.nasa.gov

import { JUDGE_STORM_INDEX, isJudge } from "../game/judge";
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
};

/**
 * Three real events, copied from DONKI (speeds and links) and checked against
 * SIDC / STCE reports for the flare. One of each size.
 */
export const SAVED_EVENTS: StormEvent[] = [
  { id: "2025-06-03T07:48:00-CME-001", date: "2025-06-03", speed: 328, sep: false, flare: null, live: false },
  { id: "2025-06-06T11:12:00-CME-001", date: "2025-06-06", speed: 758, sep: false, flare: null, live: false },
  { id: "2024-10-09T02:12:00-CME-001", date: "2024-10-09", speed: 1509, sep: true, flare: "X1.8", live: false },
];

/** The size table: under 500 km/s small, 500–1000 medium, over 1000 (or any proton event) big. */
export function levelOf(e: StormEvent): Level {
  if (e.sep || e.speed > 1000) return 3;
  if (e.speed >= 500) return 2;
  return 1;
}

/** An M or X class flare blocks the radio: the message from Earth is lost. */
export const messageLost = (e: StormEvent) => !!e.flare && /^[MX]/.test(e.flare);

const BASE = "https://api.nasa.gov/DONKI";

type RawCme = {
  activityID?: string;
  startTime?: string;
  cmeAnalyses?: { isMostAccurate?: boolean; speed?: number | null }[] | null;
  linkedEvents?: { activityID?: string }[] | null;
};
type RawFlr = { flrID?: string; classType?: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Ranks "X1.8" above "M5.0" above "C9.9". */
function flareRank(c: string) {
  return "ABCMX".indexOf(c[0]) * 100 + (parseFloat(c.slice(1)) || 0);
}

/** Asks DONKI for the last 30 days and picks one eruption at random. Gives up after `timeoutMs`. */
export async function fetchLiveEvent(timeoutMs = 1500): Promise<StormEvent | null> {
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
      const classes = links.filter((l) => l.includes("-FLR-")).flatMap((l) => flareClass.get(l) ?? []);
      const strongest = classes.sort((a, b) => flareRank(b) - flareRank(a))[0] ?? null;
      const event: StormEvent = {
        id: c.activityID,
        date: c.startTime.slice(0, 10),
        speed: Math.round(best.speed),
        sep: links.some((l) => l.includes("-SEP-")),
        flare: strongest,
        live: true,
      };
      return [event];
    });
    if (usable.length === 0) return null;
    return usable[Math.floor(Math.random() * usable.length)];
  } catch {
    return null; // slow, offline, over the limit, or odd data: use a saved event
  } finally {
    window.clearTimeout(timer);
  }
}

/** The saved events take turns, so "Retry storm" shows a different one. */
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
  if (isJudge()) return { forced: SAVED_EVENTS[JUDGE_STORM_INDEX], skipLive: true };
  if (!import.meta.env.DEV) return { forced: null, skipLive: false };
  const params = new URLSearchParams(window.location.search);
  const which = ["small", "medium", "big"].indexOf(params.get("storm") ?? "");
  return { forced: which >= 0 ? SAVED_EVENTS[which] : null, skipLive: params.get("live") === "0" };
}
