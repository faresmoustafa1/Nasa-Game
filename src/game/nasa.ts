// Mission ARES — the NASA data layer.
//
// For each dataset: try the LIVE NASA API for 1.5 s, else use the SAVED real
// NASA data in src/data/nasa-cache (written by `npm run fetch-nasa`). Every
// value carries its label, so the screen can say "LIVE NASA DATA" or
// "SAVED REAL NASA DATA (from <date>)". Nothing is ever made up: if a dataset
// has neither live nor saved data, it is `null` and the game says so.
//
// Browser-reachable (CORS) live sources: DONKI + APOD (api.nasa.gov), InSight
// weather (mars.nasa.gov). OSDR and RadLab block browser calls, so they are
// always SAVED.

import type { RunFlare } from "./config";

const KEY: string = (import.meta.env.VITE_NASA_API_KEY as string | undefined) || "DEMO_KEY";
const TIMEOUT_MS = 1500;

export type Source = "live" | "saved";
export type Labelled<T> = { value: T; source: Source; fetchedAt: string; sourceUrl: string };

export type Flare = {
  id: string;
  classType: string;
  letter: string;
  peakTime: string | null;
  startTime: string | null;
  sourceRegion: string | null;
  issueTime: string;
  url: string;
};
export type InsightSol = {
  sol: number;
  firstUTC: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  season: string;
};
export type RadReading = { instrumentId: string; from: string; to: string; meanPerHour: number; meanPerDay: number };
export type Study = { id: string; title: string; description: string; mission: string | null; url: string };
export type Apod = { date: string; title: string; mediaType: string; url: string; pageUrl: string; credit: string | null };

export type NasaData = {
  flares: Labelled<Flare[]> | null;
  insight: Labelled<InsightSol[]> | null;
  radlab: Labelled<RadReading> | null;
  studies: Labelled<Study[]> | null;
  apod: Labelled<Apod[]> | null;
};

// ---------------------------------------------------------------------------
// Saved data (bundled). A file may be missing if `npm run fetch-nasa` could not
// reach that API yet; then that dataset is simply not available offline.

type CacheFile = Record<string, unknown> & { fetchedAt: string };
const files = import.meta.glob<CacheFile>("../data/nasa-cache/*.json", { eager: true, import: "default" });
const cached = (name: string): CacheFile | null => files[`../data/nasa-cache/${name}`] ?? null;

