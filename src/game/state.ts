// Mission ARES — the shared game state.
//
// One object, owned by App.tsx, passed to every scene on Mars. A scene reads
// it, and reports back what the player chose. The numbers are the START values
// from the cost table (power 12, water 10, air 6, crew 4 of 6).

export type Meters = { power: number; water: number; air: number };
export type MeterKey = keyof Meters;

/** A row on the tablet that can be tapped. */
export type TabletFocus = MeterKey | "crew";

/** Every bar is drawn on the same 0–12 scale, so they compare at a glance. */
export const METER_MAX = 12;
export const CREW_MAX = 6;

export const METER_LABEL: Record<MeterKey, string> = {
  power: "Power",
  water: "Water",
  air: "Air",
};

export type Order = "GR" | "RG"; // greenhouse first, or rover first

export type GameState = {
  meters: Meters;
  /** Crew score, 0–6. Shown as 5 faces. */
  crew: number;
  /** Mars day. Sol 1 is the first task, Sol 2 the second (the storm). */
  sol: number;
  /** Which task the player picked first. Set at the base hub. */
  order: Order | null;
  /** One line per choice, for the recap on the result screen. */
  log: string[];
};

export const newGame = (): GameState => ({
  meters: { power: 12, water: 10, air: 6 },
  crew: 4,
  sol: 1,
  order: null,
  log: [],
});

export type Face = "happy" | "okay" | "tired";

/**
 * Crew score (0–6) → 5 faces. Each full 1.2 points is one happy face; a
 * partly-filled one shows "okay". Start (4 of 6) = 3 happy, 1 okay, 1 tired.
 */
export function crewFaces(score: number): Face[] {
  const filled = (Math.max(0, Math.min(CREW_MAX, score)) / CREW_MAX) * 5;
  const happy = Math.floor(filled);
  const partial = filled - happy >= 0.3;
  return Array.from({ length: 5 }, (_, i) =>
    i < happy ? "happy" : i === happy && partial ? "okay" : "tired",
  );
}
