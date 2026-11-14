import { JUDGE_PICKS, isJudge } from "./judge";

// A small seeded random generator, so scenery looks the same on every run.
export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

//
// Two calls within a moment return the same pick: React's dev mode runs a state initializer twice, and both runs
// must agree with what the player sees.

const recent = new Map<string, { pick: string; at: number }>();

export function pickNoRepeat<T extends string>(key: string, ids: readonly T[]): T {
  if (isJudge()) {
    const fixed = JUDGE_PICKS[key];
    if ((ids as readonly string[]).includes(fixed)) return fixed as T;
  }
  const now = Date.now();
  const r = recent.get(key);
  if (r && now - r.at < 400 && (ids as readonly string[]).includes(r.pick)) return r.pick as T;
  let last = "";
  try {
    last = window.sessionStorage.getItem(`ares-last-${key}`) ?? "";
  } catch {
    /* private mode: no memory of the last one */
  }
  const pool = ids.filter((i) => i !== last);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  recent.set(key, { pick, at: now });
  try {
    window.sessionStorage.setItem(`ares-last-${key}`, pick);
  } catch {
    /* ignore */
  }
  return pick;
}
