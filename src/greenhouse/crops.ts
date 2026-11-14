// Mission ARES — the crop of the game. A different real space-grown crop each game (never the same twice in a row).
//
// The crops and the facts are real NASA space-garden crops. The water and light numbers are GAME values,
// made to feel like each plant (a quick radish is easy, a fruiting tomato wants the brightest light).
// Water and light are 0–3. If the greenhouse is the second job, every crop needs 1 more Water.
// "Lush" (one more of each, 1 more harvest) only exists when the lamp and tank can reach that high.

import { pickNoRepeat } from "../game/random";

export type CropId = "radish" | "lettuce" | "mizuna" | "tomato" | "pepper";

export type Crop = {
  id: CropId;
  name: string;
  /** Water drops (first job). */
  water: number;
  /** Lamp steps. */
  light: number;
  /** Harvest points for healthy plants, and for lush plants (null: this crop cannot be lush). */
  grow: number;
  lush: number | null;
  /** Short kid-friendly trait shown in the plan. */
  trait: string;
  /** A real NASA fact about it, with its source. */
  fact: { title: string; text: string; source: string };
};

export const CROPS: Record<CropId, Crop> = {
  radish: {
    id: "radish",
    name: "Radishes",
    water: 1,
    light: 1,
    grow: 3,
    lush: 5,
    trait: "Fast and easy",
    fact: {
      title: "Radishes in space",
      text: "NASA chose radishes for the Plant Habitat-02 experiment on the space station because they are well understood and reach maturity in just 27 days.",
      source: "NASA · Astronauts Harvest Radish Crop on International Space Station (Plant Habitat-02) · nasa.gov/feature/astronauts-harvest-radish-crop-on-international-space-station",
    },
  },
  lettuce: {
    id: "lettuce",
    name: "Lettuce",
    water: 1,
    light: 2,
    grow: 4,
    lush: 7,
    trait: "Loves light",
    fact: {
      title: "Lettuce in space",
      text: "The Veggie garden on the space station has grown lettuce. NASA has also grown tomatoes and radishes in space, and learned a lot about how to do it well.",
      source: "NASA · Growing plants in space (Veggie and Advanced Plant Habitat) · nasa.gov/?p=70594",
    },
  },
  mizuna: {
    id: "mizuna",
    name: "Mizuna mustard greens",
    water: 2,
    light: 1,
    grow: 4,
    lush: 7,
    trait: "Loves water",
    fact: {
      title: "Mizuna in space",
      text: "The Veg-04 experiments grew mizuna mustard, a leafy green, on the space station under different light. The crew rated how it tasted.",
      source: "NASA · Growing plants in space (Veg-04A, Veg-04B) · nasa.gov/?p=70594; science.nasa.gov/?p=19997",
    },
  },
  tomato: {
    id: "tomato",
    name: "Dwarf tomatoes",
    water: 2,
    light: 3,
    grow: 6,
    lush: null,
    trait: "Needs the brightest light",
    fact: {
      title: "Tomatoes in space",
      text: "In the Veg-05 experiment, 'Red Robin' dwarf tomatoes were tricky: watering was hard and the air was unexpectedly dry. Only 12 ripe tomatoes grew. Scientists say light can change a plant's growth, yield and flavor.",
      source: "NASA · Veg-05 Tomato Crop Production on the ISS · ntrs.nasa.gov/citations/20230008751",
    },
  },
  pepper: {
    id: "pepper",
    name: "Hatch chile peppers",
    water: 2,
    light: 2,
    grow: 5,
    lush: 8,
    trait: "Water makes it spicy",
    fact: {
      title: "Chile peppers in space",
      text: "In Plant Habitat-04, four pepper plants grew for 137 days and gave 26 peppers. NASA says the amount of water they get is probably the biggest factor in how spicy they turn out.",
      source: "NASA · Plant Habitat-04 facts, and the PH-04 harvest report · nasa.gov/sites/default/files/atoms/files/plant_habitat-04.pdf; nasa.gov/?p=73108",
    },
  },
};

export const CROP_IDS = Object.keys(CROPS) as CropId[];

/** A random crop, never the same as last game's in this tab. Dev: ?crop=radish|lettuce|mizuna|tomato|pepper. */
export function pickCrop(): CropId {
  if (import.meta.env.DEV) {
    const f = new URLSearchParams(window.location.search).get("crop") as CropId | null;
    if (f && f in CROPS) return f;
  }
  return pickNoRepeat("crop", CROP_IDS);
}
