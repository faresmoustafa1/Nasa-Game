// Mission ARES — the in-game menu. A ⚙ button sits in the top-right corner of every scene.
// Opening it pauses the story (see ../game/pause.ts). Inside:
//   Resume · Settings (sound, story speed) · Restart mission · Exit to main menu
// Restart and Exit ask "Are you sure?" first, because the mission so far is lost.
// Sound and speed changes take effect from the next scene.

import { useEffect, useState } from "react";
import { setPaused } from "../game/pause";
import { getSettings, saveSettings } from "../game/settings";
import type { Settings, Speed } from "../game/settings";
import "./menu.css";

type Props = { onRestart: () => void; onExit: () => void };
type View = "main" | "settings" | "restart" | "exit";

const SPEEDS: { value: Speed; text: string }[] = [
  { value: "slow", text: "Slower" },
  { value: "normal", text: "Normal" },
  { value: "fast", text: "Faster" },
];

export default function GameMenu({ onRestart, onExit }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const [settings, setSettings] = useState<Settings>(getSettings);

  const show = (on: boolean) => {
    setOpen(on);
    setView("main");
    setPaused(on);
  };

  // Never leave the game paused when this menu goes away (a scene change, Restart, Exit).
  useEffect(() => () => setPaused(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && show(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const change = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <>
      <button type="button" className="gmenu__gear" aria-label="Menu: settings, restart, exit" onClick={() => show(true)}>
        ⚙
      </button>

      {open && (
        <div className="gmenu" role="dialog" aria-modal="true" aria-label="Game menu">
          <div className="gmenu__card">
            {view === "main" && (
              <>
                <h2>Paused</h2>
                <button type="button" className="gmenu__big" onClick={() => show(false)}>
                  ▶ Resume
                </button>
                <button type="button" onClick={() => setView("settings")}>
                  ⚙ Settings
                </button>
                <button type="button" onClick={() => setView("restart")}>
                  ↺ Restart mission
                </button>
                <button type="button" onClick={() => setView("exit")}>
                  ⏏ Exit to main menu
                </button>
              </>
            )}

            {view === "settings" && (
              <>
                <h2>Settings</h2>
                <div className="gmenu__row">
                  <span>Sound</span>
                  <span className="gmenu__seg">
                    {[true, false].map((v) => (
                      <button key={String(v)} type="button" className={settings.sound === v ? "is-on" : undefined} onClick={() => change({ sound: v })}>
                        {v ? "On" : "Off"}
                      </button>
                    ))}
                  </span>
                </div>
                <div className="gmenu__row">
                  <span>Story speed</span>
                  <span className="gmenu__seg">
                    {SPEEDS.map((s) => (
                      <button key={s.value} type="button" className={settings.speed === s.value ? "is-on" : undefined} onClick={() => change({ speed: s.value })}>
                        {s.text}
                      </button>
                    ))}
                  </span>
                </div>
                <p className="gmenu__note">Changes start from the next scene.</p>
                <button type="button" onClick={() => setView("main")}>
                  ◂ Back
                </button>
              </>
            )}

            {(view === "restart" || view === "exit") && (
              <>
                <h2>{view === "restart" ? "Restart the mission?" : "Exit to the main menu?"}</h2>
                <p className="gmenu__note">Everything you did in this mission will be lost.</p>
                <button
                  type="button"
                  className="gmenu__big gmenu__danger"
                  onClick={() => {
                    show(false);
                    if (view === "restart") onRestart();
                    else onExit();
                  }}
                >
                  {view === "restart" ? "Yes, start again" : "Yes, exit"}
                </button>
                <button type="button" onClick={() => setView("main")}>
                  No, go back
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
