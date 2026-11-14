// Mission ARES — the words of the cruise scene (1600 × 900 coordinates).
// Timing is in seconds and matches BEATS in Cruise.tsx.
// Add every fact's source to the Data Sources screen.

import type { SceneNote } from "../game/notes";

export const CRUISE_NOTES: SceneNote[] = [
  {
    from: 0.8,
    to: 5.6,
    kind: "story",
    text: "The ship leaves Earth. Mars is a very long way away.",
    box: { x: 640, y: 150, w: 560 },
    point: { x: 430, y: 500 },
  },
  {
    from: 6.5,
    to: 10.6,
    kind: "story",
    text: "Day 2. THUMP… THUMP… Something is knocking inside the storage locker!",
    box: { x: 330, y: 160, w: 620 },
    point: { x: 1290, y: 560 },
  },
  {
    from: 11.6,
    to: 15.6,
    kind: "story",
    text: "It's the boy! He hid on the ship. He's a stowaway!",
    box: { x: 560, y: 150, w: 540 },
    point: { x: 1120, y: 566 },
  },
  {
    from: 16.3,
    to: 20.7,
    kind: "story",
    text: "“We packed air, water and food for 4 people. Now we are 5.”",
    box: { x: 150, y: 140, w: 640 },
    point: { x: 660, y: 520 },
  },
  {
    from: 21.2,
    to: 24.2,
    kind: "story",
    text: "“Nobody is in trouble. We'll make it work, together.”",
    box: { x: 250, y: 170, w: 600 },
    point: { x: 500, y: 520 },
  },
  {
    from: 25,
    to: 30.4,
    kind: "fact",
    title: "How long is the trip?",
    text: "Mars keeps moving, so the ship flies a long curve. The trip takes about 7 months.",
    source: "NASA/JPL · Mars 2020 Perseverance mission press kit",
    box: { x: 600, y: 130, w: 600 },
    point: { x: 790, y: 372 },
  },
  {
    from: 31.5,
    to: 34.4,
    kind: "story",
    text: "Seven months later… there it is. Mars!",
    box: { x: 540, y: 700, w: 520 },
    point: { x: 1290, y: 520 },
  },
];
