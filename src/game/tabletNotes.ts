// Mission ARES — what each tablet row says when tapped.
// Add every `source` to the Data Sources screen.

import type { TabletFocus } from "./state";

export type TabletNote = { title?: string; text: string; source?: string };

export const TABLET_NOTES: Record<TabletFocus, TabletNote> = {
  power: {
    text: "Made by solar panels. The plants, the oxygen maker and the rover all use it.",
  },
  water: {
    text: "For drinking, for plants, and for the storm-shield walls. One drop can only do one job.",
  },
  air: {
    title: "Making air",
    text: "A machine splits water into oxygen using power. Five people breathe a lot!",
    source: "NASA · ISS Environmental Control and Life Support System",
  },
  crew: {
    text: "Happy faces mean a strong crew. A tired crew makes the rover slower.",
  },
};
