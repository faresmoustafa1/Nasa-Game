// Mission ARES — the words of the cruise scene (1600 × 900 coordinates).
// Timing is in seconds and matches BEATS in Cruise.tsx.
// Add every fact's source to the Data Sources screen.

import type { SceneNote } from "../game/notes";

export const CRUISE_NOTES: SceneNote[] = [
  {
    from: 0.4,
    to: 3,
    kind: "story",
    text: "The rocket flies away from Earth, toward Mars.",
    box: { x: 560, y: 600, w: 560 },
    point: { x: 520, y: 470 },
  },
  {
    from: 3.6,
    to: 8.4,
    kind: "story",
    text: "A stowaway! “We packed for 4. Now we are 5. We'll make it work, together.”",
    box: { x: 900, y: 230, w: 620 },
    point: { x: 1120, y: 566 },
  },
  {
    from: 8.9,
    to: 14,
    kind: "story",
    text: "The trip to Mars takes about 7 months.",
    box: { x: 560, y: 650, w: 560 },
    point: { x: 790, y: 372 },
  },
];
