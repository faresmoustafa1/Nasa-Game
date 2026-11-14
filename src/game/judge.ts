// Mission ARES — Judge Mode.
//
// For a demo, nothing should be random. With Judge Mode on (the button on the title screen, or ?judge=1 in the
// address), every game is the same:
//   weather   -55 °C (the real Jezero average): "cold"
//   crop      Hatch chile peppers
//   rock      the interesting rock is at the Delta foot
//   storm     the saved real medium storm (758 km/s, DONKI 2025-06-06), no live call
//   message   Earth to Mars takes 12 minutes
// The title screen also shows a panel to jump straight to any scene.

const KEY = "ares-judge";

export function isJudge(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("judge") === "1") return true;
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setJudge(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(KEY, "1");
    else {
      window.sessionStorage.removeItem(KEY);
      // ?judge=1 in the address would turn it back on, so take it out
      const url = new URL(window.location.href);
      if (url.searchParams.has("judge")) {
        url.searchParams.delete("judge");
        window.history.replaceState(null, "", url.toString());
      }
    }
  } catch {
    /* private mode: Judge Mode needs ?judge=1 */
  }
}

/** The fixed picks, by the same keys pickNoRepeat uses. */
export const JUDGE_PICKS: Record<string, string> = { cold: "average", crop: "pepper", rock: "foot" };

/** The fixed message delay (minutes) and the fixed saved storm (index into SAVED_EVENTS: 1 = medium). */
export const JUDGE_DELAY_MIN = 12;
export const JUDGE_STORM_INDEX = 1;
