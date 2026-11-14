// Mission ARES — the words of the solar storm (1600 × 900 coordinates).
// The alarm and the radio message are on the scene clock; the result notes start when the shield is picked.
// Add every fact's source to the Data Sources screen.

import type { SceneNote } from "../game/notes";
import { LEVEL_NAME, SHIELD } from "../game/state";
import type { StormRecord } from "../game/state";
import { levelOf, messageLost } from "./donki";
import type { StormEvent } from "./donki";

const NEVER = 9999;

export const ALARM_NOTE: SceneNote = {
  from: 0.5,
  to: 3.2,
  kind: "shout",
  text: "SOLAR STORM ALARM! Everybody to the shelter!",
  box: { x: 540, y: 110, w: 620 },
};

/** Mission Control's message. A big flare can block it: then the player has to guess. */
export function radioNote(e: StormEvent): SceneNote {
  if (messageLost(e)) {
    return {
      from: 3.4,
      to: NEVER,
      kind: "radio",
      title: "Signal lost",
      text: "krrrzzt… A huge flare on the Sun is blocking our radio! We can't tell you how big this storm is. Trust your gut and pick a shield.",
      source: "NASA · DONKI (space weather database)",
      box: { x: 480, y: 100, w: 760 },
    };
  }
  return {
    from: 3.4,
    to: NEVER,
    kind: "radio",
    title: "Storm warning",
    text: `A ${LEVEL_NAME[levelOf(e)].toUpperCase()} storm is coming! The cloud flies at ${e.speed} km/s. Slower is a smaller storm, faster is a bigger one. Pick a shield.`,
    source: "NASA · DONKI (space weather database)",
    box: { x: 480, y: 100, w: 760 },
  };
}

/** After the pick: what happened, then a radiation fact. `at` is the scene second of the pick. */
export function resultNotes(at: number, rec: StormRecord): SceneNote[] {
  const shield = SHIELD[rec.shield];
  const size = LEVEL_NAME[rec.level];
  const text =
    rec.hits > 0
      ? `Too thin! The ${size} storm (cloud speed ${rec.speed} km/s) pushed through the ${shield.name} shield. Crew −${2 * rec.hits}. ${shield.lock} water is locked in the walls.`
      : `The ${shield.name} shield held! The ${size} storm (cloud speed ${rec.speed} km/s) passed over. ${shield.lock} water is locked in the walls.`;
  return [
    { from: at + 0.4, to: at + 6, kind: "story", text, box: { x: 440, y: 100, w: 740 }, point: { x: 1020, y: 570 } },
    {
      from: at + 6.4,
      to: NEVER,
      kind: "fact",
      title: "Radiation on Mars",
      text: "Curiosity measured about 0.7 millisieverts of radiation on a normal Mars day. Astronauts on the space station get 0.4 to 1.0 a day. A solar storm can add much more.",
      source: "NASA/JPL · Curiosity RAD instrument (Hassler et al., Science, 2013) · SpaceNews",
      box: { x: 440, y: 100, w: 740 },
    },
  ];
}
