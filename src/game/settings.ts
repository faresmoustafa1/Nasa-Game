// Mission ARES — the player's settings (kept in this browser only).
//   sound       Synth sounds on/off.
//   speed       Reading speed: the story clock runs slower or faster ("slow" 0.75, "normal" 1, "fast" 1.3).

export type Speed = "slow" | "normal" | "fast";
export type Settings = { sound: boolean; speed: Speed };

const KEY = "ares-settings";
const DEFAULTS: Settings = { sound: true, speed: "normal" };

export const SPEED_FACTOR: Record<Speed, number> = { slow: 0.75, normal: 1, fast: 1.3 };

export function getSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      sound: parsed.sound !== false,
      speed: parsed.speed === "slow" || parsed.speed === "fast" ? parsed.speed : "normal",
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(next: Settings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: settings last until the page closes */
  }
}

export const speedFactor = () => SPEED_FACTOR[getSettings().speed];
