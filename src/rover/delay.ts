// Mission ARES — how long a radio message takes from Earth to Mars, today.
//
// Radio travels at the speed of light, so the delay is just distance ÷ light speed. We work out where
// Earth and Mars are today from NASA/JPL's published approximate orbital elements ("Keplerian Elements for
// Approximate Positions of the Major Planets", valid 1800–2050), then divide by the speed of light.
// It is an estimate (good to a few percent), so the game says "about". Real range: about 4 to 24 minutes.
//
// Add to the Data Sources screen: NASA/JPL Solar System Dynamics, approximate planet positions
// (https://ssd.jpl.nasa.gov/planets/approx_pos.html); NASA Space Communications, "7 things you need to know".

type Elements = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

// a (AU), e, I (deg), L (deg), longitude of perihelion (deg), longitude of node (deg), then each one's change per century.
const EARTH: Elements = [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37306329, 0.32327364, 0.0];
const MARS: Elements = [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343];

const RAD = Math.PI / 180;
const LIGHT_SECONDS_PER_AU = 499.0048;

function position(el: Elements, T: number): [number, number, number] {
  const [a, e, I, L, peri, node] = [0, 1, 2, 3, 4, 5].map((i) => el[i] + el[i + 6] * T);
  let M = (L - peri) % 360;
  if (M > 180) M -= 360;
  const Mr = M * RAD;
  let E = Mr;
  for (let i = 0; i < 20; i++) E -= (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (peri - node) * RAD;
  const om = node * RAD;
  const inc = I * RAD;
  return [
    (Math.cos(w) * Math.cos(om) - Math.sin(w) * Math.sin(om) * Math.cos(inc)) * x + (-Math.sin(w) * Math.cos(om) - Math.cos(w) * Math.sin(om) * Math.cos(inc)) * y,
    (Math.cos(w) * Math.sin(om) + Math.sin(w) * Math.cos(om) * Math.cos(inc)) * x + (-Math.sin(w) * Math.sin(om) + Math.cos(w) * Math.cos(om) * Math.cos(inc)) * y,
    Math.sin(w) * Math.sin(inc) * x + Math.cos(w) * Math.sin(inc) * y,
  ];
}

/** Used when the date is outside the orbit data's range (1800–2050) or the maths fails: a typical delay. */
export const FALLBACK_DELAY_MIN = 12;

/** Today's delay in minutes, or FALLBACK_DELAY_MIN if it cannot be worked out (never NaN, always in the real 3–23 min range). */
export function safeDelayMinutes(date: Date = new Date()): number {
  const year = date.getUTCFullYear();
  if (!(year >= 1800 && year <= 2050)) return FALLBACK_DELAY_MIN;
  const d = earthMarsDelayMinutes(date);
  return Number.isFinite(d) && d >= 3 && d <= 23 ? d : FALLBACK_DELAY_MIN;
}

/** About how many minutes a radio message takes from Earth to Mars on `date` (one way). */
export function earthMarsDelayMinutes(date: Date): number {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5;
  const T = (jd - 2_451_545.0) / 36_525;
  const e = position(EARTH, T);
  const m = position(MARS, T);
  const au = Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]);
  return (au * LIGHT_SECONDS_PER_AU) / 60;
}
