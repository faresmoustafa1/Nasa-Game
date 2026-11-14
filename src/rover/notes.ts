// Mission ARES — the words of the rover trip (1600 × 900 coordinates). Add every fact's source to the Data Sources screen.

import type { SceneNote } from "../game/notes";
import { BONUS_POINTS } from "./sites";

const NEVER = 9999;

export const INTRO_NOTE: SceneNote = {
  from: 0.6,
  to: 5.4,
  kind: "story",
  text: "This is the ROVER: a robot car that drives on Mars. Let's collect rocks!",
  box: { x: 520, y: 110, w: 680 },
  point: { x: 1250, y: 640 },
};

/** Mission Control: dust is coming, and Earth has a shortcut, but a question takes time to travel. */
export function choiceNote(delayMin: number): SceneNote {
  const m = Math.max(1, Math.round(delayMin));
  return {
    from: 0,
    to: NEVER,
    kind: "radio",
    title: "Dust storm warning",
    text: `Dust is coming! Earth knows a shortcut, but a message takes about ${m} minutes. Wait for advice, or go now?`,
    source: "NASA/JPL · approximate planet positions; NASA Space Communications",
    box: { x: 480, y: 100, w: 800 },
  };
}

export function waitingNote(delayMin: number): SceneNote {
  const round = Math.max(2, Math.round(delayMin * 2));
  return {
    from: 0,
    to: NEVER,
    kind: "radio",
    title: "Message sent",
    text: `Waiting for Earth… In real life: about ${round} minutes there and back.`,
    box: { x: 480, y: 100, w: 800 },
  };
}

/** Mission Control spots an interesting rock at a different site each game. */
export const rockNote = (siteName: string, at: number, until: number): SceneNote => ({
  from: at,
  to: until,
  kind: "radio",
  title: "Interesting rock!",
  text: `We spotted an interesting rock at the ${siteName}! Bring it home for ${BONUS_POINTS} bonus points.`,
  box: { x: 480, y: 100, w: 800 },
});

export const ADVICE_NOTE: SceneNote = {
  from: 0,
  to: NEVER,
  kind: "radio",
  title: "Earth replies",
  text: "Use the old tracks! Trips cost 1 less Power. But dust is closer: 1 rock fewer.",
  box: { x: 480, y: 100, w: 800 },
};

export const JEZERO_FACT = (at: number): SceneNote => ({
  from: at + 0.4,
  to: at + 6.4,
  kind: "fact",
  title: "Jezero Crater",
  text: "Jezero is about 45 kilometers wide. Long ago a lake filled it, and a river built a fan-shaped delta on its west side.",
  source: "NASA · Mars 2020 Perseverance mission (science.nasa.gov)",
  box: { x: 480, y: 100, w: 760 },
  point: { x: 480, y: 520 },
});

export const OPPORTUNITY_FACT = (at: number): SceneNote => ({
  from: at + 6.8,
  to: at + 13.4,
  kind: "fact",
  title: "Dust storms are no joke",
  text: "In 2018 a giant dust storm blocked the Sun from the solar-powered rover Opportunity. Its last message came on June 10, 2018.",
  source: "NASA/JPL · Opportunity mission end announcement, Feb 13, 2019",
  box: { x: 440, y: 100, w: 800 },
});

export const HINT_NOTE = (at: number): SceneNote => ({
  from: at + 13.8,
  to: NEVER,
  kind: "story",
  text: "Tap a glowing rock spot. The rover drives there and collects a rock.",
  box: { x: 520, y: 110, w: 680 },
});

export const sampleNote = (at: number, text: string): SceneNote => ({ from: at, to: at + 3.6, kind: "story", text, box: { x: 520, y: 110, w: 680 } });

export const DUST_NOTE: SceneNote = {
  from: 0,
  to: NEVER,
  kind: "shout",
  text: "The dust storm is here! Time to go home.",
  box: { x: 540, y: 110, w: 620 },
};
