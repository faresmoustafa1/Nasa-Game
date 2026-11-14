// Mission ARES — the words of the solar storm (1600 × 900 coordinates).
// The alarm and the radio message are on the scene clock; the result notes start when the shield is picked.
// Add every fact's source to the Data Sources screen.

import type { SceneNote } from "../game/notes";
import { LEVEL_NAME, SHIELD } from "../game/state";
import type { Level, StormRecord } from "../game/state";
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

const DONKI_SOURCE = "NASA · DONKI space weather database, with NASA's WSA-Enlil model";

/** "1 Nov", or null if the time cannot be read. */
const shortDate = (isoTime: string) => {
  const d = new Date(isoTime);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};

/** One size bigger than the forecast, or null if it is already the biggest. */
const bigger = (l: Level) => (l < 3 ? LEVEL_NAME[(l + 1) as Level] : null);

/** Mission Control's forecast. A big flare means the forecast cannot arrive in time: then the player has to decide alone. */
export function radioNote(e: StormEvent, delayMin: number): SceneNote {
  const m = Math.max(1, Math.round(delayMin));
  if (messageLost(e)) {
    return {
      from: 3.4,
      to: NEVER,
      kind: "radio",
      title: "No forecast in time",
      text: `A huge ${e.flare} flare! Its fastest particles reach Mars in minutes. A message from Earth takes about ${m} minutes, so no forecast can arrive in time. Pick a shield yourself.`,
      source: DONKI_SOURCE,
      box: { x: 480, y: 100, w: 730 },
    };
  }
  const size = levelOf(e);
  const day = e.arrival ? shortDate(e.arrival) : null;
  const where = e.marsHit
    ? `NASA's model says it ${e.glancing ? "brushes past" : "hits"} Mars${day ? ` on ${day}` : ""}.`
    : "This real cloud was aimed elsewhere, so we use its speed for practice.";
  const maybe = bigger(size) ? ` Forecasts can be off: it could be ${bigger(size)}.` : " Forecasts can be off, but this one is already the biggest.";
  return {
    from: 3.4,
    to: NEVER,
    kind: "radio",
    title: "Storm forecast",
    text: `Forecast: a ${LEVEL_NAME[size].toUpperCase()} storm. The cloud flies at ${e.speed} km/s. ${where}${maybe} Pick a shield.`,
    source: DONKI_SOURCE,
    box: { x: 480, y: 100, w: 730 },
  };
}

/** After the pick: what happened, then two facts. `at` is the scene second of the pick. */
export function resultNotes(at: number, rec: StormRecord): SceneNote[] {
  const shield = SHIELD[rec.shield];
  const size = LEVEL_NAME[rec.level];
  const surprise =
    rec.forecast === null ? "" : rec.forecast < rec.level ? `It was bigger than the forecast! ` : rec.forecast > rec.level ? `It was smaller than the forecast. ` : "";
  const text =
    rec.hits > 0
      ? `${surprise}Too thin! The ${size} storm pushed through the ${shield.name} shield. Crew −${2 * rec.hits}. ${shield.lock} water is locked in the walls.`
      : `${surprise}The ${shield.name} shield held! The ${size} storm passed over. ${shield.lock} water is locked in the walls.`;
  return [
    { from: at + 0.4, to: at + 6, kind: "story", text, box: { x: 400, y: 100, w: 680 }, point: { x: 1020, y: 570 } },
    {
      from: at + 6.4,
      to: at + 13,
      kind: "fact",
      title: "Why water walls?",
      text: "Water is full of hydrogen, which is good at stopping radiation particles. NASA's Orion astronauts plan to build a storm shelter from the food and water already on board.",
      source: "NASA Science · How NASA Will Protect Astronauts From Space Radiation at the Moon · science.nasa.gov",
      box: { x: 440, y: 100, w: 740 },
    },
    {
      from: at + 13.4,
      to: NEVER,
      kind: "fact",
      title: "Radiation on Mars",
      text: "Mars has no magnetic shield and very thin air. Curiosity measured about 0.67 millisieverts of radiation a day on the surface, even with no storm.",
      source: "Hassler et al., Mars' Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity Rover, Science (2014) · ntrs.nasa.gov/citations/20180007641",
      box: { x: 440, y: 100, w: 740 },
    },
  ];
}
