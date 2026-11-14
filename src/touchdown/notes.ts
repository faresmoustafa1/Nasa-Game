// Mission ARES — the words of the touchdown scene (1600 × 900 coordinates).
// Timing is in seconds and matches BEATS in Touchdown.tsx.
// Add every fact's source to the Data Sources screen.

import type { SceneNote } from "../game/notes";


export const WATCH_NOTES: SceneNote[] = [
  {
    from: 0.3,
    to: 4.2,
    kind: "fact",
    title: "Seven minutes of terror",
    text: "Landing on Mars takes only about 7 minutes!",
    source: "NASA/JPL · Mars 2020 Perseverance mission press kit",
    box: { x: 520, y: 90, w: 600 },
  },
];

/** The tutorial note changes with what the player has done on the tablet. */
export function tabletNote(seen: number, learned: boolean): SceneNote {
  const base = { from: 6.1, to: 99999, box: { x: 760, y: 300, w: 620 }, point: { x: 840, y: 618 } };
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
