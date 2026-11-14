// Mission ARES — every source in the game, for the Data Sources screen.
// When you add a fact with a `source` to any scene, add it here too. Sources that already live in one place
// (crops, weather, Earth cards) are imported, so they cannot drift.

import { CROPS } from "../greenhouse/crops";
import { EARTH_CARDS } from "../result/earth";
import { WEATHER_SOURCE } from "../rover/weather";

export type SourceEntry = { scene: string; what: string; source: string };
export type SourceGroup = { id: string; title: string; blurb: string; items: SourceEntry[] };

export const SOURCE_GROUPS: SourceGroup[] = [
  {
    id: "data",
    title: "Real NASA data the game uses",
    blurb: "These numbers change what happens in the game.",
    items: [
      {
        scene: "The solar storm",
        what: "A real recent Sun eruption (speed and size) sets how big the storm is. If NASA is slow or away, the game uses one of three saved real events.",
        source: "NASA · DONKI space weather database (CME and FLR) · api.nasa.gov",
      },
      {
        scene: "The rover: message from Earth",
        what: "How many minutes a radio message takes from Earth to Mars today, worked out from where the two planets are.",
        source: "NASA/JPL Solar System Dynamics · approximate planet positions · ssd.jpl.nasa.gov/planets/approx_pos.html; NASA Space Communications",
      },
      {
        scene: "The garage: how cold it is",
        what: "A saved real temperature at Jezero (−20, −22, −26, −55 or −83 °C), picked at random. NASA has no live feed for Jezero, so these are saved readings.",
        source: WEATHER_SOURCE,
      },
    ],
  },
  {
    id: "facts",
    title: "Space facts shown in the game",
    blurb: "Each one appears on screen with its source.",
    items: [
      { scene: "Prologue", what: "Planet or star? Planets shine steady, stars twinkle.", source: "NASA Science · Night Sky Network" },
      { scene: "Prologue", what: "Planets orbit on one flat path, so they look lined up.", source: "NASA Science · What's Up: Skywatching" },
      { scene: "Landing", what: "Landing takes only about 7 minutes (the ship slows from 19,500 km/h to almost zero).", source: "NASA/JPL · Mars 2020 Perseverance mission press kit" },
      { scene: "Tablet and base", what: "A machine splits water into oxygen using power.", source: "NASA · ISS Environmental Control and Life Support System" },
      { scene: "The night puzzle", what: "The space station's oxygen maker splits water into oxygen and hydrogen.", source: "NASA Technical Reports Server · ISS Oxygen Generation Assembly (ICES-2019-153)" },
      { scene: "Morning", what: "A day on Mars (a sol) lasts 24 hours 39 minutes.", source: "Royal Museums Greenwich · Sol" },
      { scene: "The storm", what: "About 0.7 millisieverts a day on Mars, compared with 0.4 to 1.0 on the space station.", source: "NASA/JPL · Curiosity RAD instrument (Hassler et al., Science, 2013) · SpaceNews" },
      { scene: "The rover", what: "Why the rover collects rocks: the delta, where a river once flowed into a lake, is one of the best places on Mars to look for signs of ancient life.", source: "NASA Science · Two Perseverance Sampling Locations in Jezero's Delta (Sept 15, 2022)" },
      { scene: "The rover: LAVA rock", what: "The crater floor is igneous rock (made from magma or lava). Its crystals record when it formed, so it can tell when the lake was there.", source: "NASA Science · Perseverance science highlights" },
      { scene: "The rover: LAKE MUD rock", what: "Wildcat Ridge formed as mud and fine sand settled in a drying salty lake. It had the most organic matter found by the mission so far, and this kind of rock is ideal for keeping signs of ancient life.", source: "NASA · Perseverance Rover Investigates Geologically Rich Mars Terrain (Sept 15, 2022)" },
      { scene: "The rover: RIVER SAND rock", what: "Skinner Ridge is a sandstone with grains and rock bits made far from Jezero Crater.", source: "NASA · Perseverance Rover Investigates Geologically Rich Mars Terrain (Sept 15, 2022)" },
      { scene: "The rover", what: "Jezero is about 45 km wide, with an ancient lake and delta.", source: "NASA · Mars 2020 Perseverance mission (science.nasa.gov)" },
      { scene: "The rover", what: "The 2018 dust storm that ended the Opportunity rover.", source: "NASA/JPL · Opportunity mission end announcement, Feb 13, 2019" },
      { scene: "Junior Astronaut Test", what: "The three questions only use facts from this list (lake mud rock, the 7-minute landing, oxygen from water). It is a game badge, not a real NASA program.", source: "Mission ARES design, with the sources above" },
      { scene: "The garage", what: "Jezero's average air temperature is about −55 °C, and it swings 50 to 60 °C between day and night.", source: "NASA/JPL · Perseverance MEDA (first 250 sols, via Space.com); NASA" },
      ...Object.values(CROPS).map((c) => ({ scene: `The greenhouse: ${c.name}`, what: c.fact.text, source: c.fact.source })),
    ],
  },
  {
    id: "earth",
    title: "Back on Earth cards",
    blurb: "On the result screen.",
    items: EARTH_CARDS.map((c) => ({ scene: c.title, what: c.text, source: c.source })),
  },
  {
    id: "game",
    title: "Made up for the game (not NASA data)",
    blurb: "We say this out loud so nobody gets confused.",
    items: [
      { scene: "All the numbers", what: "Power, Water and Air costs, rock points, the +2 for the rock the science team needs, the crew faces and the badge scores are game rules, made to be a fair puzzle.", source: "Mission ARES design" },
      { scene: "The greenhouse", what: "Each crop is a real space crop, but its Water and Light numbers are game values that fit the plant.", source: "Mission ARES design" },
    ],
  },
];
