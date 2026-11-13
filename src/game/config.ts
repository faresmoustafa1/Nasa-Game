// Loads the editable JSON files once and gives them types.
import balanceJson from "../data/balance.json";
import daysJson from "../data/days.json";
import textJson from "../data/text.json";
import glossaryJson from "../data/glossary.json";
import factsJson from "../data/facts.json";
import flareJson from "../data/flare-table.json";
import type { BalanceConfig, DayDef, RoomId, RunInfo } from "./types";

export const balance = balanceJson as unknown as BalanceConfig;
export const days = daysJson.days as unknown as DayDef[];
export const text = textJson;
export const glossary = glossaryJson as Record<string, string>;
export const flareTable = flareJson.classes;

export type Fact = {
  id: string;
  title: string;
  text: string;
  label: string;
  source_name: string;
  source_url: string;
  source_date: string;
  checked: boolean;
};
export const facts = factsJson.facts as Fact[];
export const factById = (id: string) => facts.find((f) => f.id === id);

/**
 * The flare used on "flare: true" days. Until the NASA data layer (Step 5)
 * picks a real DONKI flare, this is a labelled GAME EXAMPLE, never shown as real.
 */
export type RunFlare = { classType: string; date: string | null; source: "example" | "live" | "saved" };
export const EXAMPLE_FLARE: RunFlare = { classType: "M", date: null, source: "example" };

/** Fact cards shown for a day. Cards that need a real flare date wait for real data. */
export function factsForDay(day: DayDef, flare: RunFlare): Fact[] {
  return day.factIds
    .map(factById)
    .filter((f): f is Fact => !!f && !(f.text.includes("{date}") && !flare.date));
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
