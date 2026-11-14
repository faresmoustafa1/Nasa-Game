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
      { scene: "Prologue", what: "How rockets fly, and how fast you need to go to stay in orbit (about 28,000 km/h).", source: "NASA Glenn · Beginner's Guide to Rockets" },
      { scene: "Cruise", what: "The trip to Mars takes about 7 months.", source: "NASA/JPL · Mars 2020 Perseverance mission press kit" },
      { scene: "Landing", what: "Landing takes about 7 minutes, from 19,500 km/h to almost zero.", source: "NASA/JPL · Mars 2020 Perseverance mission press kit" },
      { scene: "Landing", what: "Jezero Crater was once flooded, and a river ran in.", source: "NASA/JPL · Mars 2020 Perseverance landing press kit" },
      { scene: "Tablet and base", what: "A machine splits water into oxygen using power.", source: "NASA · ISS Environmental Control and Life Support System" },
      { scene: "The night puzzle", what: "The space station's oxygen maker splits water into oxygen and hydrogen.", source: "NASA Technical Reports Server · ISS Oxygen Generation Assembly (ICES-2019-153)" },
      { scene: "Morning", what: "A day on Mars (a sol) lasts 24 hours 39 minutes.", source: "Royal Museums Greenwich · Sol" },
      { scene: "The storm", what: "About 0.7 millisieverts a day on Mars, compared with 0.4 to 1.0 on the space station.", source: "NASA/JPL · Curiosity RAD instrument (Hassler et al., Science, 2013) · SpaceNews" },
      { scene: "The rover", what: "Jezero is about 45 km wide, with an ancient lake and delta.", source: "NASA · Mars 2020 Perseverance mission (science.nasa.gov)" },
      { scene: "The rover", what: "The 2018 dust storm that ended the Opportunity rover.", source: "NASA/JPL · Opportunity mission end announcement, Feb 13, 2019" },
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
      { scene: "All the numbers", what: "Power, Water and Air costs, rock points, the +2 bonus rock, the crew faces and the badge scores are game rules, made to be a fair puzzle.", source: "Mission ARES design" },
      { scene: "The greenhouse", what: "Each crop is a real space crop, but its Water and Light numbers are game values that fit the plant.", source: "Mission ARES design" },
    ],
  },
];
