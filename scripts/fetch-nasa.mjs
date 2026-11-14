// Mission ARES — saves REAL NASA data for the game's offline fallback.
//
//   npm run fetch-nasa              (uses DEMO_KEY)
//   NASA_API_KEY=yourkey npm run fetch-nasa
//
// Writes src/data/nasa-cache/*.json. Every file records where each value came
// from (the request URL, without the key) and when it was fetched, so the game
// can say "SAVED REAL NASA DATA (from <date>)". Nothing here is hand-written:
// if a request fails, the old file is kept and the script says so.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "nasa-cache");
// Read NASA_API_KEY from .env.local if it is not already set (never printed).
try {
  const env = await readFile(join(ROOT, ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*(NASA_API_KEY)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* no .env.local: use DEMO_KEY */
}
const KEY = process.env.NASA_API_KEY || "DEMO_KEY";
console.log(KEY === "DEMO_KEY" ? "Using DEMO_KEY" : "Using your api.nasa.gov key");
const now = new Date().toISOString();

const hideKey = (url) => url.replace(/api_key=[^&]+/, "api_key=…");

async function getJson(url, { timeoutMs = 60000 } = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${hideKey(url)}`);
  return res.json();
}

async function save(name, data) {
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, name), JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`  saved ${name}`);
}

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    console.warn(`  ! ${name} failed, kept the old file: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// DONKI: real solar flares. (The api.nasa.gov DONKI/FLR route answers 404, so
// we read DONKI's flare *notifications*, which state each flare's class.)

/** Pull "Flare intensity: X1.0 class." style facts out of a DONKI message. */
export function parseFlareMessage(m) {
  const body = m.messageBody || "";
  const cls = body.match(/Flare intensity:\s*([ABCMX]\d+(?:\.\d+)?)\s*class/i)?.[1];
  if (!cls) return null;
  return {
    id: m.messageID,
    classType: cls.toUpperCase(),
    letter: cls.charAt(0).toUpperCase(),
    startTime: body.match(/Flare start time:\s*([0-9T:\-]+Z)/)?.[1] ?? null,
    peakTime: body.match(/Flare peak time:\s*([0-9T:\-]+Z)/)?.[1] ?? null,
    sourceRegion: body.match(/Source region:\s*([NS]\d+[EW]\d+)/)?.[1] ?? null,
    issueTime: m.messageIssueTime,
    url: m.messageURL,
  };
}

// Months with famous real flares (DONKI allows up to about a month per request).
const FLARE_WINDOWS = [
  ["2017-09-01", "2017-09-30"],
  ["2022-04-01", "2022-04-30"],
  ["2024-05-01", "2024-05-31"],
  ["2024-10-01", "2024-10-31"],
];

await step("DONKI flares", async () => {
  const flares = [];
  const requests = [];
  for (const [start, end] of FLARE_WINDOWS) {
    const url = `https://api.nasa.gov/DONKI/notifications?startDate=${start}&endDate=${end}&type=FLR&api_key=${KEY}`;
    const list = await getJson(url);
    requests.push(hideKey(url));
    for (const m of list) {
      const f = parseFlareMessage(m);
      if (f && !flares.some((x) => x.peakTime === f.peakTime && x.classType === f.classType)) flares.push(f);
    }
  }
  flares.sort((a, b) => (a.peakTime ?? a.issueTime).localeCompare(b.peakTime ?? b.issueTime));
  await save("donki-flares.json", {
    source: "NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), via api.nasa.gov",
    docs: "https://api.nasa.gov/ (DONKI) · https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    fetchedAt: now,
    requests,
    count: flares.length,
    flares,
  });
});

// ---------------------------------------------------------------------------
// InSight: real Mars weather (the last sols the API serves, from 2020).

await step("InSight weather", async () => {
  // The same feed api.nasa.gov serves, straight from NASA Mars (no key needed).
  const url = "https://mars.nasa.gov/rss/api/?feed=weather&category=insight_temperature&feedtype=json&ver=1.0";
  const j = await getJson(url);
  const sols = (j.sol_keys || []).map((k) => {
    const s = j[k];
    return {
      sol: Number(k),
      firstUTC: s.First_UTC,
      lastUTC: s.Last_UTC,
      season: s.Season,
      tempMinC: s.AT?.mn ?? null,
      tempMaxC: s.AT?.mx ?? null,
      tempAvgC: s.AT?.av ?? null,
      pressureAvgPa: s.PRE?.av ?? null,
      windAvgMs: s.HWS?.av ?? null,
    };
  });
  await save("insight-weather.json", {
    source: "NASA InSight Mars lander weather (TWINS + PS sensors)",
    docs: "https://api.nasa.gov/ (InSight: Mars Weather Service API) · https://mars.nasa.gov/insight/weather/",
    place: "Elysium Planitia, Mars",
    fetchedAt: now,
    request: hideKey(url),
    sols,
  });
});

// ---------------------------------------------------------------------------
// RadLab (NASA OSDR): real radiation dose measured by Curiosity's RAD on Mars.

await step("RadLab MSL-RAD", async () => {
  const start = "2015-01-01T00:00";
  const end = "2015-01-08T00:00";
  const url =
    "https://visualization.osdr.nasa.gov/radlab/api/?format=json&instrument=MSL-RAD&absorbed_dose_rate=" +
    `&timestamp%3E=${start}&timestamp%3C=${end}`;
  const j = await getJson(url, { timeoutMs: 120000 });
  const col = (name) => j.columns.indexOf(name);
  const vals = j.data.map((r) => r[col("absorbed_dose_rate")]).filter((v) => typeof v === "number");
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  await save("radlab-msl-rad.json", {
    source: "NASA OSDR RadLab — Curiosity rover RAD instrument (MSL-RAD), Mars surface",
    docs: "https://visualization.osdr.nasa.gov/radlab/gui/data-api/",
    fetchedAt: now,
    request: url,
    instrumentId: j.data[0]?.[col("instrument_id")] ?? "MSL-RAD",
    from: start,
    to: end,
    readings: vals.length,
    unit: "µGy/hour (absorbed dose rate)",
    meanPerHour: Number(mean.toFixed(3)),
    meanPerDay: Number((mean * 24).toFixed(1)),
  });
});

// ---------------------------------------------------------------------------
// OSDR: real space-biology studies used on debrief cards.

const STUDIES = ["OSD-268", "OSD-678", "OSD-766"];

await step("OSDR studies", async () => {
  const studies = [];
  for (const id of STUDIES) {
    const url = `https://osdr.nasa.gov/osdr/data/search?term=${id}&type=cgene&size=5`;
    const j = await getJson(url);
    const s = j.hits.hits.map((h) => h._source).find((x) => x.Accession === id);
    if (!s) throw new Error(`${id} not found`);
    studies.push({
      id,
      title: s["Study Title"],
      description: s["Study Description"],
      mission: s.Mission?.Name ?? null,
      missionStart: s.Mission?.["Start Date"] ?? null,
      missionEnd: s.Mission?.["End Date"] ?? null,
      releaseDate: s["Study Public Release Date"] ? new Date(s["Study Public Release Date"] * 1000).toISOString().slice(0, 10) : null,
      url: `https://osdr.nasa.gov/bio/repo/data/studies/${id}`,
      request: url,
    });
  }
  await save("osdr-studies.json", {
    source: "NASA Open Science Data Repository (OSDR)",
    docs: "https://osdr.nasa.gov/bio/repo/",
    fetchedAt: now,
    studies,
  });
});

// ---------------------------------------------------------------------------
// APOD: NASA's real picture of the day, on the days of our saved flares.

await step("APOD", async () => {
  const flaresFile = JSON.parse(await readFile(join(OUT, "donki-flares.json"), "utf8"));
  const dates = [...new Set(flaresFile.flares.filter((f) => f.letter === "X").map((f) => (f.peakTime ?? f.issueTime).slice(0, 10)))].slice(0, 8);
  const days = [];
  for (const date of dates) {
    const url = `https://api.nasa.gov/planetary/apod?api_key=${KEY}&date=${date}&thumbs=true`;
    const a = await getJson(url);
    // In 2026 the API answers some dates with a placeholder (the NASA logo,
    // title "NASA Science"). Then read the official APOD page instead.
    const placeholder = a.title === "NASA Science" || /nasa-logo/.test(a.url ?? "");
    if (!placeholder) {
      days.push({
        date: a.date,
        title: a.title,
        mediaType: a.media_type,
        url: a.url,
        pageUrl: `https://apod.nasa.gov/apod/ap${date.slice(2).replace(/-/g, "")}.html`,
        credit: a.copyright?.trim() ?? "NASA (public domain)",
        request: hideKey(url),
      });
      continue;
    }
    const page = `https://apod.nasa.gov/apod/ap${date.slice(2).replace(/-/g, "")}.html`;
    const res = await fetch(page, { signal: AbortSignal.timeout(60000), headers: { "User-Agent": "Mozilla/5.0 (Mission ARES data script)" } });
    const html = await res.text();
    const meta = (p) => html.match(new RegExp(`<meta property="${p}" content="([^"]+)"`))?.[1] ?? null;
    const credit = html
      .match(/(?:Image|Video|Illustration|Animation|Data)[^<:]{0,40}Credit[^<:]{0,40}:\s*((?:\s*<a[^>]*>[^<]*<\/a>|[^<])+)/)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    const title = meta("og:title")?.replace(/^APOD:\s*\d{4} \w+ \d+ - /, "").replace(/ - NASA Science$/, "");
    if (!title || !meta("og:image")) {
      console.warn(`  ! APOD ${date}: no real picture found, skipped`);
      continue;
    }
    days.push({
      date,
      title,
      mediaType: "image",
      url: meta("og:image"),
      pageUrl: meta("og:url") ?? res.url,
      credit: credit || null,
      request: page,
    });
  }
  await save("apod.json", {
    source: "NASA Astronomy Picture of the Day (APOD), via api.nasa.gov",
    docs: "https://api.nasa.gov/ (APOD)",
    fetchedAt: now,
    days,
  });
});

console.log("Done. Check src/data/nasa-cache/ and commit the files.");
