// Mission ARES — the words of the greenhouse (1600 × 900 coordinates). Add every fact's source to the Data Sources screen.

import type { SceneNote } from "../game/notes";
import { LATER_COST } from "../game/state";
import type { Crop } from "./crops";
import { needWater, resultOf } from "./rules";
import type { Outcome } from "./rules";

const NEVER = 9999;

export function planNote(crop: Crop, first: boolean): SceneNote {
  const later = first ? "" : ` ${LATER_COST.greenhouse.note}`;
  return {
    from: 0,
    to: NEVER,
    kind: "story",
    text: `Today's crop: ${crop.name}! ${crop.trait}. They need ${needWater(crop, first)} water and ${crop.light} light.${later} Drag the water drops, set the lamp, then press Grow!`,
    box: { x: 400, y: 90, w: 820 },
  };
}

/** `at` is the scene second when the plants finished growing. */
export function resultNotes(crop: Crop, out: Outcome, at: number): SceneNote[] {
  const r = resultOf(crop, out);
  const text =
    out === "wilt"
      ? `The ${crop.name.toLowerCase()} droop. They did not get enough water or light. The crew misses fresh food. Crew −1.`
      : out === "grow"
        ? `Healthy ${crop.name.toLowerCase()}! Fresh food for the crew. Harvest +${r.harvest}.`
        : `A huge harvest! Extra water and light made the ${crop.name.toLowerCase()} burst with food. Crew +1, harvest +${r.harvest}.`;
  return [
    { from: at, to: at + 5.5, kind: "story", text, box: { x: 400, y: 90, w: 820 } },
    {
      from: at + 5.5,
      to: at + 12.5,
      kind: "fact",
      title: crop.fact.title,
      text: crop.fact.text,
      source: crop.fact.source,
      box: { x: 400, y: 90, w: 820 },
    },
    {
      from: at + 12.9,
      to: NEVER,
      kind: "fact",
      title: OSDR_FACT.title,
      text: OSDR_FACT.text,
      source: OSDR_FACT.source,
      box: { x: 400, y: 90, w: 820 },
    },
  ];
}

/** A real study from NASA's Open Science Data Repository: why fresh food matters to the crew score. */
export const OSDR_FACT = {
  title: "Is space food safe?",
  text: "NASA brought lettuce from the space station's Veggie garden back to Earth and tested it for germs and nutrients. Space food has to be safe AND healthy.",
  source: "NASA OSDR · OSD-268: Microbiological and nutritional analysis of lettuce crops grown on the ISS (VEG-01B) · osdr.nasa.gov/bio/repo/data/studies/OSD-268",
};
