// Mission ARES — every source in the game, for the Data Sources screen.
// When you add a fact with a `source` to any scene, add it here too. Sources that already live in one place
// (crops, weather, Earth cards) are imported, so they cannot drift.

import { CROPS } from "../greenhouse/crops";
import { OSDR_FACT } from "../greenhouse/notes";
import { EARTH_CARDS } from "../result/earth";
import { DELTA_PHOTO } from "../rover/sites";
import { WEATHER_SOURCE } from "../rover/weather";
import { ERUPTION_PHOTO, RADLAB } from "../storm/radlab";

export type SourceEntry = { scene: string; what: string; source: string };
export type SourceGroup = { id: string; title: string; blurb: string; items: SourceEntry[] };

export const SOURCE_GROUPS: SourceGroup[] = [
  {
    id: "data",
    title: "Real NASA data the game uses",
    blurb: "These numbers change what happens in the game.",
    items: [
      {
        scene: "The solar storm: the forecast",
        what: "A real Sun eruption (a CME) from the last 30 days, fetched live: its speed (and any proton event) sets the forecast size, and NASA's WSA-Enlil model says when it reaches Mars. The game picks a cloud the model sends to Mars. If NASA is slow or away, it uses one of three saved real events (25 Oct 2026, 6 Jun 2025, 9 Oct 2024). The event's DONKI ID is shown on screen.",
        source: "NASA · DONKI space weather database (CME and FLR, with WSA-Enlil runs) · api.nasa.gov; ccmc.gsfc.nasa.gov/DONKI",
      },
      {
        scene: "The solar storm: real radiation",
        what: `Real readings from ${RADLAB.instrument}: about ${RADLAB.quiet.rate} microgray per hour on quiet days (${RADLAB.quiet.when}) and up to ${RADLAB.storm.rate} during the solar storm of ${RADLAB.storm.when}. The chart shows the highest reading of each hour, 19–22 May 2024. Saved from RadLab, not live.`,
        source: `${RADLAB.source} · query: ${RADLAB.query}`,
      },
      {
        scene: "The rover and the storm: message from Earth",
        what: "How many minutes a radio message takes from Earth to Mars today, worked out from where the two planets are. It sets the wait for Earth's advice, and why a storm forecast can come too late.",
        source: "NASA/JPL Solar System Dynamics · approximate planet positions · ssd.jpl.nasa.gov/planets/approx_pos.html; NASA Space Communications",
      },
      {
        scene: "The solar storm: the photo",
        what: "A real NASA image of a flare and a coronal mass ejection (14 July 2017), shown as an example of what a storm looks like. It is not the event in the forecast.",
        source: ERUPTION_PHOTO.credit,
      },
      {
        scene: "The garage: how cold it is",
        what: "A saved real temperature at Jezero (−20, −22, −26, −55 or −83 °C), picked at random. NASA has no live feed for Jezero, so these are saved readings.",
        source: WEATHER_SOURCE,
      },
      {
        scene: "The rover map: a real photo",
        what: "The delta in Jezero Crater, seen from orbit by NASA's Mars Reconnaissance Orbiter (false colors show minerals). The map itself is drawn by hand.",
        source: DELTA_PHOTO.credit,
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
      { scene: "Morning", what: "A day on Mars (a sol) lasts 24 hours 39 minutes.", source: "NASA Goddard · Time on Mars · eclipse2017.nasa.gov/time-mars" },
      { scene: "Morning", what: "Solar panels charge the batteries at sunrise; dust in the air means less sunlight. Dust ended the solar-powered Opportunity rover.", source: "NASA/JPL · Opportunity mission end announcement, Feb 13, 2019" },
      { scene: "The storm", what: "Water is good at stopping radiation particles; NASA's Orion crews plan to build a storm shelter from the food and water on board.", source: "NASA Science · How NASA Will Protect Astronauts From Space Radiation at the Moon · science.nasa.gov" },
      { scene: "The storm", what: "Mars has no magnetic shield and thin air; Curiosity measured about 0.67 millisieverts a day on the surface.", source: "Hassler et al., Mars' Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity Rover, Science (2014) · ntrs.nasa.gov/citations/20180007641" },
      { scene: "The storm", what: "A big flare's light and fastest particles reach Mars in minutes, before Earth can send a forecast.", source: "NASA Science · How NASA Will Protect Astronauts From Space Radiation at the Moon; message delay as above" },
      { scene: "The greenhouse: OSDR study", what: OSDR_FACT.text, source: OSDR_FACT.source },
      { scene: "The rover", what: "Why the rover collects rocks: the delta, where a river once flowed into a lake, is one of the best places on Mars to look for signs of ancient life.", source: "NASA Science · Two Perseverance Sampling Locations in Jezero's Delta (Sept 15, 2022)" },
      { scene: "The rover: LAVA rock", what: "The crater floor is igneous rock (made from magma or lava). Its crystals record when it formed, so it can tell when the lake was there.", source: "NASA Science · Perseverance science highlights" },
      { scene: "The rover: LAKE MUD rock", what: "Wildcat Ridge formed as mud and fine sand settled in a drying salty lake. It had the most organic matter found by the mission so far, and this kind of rock is ideal for keeping signs of ancient life.", source: "NASA · Perseverance Rover Investigates Geologically Rich Mars Terrain (Sept 15, 2022)" },
      { scene: "The rover: RIVER SAND rock", what: "Skinner Ridge is a sandstone with grains and rock bits made far from Jezero Crater.", source: "NASA · Perseverance Rover Investigates Geologically Rich Mars Terrain (Sept 15, 2022)" },
      { scene: "The rover", what: "Jezero is about 45 km wide, with an ancient lake and delta.", source: "NASA · Mars 2020 Perseverance mission (science.nasa.gov)" },
      { scene: "The rover", what: "The 2018 dust storm that ended the Opportunity rover.", source: "NASA/JPL · Opportunity mission end announcement, Feb 13, 2019" },
      { scene: "Junior Astronaut Test", what: "The three questions only use facts from this list (lake mud rock, the 7-minute landing, oxygen from water). It is a game badge, not a real NASA program.", source: "Mission ARES design, with the sources above" },
      { scene: "The garage", what: "Jezero's average air temperature is about −55 °C, and it swings 50 to 60 °C between day and night.", source: "NASA's MEDA team · Rodriguez-Manfredi et al., The diverse meteorology of Jezero crater over the first 250 sols of Perseverance, Nature Geoscience (2023)" },
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
      { scene: "All the numbers", what: "Power, Water and Air costs, the sunrise Power, rock points, the +2 for the rock the science team needs, the crew faces and the badge scores are game rules, made to be a fair puzzle.", source: "Mission ARES design" },
      { scene: "The storm", what: "The forecast comes from real NASA data, but whether the storm turns out one size bigger or smaller is a game roll (fixed for each event, so a replay is the same). Real forecasts can be off too. The shield sizes and crew costs are game values.", source: "Mission ARES design" },
      { scene: "The garage", what: "The temperatures are real; the heater costs and the crew −1 for a cold crew are game values.", source: "Mission ARES design" },
      { scene: "The greenhouse", what: "Each crop is a real space crop, but its Water and Light numbers are game values that fit the plant.", source: "Mission ARES design" },
    ],
  },
];
