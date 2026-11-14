// Loads the editable JSON files once and gives them types.
import balanceJson from "../data/balance.json";
import daysJson from "../data/days.json";
import textJson from "../data/text.json";
import glossaryJson from "../data/glossary.json";
import factsJson from "../data/facts.json";
import flareJson from "../data/flare-table.json";
import alertsJson from "../data/alerts.json";
import type { AlertDef, AlertsConfig, BalanceConfig, DayDef, RoomId, RunInfo } from "./types";
import { insightRange, labelFor, nasaNow } from "./nasa";

export const balance = balanceJson as unknown as BalanceConfig;
export const days = daysJson.days as unknown as DayDef[];
export const text = textJson;
export const glossary = glossaryJson as Record<string, string>;
export const flareTable = flareJson.classes;
export const alerts = alertsJson as unknown as AlertsConfig;
export const alertFor = (dayId: string): AlertDef | null => alerts.days[dayId] ?? null;

export type Fact = {
  id: string;
  icon?: string;
  title: string;
  text: string;
  label: string;
  /** Which real NASA dataset fills the {slots}: donki, insight, radlab, osdr:<id>. */
  data?: string;
  source_name: string;
  source_url: string;
  source_date: string;
  evidence?: string;
  checked: boolean;
  checked_on?: string;
};
export const facts = factsJson.facts as Fact[];
export const factById = (id: string) => facts.find((f) => f.id === id);

/**
 * The flare used on "flare: true" days: a real DONKI flare (live or saved).
 * Only if no real flare data exists at all, a labelled GAME EXAMPLE is used.
 */
export type RunFlare = {
  classType: string;
  date: string | null;
  source: "example" | "live" | "saved";
  url?: string;
  fetchedAt?: string;
};
export const EXAMPLE_FLARE: RunFlare = { classType: "M", date: null, source: "example" };

/** What a fact card shows, with its {slots} filled from real NASA data. */
export type FactView = Fact & { dataLabel: string | null };

/** Fills a fact from real data; null if the data it needs is not available. */
export function factView(f: Fact, flare: RunFlare): FactView | null {
  const nasa = nasaNow();
  const d = f.data ?? "";
  if (d === "donki") {
    if (flare.source === "example" || !flare.date) return null;
    return {
      ...f,
      text: fmt(f.text, { date: flare.date, class: flare.classType }),
      source_url: flare.url ?? "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
      source_date: flare.date,
      dataLabel: labelFor({ source: flare.source, fetchedAt: flare.fetchedAt ?? new Date().toISOString() }),
    };
  }
  if (d === "insight") {
    const r = insightRange(nasa);
    if (!r || !nasa.insight) return null;
    return { ...f, text: fmt(f.text, { min: r.min, max: r.max }), source_date: r.to, dataLabel: labelFor(nasa.insight) };
  }
  if (d === "radlab") {
    const r = nasa.radlab;
    if (!r) return null;
    return {
      ...f,
      text: fmt(f.text, { perDay: Math.round(r.value.meanPerDay), perHour: r.value.meanPerHour }),
      source_date: r.value.from.slice(0, 10),
      dataLabel: labelFor(r),
    };
  }
  if (d.startsWith("osdr:")) {
    const s = nasa.studies?.value.find((x) => x.id === d.slice(5));
    if (!s || !nasa.studies) return null;
    return { ...f, dataLabel: labelFor(nasa.studies) };
  }
  return { ...f, dataLabel: null };
}

/** Fact cards shown for a day (only those whose real data is available). */
export function factsForDay(day: DayDef, flare: RunFlare): FactView[] {
  return day.factIds
    .map(factById)
    .map((f) => (f ? factView(f, flare) : null))
    .filter((f): f is FactView => !!f);
}

export function runInfo(flare: RunFlare): RunInfo {
  return { flareClass: flare.classType, flareTable };
}

/** Rooms from left to right, as drawn in the base. */
export const ROOMS: RoomId[] = ["power", "air", "greenhouse", "shelter"];

export function dayById(id: string): DayDef {
  return days.find((d) => d.id === id) ?? days[0];
}

/** Fills {name} slots: fmt("Sol {n}", { n: 2 }) → "Sol 2". */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
