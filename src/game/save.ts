// Saves progress in this browser only (localStorage). No accounts, no
// servers, no personal data. If storage is blocked (private window), the
// game still works; it just starts fresh next time.

import type { GameState } from "./types";

const KEY = "mission-ares:save:v1";

export function loadGame(): GameState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    return data && data.v === 1 ? data : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: keep playing without saving */
  }
}

export function clearGame(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
