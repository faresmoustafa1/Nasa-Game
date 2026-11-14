// Saves progress in this browser only (localStorage). No accounts, no
// servers, no personal data. If storage is blocked (private window), the
// game still works; it just starts fresh next time.

import type { RunFlare } from "./config";
import type { EndResult, GameState, ReportLine, Snapshot } from "./types";

/** Where the player is in the sol. */
export type Phase =
  | "briefing" // Commander Rivera explains today's problem
  | "play" // PLAN: untimed, spend Time Points
  | "predict" // "What do you think will happen?"
  | "alertIntro" // the alert banner, with a Ready button
  | "alert" // the countdown (Time Points do not apply)
  | "night" // consequences play out
  | "report" // Day Report
  | "debrief" // why + NASA fact + notebook
  | "pause" // Mission Pause, retry
  | "complete"; // all sols done

export type Session = {
  v: 3;
  game: GameState;
  phase: Phase;
  /** Result of the last End Sol, while it is being shown. */
  result: EndResult | null;
  /** The prediction picked this sol. */
  predicted: string | null;
  flare: RunFlare;
  /** The morning of every sol played so far, for "Back to the sol before". */
  mornings: Record<number, Snapshot>;
  /** The base when the alert started, for "Try the alert again". */
  alertStart: Snapshot | null;
  /** What the alert fixed or missed (filled when the alert ends). */
  alertLines: ReportLine[] | null;
};

const KEY = "mission-ares:session:v3";
const COACH_KEY = "mission-ares:coach-done";
const SETTINGS_KEY = "mission-ares:settings";

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Session;
    return data && data.v === 3 && data.game?.v === 3 && data.mornings ? data : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: keep playing without saving */
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

export function coachDone(): boolean {
  try {
    return window.localStorage.getItem(COACH_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCoachDone(): void {
  try {
    window.localStorage.setItem(COACH_KEY, "1");
  } catch {
    /* fine */
  }
}

// ---------------------------------------------------------------------------
// Settings (this browser only)

/** Calm mode: "double" = twice the alert time, "off" = no timer at all. */
export type TimerMode = "normal" | "double" | "off";
export type Settings = { timer: TimerMode };
const DEFAULT_SETTINGS: Settings = { timer: "normal" };

export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const s = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    const timer = s.timer === "double" || s.timer === "off" ? s.timer : "normal";
    return { ...DEFAULT_SETTINGS, timer };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* fine */
  }
}
