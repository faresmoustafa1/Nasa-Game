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
    id: "water",
    title: "Water: nothing gets wasted",
    text: "On the space station, the crew's sweat, breath and used water are cleaned and drunk again. NASA says the station now recovers 98% of its water.",
    source: "NASA · ISS Environmental Control and Life Support System, 98% water recovery (June 2023, reported by ABC News) · abc7.com/13433546",
  },
  {
    id: "storm",
    title: "Storms: forecasts keep us safe",
    text: "Storms on the Sun can disturb satellites, GPS, radio and even power grids on Earth. Space weather forecasts, like the NASA data in your storm, give people time to prepare.",
    source: "NASA Goddard · How Do Space Weather Effects & Solar Storms Affect Earth? · svs.gsfc.nasa.gov/31248",
  },
];