function savedData(): NasaData {
  const f = cached("donki-flares.json");
  const w = cached("insight-weather.json");
  const r = cached("radlab-msl-rad.json");
  const o = cached("osdr-studies.json");
  const a = cached("apod.json");
  return {
    flares: f ? { value: f.flares as Flare[], source: "saved", fetchedAt: f.fetchedAt, sourceUrl: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" } : null,
    insight: w ? { value: w.sols as InsightSol[], source: "saved", fetchedAt: w.fetchedAt, sourceUrl: "https://mars.nasa.gov/insight/weather/" } : null,
    radlab: r
      ? {
          value: r as unknown as RadReading,
          source: "saved",
          fetchedAt: r.fetchedAt,
          sourceUrl: "https://visualization.osdr.nasa.gov/radlab/gui/bleo/",
        }
      : null,
    studies: o ? { value: o.studies as Study[], source: "saved", fetchedAt: o.fetchedAt, sourceUrl: "https://osdr.nasa.gov/bio/repo/" } : null,
    apod: a ? { value: a.days as Apod[], source: "saved", fetchedAt: a.fetchedAt, sourceUrl: "https://apod.nasa.gov/" } : null,
  };
}

// ---------------------------------------------------------------------------
// Live data

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Same parser as scripts/fetch-nasa.mjs: "Flare intensity: X1.0 class." */
export function parseFlareMessage(m: { messageID: string; messageBody?: string; messageIssueTime: string; messageURL: string }): Flare | null {
  const body = m.messageBody ?? "";
  const cls = body.match(/Flare intensity:\s*([ABCMX]\d+(?:\.\d+)?)\s*class/i)?.[1];
  if (!cls) return null;
  return {
    id: m.messageID,
    classType: cls.toUpperCase(),
    letter: cls.charAt(0).toUpperCase(),
    startTime: body.match(/Flare start time:\s*([0-9T:\-]+Z)/)?.[1] ?? null,
    peakTime: body.match(/Flare peak time:\s*([0-9T:\-]+Z)/)?.[1] ?? null,
    sourceRegion: body.match(/Source region:\s*([NS]\d+[EW]\d+)/)?.[1] ?? null,
    issueTime: m.messageIssueTime,
    url: m.messageURL,
  };
}

const day = (d: Date) => d.toISOString().slice(0, 10);

async function liveFlares(): Promise<Labelled<Flare[]> | null> {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400_000);
  const url = `https://api.nasa.gov/DONKI/notifications?startDate=${day(start)}&endDate=${day(end)}&type=FLR&api_key=${KEY}`;
  const list = (await getJson(url)) as Parameters<typeof parseFlareMessage>[0][];
  const flares = list.map(parseFlareMessage).filter((f): f is Flare => !!f);
  if (!flares.length) return null; // a quiet Sun this month: use the saved real flares instead
  return { value: flares, source: "live", fetchedAt: new Date().toISOString(), sourceUrl: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" };
}

async function liveInsight(): Promise<Labelled<InsightSol[]> | null> {
  const url = "https://mars.nasa.gov/rss/api/?feed=weather&category=insight_temperature&feedtype=json&ver=1.0";
  const j = (await getJson(url)) as Record<string, { First_UTC: string; Season: string; AT?: { mn: number; mx: number } }> & { sol_keys: string[] };
  const sols = j.sol_keys.map((k) => ({
    sol: Number(k),
    firstUTC: j[k].First_UTC,
    tempMinC: j[k].AT?.mn ?? null,
    tempMaxC: j[k].AT?.mx ?? null,
    season: j[k].Season,
  }));
  return sols.length ? { value: sols, source: "live", fetchedAt: new Date().toISOString(), sourceUrl: "https://mars.nasa.gov/insight/weather/" } : null;
}

const settle = <T,>(p: Promise<T>) => p.then((v) => v, () => null);

/** Live where possible, saved otherwise. Never takes much more than 1.5 s. */
export async function loadNasa(): Promise<NasaData> {
  const saved = savedData();
  const [flares, insight] = await Promise.all([settle(liveFlares()), settle(liveInsight())]);
  return {
    ...saved,
    flares: flares ?? saved.flares,
    insight: insight ?? saved.insight,
  };
}

// A tiny store: saved data at once, live data when it arrives.
let current: NasaData = savedData();
const listeners = new Set<() => void>();
let started: Promise<void> | null = null;

export const nasaNow = (): NasaData => current;

export function subscribeNasa(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Start the live calls once (safe to call many times). */
export function refreshNasa(): Promise<void> {
  if (!started) {
    started = loadNasa().then((d) => {
      current = d;
      listeners.forEach((fn) => fn());
    });
  }
  return started;
}

// ---------------------------------------------------------------------------
// Helpers for the game

/** A simple seeded pick, so the same seed gives the same real flare. */
export function pickFlare(data: NasaData, seed: number, wantLetter?: "M" | "X"): RunFlare | null {
  const all = data.flares?.value ?? [];
  const list = wantLetter ? all.filter((f) => f.letter === wantLetter) : all.filter((f) => f.letter === "M" || f.letter === "X");
  if (!list.length || !data.flares) return null;
  const f = list[Math.abs(seed) % list.length];
  return {
    classType: f.classType,
    date: (f.peakTime ?? f.issueTime).slice(0, 10),
    source: data.flares.source,
    url: f.url,
    fetchedAt: data.flares.fetchedAt,
  };
}

/** Coldest night and warmest day in the InSight data. */
export function insightRange(data: NasaData): { min: number; max: number; from: string; to: string } | null {
  const sols = (data.insight?.value ?? []).filter((s) => s.tempMinC !== null && s.tempMaxC !== null);
  if (!sols.length) return null;
  return {
    min: Math.round(Math.min(...sols.map((s) => s.tempMinC!))),
    max: Math.round(Math.max(...sols.map((s) => s.tempMaxC!))),
    from: sols[0].firstUTC.slice(0, 10),
    to: sols[sols.length - 1].firstUTC.slice(0, 10),
  };
}

/** "LIVE NASA DATA" or "SAVED REAL NASA DATA (from 2026-11-14)". */
export function labelFor(l: { source: Source; fetchedAt: string } | null): string {
  if (!l) return "NO NASA DATA YET";
  return l.source === "live" ? "LIVE NASA DATA" : `SAVED REAL NASA DATA (from ${l.fetchedAt.slice(0, 10)})`;
}
