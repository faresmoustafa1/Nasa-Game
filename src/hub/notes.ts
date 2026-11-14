// Mission ARES — the words of the base hub and the first night (1600 × 900 coordinates).
// Hub notes are built in Hub.tsx from the choice; the night is on a clock (matches BEATS in Night.tsx).
// Add every fact's source to the Data Sources screen.

import type { SceneNote } from "../game/notes";
import { LATER_COST } from "../game/state";
import type { Task } from "../game/state";

const NEVER = 9999;

/** First visit, before the player picks: two short notes, then a standing reminder. */
export const HUB_INTRO_NOTES: SceneNote[] = [
  {
    from: 0.8,
    to: 6.6,
    kind: "story",
    text: "“Two jobs today, and we can't do both first. You pick, we'll follow.”",
    box: { x: 520, y: 110, w: 620 },
    point: { x: 300, y: 470 },
  },
  {
    from: 7.2,
    to: 13.4,
    kind: "story",
    text: "The plants need water and light to grow food. The rover is a robot car that drives out to collect rocks.",
    box: { x: 560, y: 110, w: 700 },
    point: { x: 1350, y: 560 },
  },
  {
    from: 13.4,
    to: NEVER,
    kind: "story",
    text: "Tap a room that glows to send the boy there.",
    box: { x: 560, y: 130, w: 560 },
  },
];

const OTHER: Record<Task, Task> = { greenhouse: "rover", rover: "greenhouse" };
const NAME: Record<Task, string> = { greenhouse: "Greenhouse", rover: "Rover" };
const CHIP_POINT: Record<Task, { x: number; y: number }> = {
  greenhouse: { x: 300, y: 780 },
  rover: { x: 1350, y: 780 },
};

/** After the first pick: what changes for the job that has to wait. */
export function pickedNote(picked: Task): SceneNote {
  const other = OTHER[picked];
  return {
    from: 0,
    to: NEVER,
    kind: "story",
    text: `${NAME[picked]} first! ${LATER_COST[other].note}`,
    box: { x: 480, y: 110, w: 700 },
    point: CHIP_POINT[other],
  };
}

/** Second visit (after the storm): one job is left, and it is the harder one. */
export function secondNote(left: Task): SceneNote {
  return {
    from: 0.6,
    to: NEVER,
    kind: "story",
    text: `The storm is over. One job left: the ${left === "rover" ? "rover" : "greenhouse"}. ${LATER_COST[left].note}`,
    box: { x: 480, y: 110, w: 720 },
    point: CHIP_POINT[left],
  };
}

/** The first night. Times match BEATS in Night.tsx. */
export const NIGHT_NOTES: SceneNote[] = [
  {
    from: 0.6,
    to: 3.4,
    kind: "story",
    text: "The sun sets over Jezero. Time to rest.",
    box: { x: 540, y: 120, w: 520 },
  },
  {
    from: 3.8,
    to: 8.9,
    kind: "story",
    text: "Even sleeping, 5 people breathe. Air goes down.",
    box: { x: 700, y: 110, w: 560 },
    point: { x: 1010, y: 640 },
  },
  {
    from: 9.3,
    to: 13.6,
    kind: "fact",
    title: "Making air",
    text: "The oxygen maker splits water into oxygen. It costs 1 Power and 1 Water, and gives back 2 Air.",
    source: "NASA · ISS Environmental Control and Life Support System",
    box: { x: 560, y: 90, w: 640 },
    point: { x: 680, y: 640 },
  },
  {
    from: 14.2,
    to: 17.4,
    kind: "fact",
    title: "A Mars day",
    text: "A day on Mars (a sol) lasts 24 hours 39 minutes. Good morning, Sol 2!",
    source: "Royal Museums Greenwich · Sol",
    box: { x: 560, y: 110, w: 620 },
  },
];
