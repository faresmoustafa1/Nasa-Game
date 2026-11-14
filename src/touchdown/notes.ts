// Mission ARES — the words of the touchdown scene (1600 × 900 coordinates).
// Timing is in seconds and matches BEATS in Touchdown.tsx.
// Add every fact's source to the Data Sources screen.

import type { SceneNote } from "../game/notes";


export const WATCH_NOTES: SceneNote[] = [
  {
    from: 0.8,
    to: 5.2,
    kind: "story",
    text: "Time to land. The ship drops toward Mars.",
    box: { x: 480, y: 110, w: 560 },
    point: { x: 330, y: 215 },
  },
  {
    from: 5.9,
    to: 8.4,
    kind: "shout",
    text: "Hold on tight!",
    box: { x: 660, y: 130, w: 320 },
    point: { x: 700, y: 390 },
  },
  {
    from: 8.7,
    to: 12.3,
    kind: "fact",
    title: "Seven minutes of terror",
    text: "Landing on Mars takes only about 7 minutes. The ship slows from 19,500 km/h to almost zero!",
    source: "NASA/JPL · Mars 2020 Perseverance mission press kit",
    box: { x: 520, y: 90, w: 600 },
  },
  {
    from: 12.9,
    to: 15.9,
    kind: "story",
    text: "The parachute opens!",
    box: { x: 860, y: 190, w: 400 },
  },
  {
    from: 16,
    to: 18.4,
    kind: "story",
    text: "Rockets fire to slow the last bit.",
    box: { x: 860, y: 190, w: 500 },
  },
  {
    from: 19.2,
    to: 22.4,
    kind: "story",
    text: "Touchdown! The crew made it to Jezero Crater, Mars.",
    box: { x: 700, y: 150, w: 600 },
    point: { x: 470, y: 640 },
  },
  {
    from: 23.2,
    to: 26.8,
    kind: "fact",
    title: "Jezero Crater",
    text: "This dry crater was once flooded with water. A river ran in from that fan-shaped hill.",
    source: "NASA/JPL · Mars 2020 Perseverance landing press kit",
    box: { x: 760, y: 110, w: 620 },
    point: { x: 1250, y: 585 },
  },
  {
    from: 27.2,
    to: 30.8,
    kind: "story",
    text: "The boy wears the spare suit. It's a little big!",
    box: { x: 840, y: 330, w: 560 },
    point: { x: 1400, y: 668 },
  },
];

/** The tutorial note changes with what the player has done on the tablet. */
export function tabletNote(seen: number, learned: boolean): SceneNote {
  const base = { from: 31.2, to: 99999, box: { x: 760, y: 300, w: 620 }, point: { x: 840, y: 618 } };
  if (learned) {
    return { ...base, kind: "shout", text: "“Ready? Then let's get to work!”" };
  }
  if (seen > 0) {
    return { ...base, kind: "story", text: "“Good! Tap the other bars too.”" };
  }
  return {
    ...base,
    kind: "story",
    text: "“Take the tablet. It shows what we need to stay alive. Tap each bar!”",
  };
}
