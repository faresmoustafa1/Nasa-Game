// A scene clock, the same way the prologue keeps time: real elapsed time,
// sampled every 100 ms, so a slow frame never stretches the scene.
//
// Dev only: add ?scene=cruise&at=20 to the URL to start a scene at 20 s.
// (The prologue's own ?t= is left alone, so the two never fight.)

import { useCallback, useEffect, useRef, useState } from "react";
import { isPaused } from "./pause";
import { speedFactor } from "./settings";

type Options = {
  /** Stop counting here and wait (used by scenes that end in a player choice). */
  holdAt?: number;
  /** Call onEnd once when the clock reaches this second. */
  endAt?: number;
  onEnd?: () => void;
};

export function devJump(): number {
  if (!import.meta.env.DEV) return 0;
  return Number(new URLSearchParams(window.location.search).get("at")) || 0;
}

export function useTimeline({ holdAt, endAt, onEnd }: Options) {
  const [t, setT] = useState(() => devJump());
  const origin = useRef(0);
  /** Reading speed from Settings: 0.75 = story runs slower, 1.3 = faster. Read once per scene. */
  const speed = useRef(speedFactor());
  const ended = useRef(false);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    if (origin.current === 0) origin.current = performance.now() - (devJump() * 1000) / speed.current;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // While the ⚙ menu is open, slide the start time forward so the clock stands still.
      if (isPaused()) origin.current += now - last;
      last = now;
      let s = ((performance.now() - origin.current) / 1000) * speed.current;
      if (holdAt !== undefined && s > holdAt) s = holdAt;
      setT(Math.floor(s * 10) / 10);
      if (endAt !== undefined && s >= endAt && !ended.current) {
        ended.current = true;
        onEndRef.current?.();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [holdAt, endAt]);

  /** Jump the clock to `seconds` (used by Skip). */
  const seek = useCallback((seconds: number) => {
    origin.current = performance.now() - (seconds * 1000) / speed.current;
  }, []);

  return { t, seek };
}
