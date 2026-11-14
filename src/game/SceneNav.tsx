// Mission ARES — Next / Back for story scenes.
//
// The visible ◂ ▸ icons sit inside each note box (see notes.tsx). This component only adds the
// keyboard: → is Next, ← is Back. Scenes keep their own pace; the icons are for readers who want
// to go faster or read a note again.

import { useEffect } from "react";

type Props = {
  onBack: () => void;
  onNext: () => void;
  /** Turn the keys off (a puzzle or a task has its own controls). */
  hidden?: boolean;
};

export default function SceneNav({ onBack, onNext, hidden }: Props) {
  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.body.classList.contains("ares-paused")) return;
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden, onBack, onNext]);
  return null;
}
