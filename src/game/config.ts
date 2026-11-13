// Loads the editable JSON files once and gives them types.
import balanceJson from "../data/balance.json";
import daysJson from "../data/days.json";
import textJson from "../data/text.json";
import glossaryJson from "../data/glossary.json";
import type { BalanceConfig, DayDef, RoomId } from "./types";

export const balance = balanceJson as unknown as BalanceConfig;
export const days = daysJson.days as unknown as DayDef[];
export const text = textJson;
export const glossary = glossaryJson as Record<string, string>;

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
