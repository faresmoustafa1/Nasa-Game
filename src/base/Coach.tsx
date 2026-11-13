// First-run tips with an arrow, one new idea at a time (Sol 1 only).
// Each tip points at an element with data-coach="<target>".

import { useEffect, useState } from "react";
import { text } from "../game/config";

import type { CoachStep } from "./layout";

type Box = { top: number; left: number; width: number; height: number };

export default function Coach({
  step,
  onNext,
  onSkip,
}: {
  step: CoachStep;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(`[data-coach="${step}"]`);
      if (!el) return setBox(null);
      const r = el.getBoundingClientRect();
      setBox((b) =>
        b && b.top === r.top && b.left === r.left && b.width === r.width && b.height === r.height
          ? b
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
    };
    measure();
    const id = window.setInterval(measure, 300);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, [step]);

  if (!box) return null;

  // Tip below the target if it is in the top half, else above it.
  const below = box.top + box.height / 2 < window.innerHeight / 2;
  const width = Math.min(320, window.innerWidth - 24);
  const cx = box.left + box.width / 2;
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, cx - width / 2));
  const arrowX = Math.max(18, Math.min(width - 18, cx - left));
  const style = below
    ? { top: box.top + box.height + 14, left, width }
    : { bottom: window.innerHeight - box.top + 14, left, width };
  const manual = step === "bars" || step === "endsol";

  return (
    <>
      <div
        className="coach__ring"
        style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
        aria-hidden="true"
      />
      <div className={`coach ${below ? "is-below" : "is-above"}`} style={style} role="note">
        <span className="coach__arrow" style={{ left: arrowX }} aria-hidden="true" />
        <p className="coach__text">{text.coach[step]}</p>
        <div className="coach__btns">
          <button type="button" className="btn btn--small btn--quiet" onClick={onSkip}>
            {text.coach.skip}
          </button>
          {manual && (
            <button type="button" className="btn btn--small" onClick={onNext}>
              {text.coach.next}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
