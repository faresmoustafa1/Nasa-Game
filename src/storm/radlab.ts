// Mission ARES — real radiation readings from NASA RadLab (the OSDR Radiation Dosimetry Database).
//
// RadLab holds dose measurements from instruments in space, including Curiosity's RAD (Radiation Assessment
// Detector) on the surface of Mars. These numbers were downloaded from the RadLab data API and are saved here
// (the game does not call RadLab live). Anyone can check them with the query below.
//
//   https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=MSL-RAD-Surface&timestamp>=2024-05-15&timestamp<2024-05-22&absorbed_dose_rate&format=csv
//
// Absorbed dose rate is in microgray per hour (µGy/h): a tiny unit of radiation dose.
//   15–19 May 2024: 413 readings, average 4.1 µGy/h (a quiet week on Mars)
//   20 May 2024:    a solar storm reached Mars; the highest reading was 304.0 µGy/h at 06:15 UTC

export const RADLAB = {
  instrument: "Curiosity rover's RAD, Gale Crater, Mars",
  quiet: { rate: 4.1, when: "15–19 May 2024 (average)" },
  storm: { rate: 304, when: "20 May 2024, 06:15 UTC (highest reading)" },
  query: "visualization.osdr.nasa.gov/radlab/api/?instrument_id=MSL-RAD-Surface&timestamp>=2024-05-15&timestamp<2024-05-22&absorbed_dose_rate",
  source: "NASA OSDR · RadLab radiation dosimetry database (MSL-RAD-Surface) · visualization.osdr.nasa.gov/radlab",
} as const;

/** How many times stronger the storm was than a quiet day (about 74). */
export const RADLAB_TIMES = Math.round(RADLAB.storm.rate / RADLAB.quiet.rate);

/**
 * Hourly highest readings (µGy/h) from 19 May 2024 12:00 UTC to 21 May 2024 23:59 UTC, as [hours since 19 May 12:00 UTC, rate].
 * Same RadLab query as above, widened to 19–22 May. Hours with no reading are left out. Used for the chart on the storm screen.
 */
export const RADLAB_SERIES: ReadonlyArray<readonly [number, number]> = [
  [0, 4.6], [1, 3.9], [2, 4.5], [3, 4.2], [4, 4.3], [5, 4.1], [6, 4.4], [7, 4.2], [8, 4.3], [9, 3.6], [10, 4.7], [11, 3.9], [12, 3.7], [13, 4.1], [14, 4.0], [15, 4.1], [16, 3.8], [17, 235.9], [18, 304.0], [19, 248.2], [20, 179.5], [21, 105.1], [22, 105.1], [23, 92.2], [24, 84.7], [25, 71.5], [26, 56.0], [27, 50.1], [28, 43.8], [29, 38.1], [30, 36.3], [31, 32.0], [32, 30.4], [33, 27.9], [34, 25.0], [35, 23.0], [36, 21.1], [37, 19.5], [38, 18.9], [39, 17.0], [40, 16.9], [41, 15.7], [42, 14.7], [43, 14.2], [44, 13.6], [45, 13.1], [46, 11.8], [47, 11.4], [48, 10.5], [49, 10.1], [50, 9.5], [51, 9.1], [52, 8.3], [53, 8.1], [54, 8.1], [55, 7.4], [56, 7.3], [57, 7.2], [58, 7.3], [59, 7.0],
];
export const RADLAB_SERIES_START = "19 May 2024, 12:00 UTC";

/** A real NASA photo of a solar eruption, shown beside the forecast. It is NOT the storm in the forecast; the caption says so. */
export const ERUPTION_PHOTO = {
  src: `${import.meta.env.BASE_URL}nasa/cme-PIA21836.jpg`,
  caption: "A REAL eruption on the Sun: a flare and a cloud of particles (a CME) blasting off on 14 July 2017. Your storm is a different one.",
  credit: "NASA/JPL · Bastille Day Solar Flare and a Coronal Mass Ejection · PIA21836 · photojournal.jpl.nasa.gov/catalog/PIA21836",
};
