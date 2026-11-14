// Mission ARES — "Back on Earth": three cards linking the game to real life. Each has a source for the Data Sources screen.

export type EarthCard = { id: string; title: string; text: string; source: string };

export const EARTH_CARDS: EarthCard[] = [
  {
    id: "food",
    title: "Food: growing plants in small spaces",
    text: "Cities keep growing and farms get squeezed. NASA says learning to grow crops in small, controlled spaces, like your greenhouse, can help people make more food on Earth too.",
    source: "NASA · Veg-05 investigation, Earth Applications · science.nasa.gov/biological-physical/investigations/veg-05-rjtim",
  },
  {
    id: "north",
    title: "Food: farms in the far north",
    text: "The Canadian Space Agency worked with Gjoa Haven, a town in the cold, dark Arctic, where a greenhouse in a shipping container runs on wind and solar power and grows fresh vegetables. Growing food there teaches lessons for farms on the Moon and Mars.",
    source: "Canadian Space Agency · Food production on the Moon and in remote areas (youth toolkit) · asc-csa.gc.ca/eng/youth-educators/toolkits/food-production; the Naurvik greenhouse project (CBC News, 2020)",
  },
  {
    id: "egypt",
    title: "Egypt: farming in the desert",
    text: "Only about 4% of Egypt's land can grow crops, and almost everyone lives along the Nile. Satellites show new farms and canals spreading into the desert west of the Nile Delta. Growing a lot with very little water is the same puzzle as your Mars greenhouse.",
    source: "NASA Earth Observatory · The Nile Delta's Disappearing Farmland (earthobservatory.nasa.gov/images/149183); A \"New Delta\" in the Desert (earthobservatory.nasa.gov/images/153752)",
  },
  {
    id: "water",
    title: "Water: nothing gets wasted",
    text: "On the space station, the crew's sweat, breath and used water are cleaned and drunk again. NASA says the station now recovers 98% of its water.",
    source: "NASA · NASA Achieves Water Recovery Milestone on International Space Station (June 2023) · nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station",
  },
  {
    id: "storm",
    title: "Storms: forecasts keep us safe",
    text: "Storms on the Sun can disturb satellites, GPS, radio and even power grids on Earth. Space weather forecasts, like the NASA data in your storm, give people time to prepare.",
    source: "NASA Goddard · How Do Space Weather Effects & Solar Storms Affect Earth? · svs.gsfc.nasa.gov/31248",
  },
];
