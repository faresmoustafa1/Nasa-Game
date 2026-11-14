// Mission ARES — the title screen, with the Judge Mode switch and a scene jumper (for demos).

import { useState } from "react";
import { StarField } from "../game/art";
import { JUDGE_DELAY_MIN, isJudge, setJudge } from "../game/judge";
import "./title.css";

export type JumpKey =
  | "prologue"
  | "cruise"
  | "touchdown"
  | "hub"
  | "greenhouse"
  | "rover"
  | "night"
  | "storm"
  | "greenhouse2"
  | "rover2"
  | "crowning"
  | "result"
  | "sources";

const JUMPS: { key: JumpKey; label: string }[] = [
  { key: "prologue", label: "1 · Prologue" },
  { key: "cruise", label: "2 · Cruise" },
  { key: "touchdown", label: "3 · Landing" },
  { key: "hub", label: "4 · Base hub" },
  { key: "greenhouse", label: "5 · Greenhouse (first)" },
  { key: "rover", label: "5 · Garage + rover (first)" },
  { key: "night", label: "6 · Night + oxygen puzzle" },
  { key: "storm", label: "7 · Solar storm" },
  { key: "greenhouse2", label: "8 · Greenhouse (second)" },
  { key: "rover2", label: "8 · Garage + rover (second)" },
  { key: "crowning", label: "9 · Crowning" },
  { key: "result", label: "10 · Result" },
  { key: "sources", label: "Data sources" },
];

export default function Title({ onPlay, onJump }: { onPlay: () => void; onJump: (key: JumpKey) => void }) {
  const [judge, setJ] = useState(isJudge);

  return (
    <main className="title">
      <svg className="title__stars" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <StarField count={140} seed={5} />
      </svg>
      <div className="title__box">
        <p className="title__small">A Mars outpost game</p>
        <h1>Mission ARES</h1>
        <p className="title__tag">Four astronauts, one stowaway, and a dust storm. Choose well: every choice costs something.</p>
        <button type="button" className="title__play" onClick={onPlay}>
          ▶ Play
        </button>
        <label className="title__judge">
          <input
            type="checkbox"
            checked={judge}
            onChange={(e) => {
              setJudge(e.target.checked);
              setJ(e.target.checked);
            }}
          />
          Judge mode
        </label>
        {judge && (
          <section className="title__panel" aria-label="Judge mode">
            <p>
              Every game is the same: cold weather (−55 °C), Hatch chile peppers, the interesting rock at the Delta foot, the saved real medium storm
              (758 km/s), and a {JUDGE_DELAY_MIN}-minute message to Earth. Jump to any scene:
            </p>
            <div className="title__jumps">
              {JUMPS.map((j) => (
                <button key={j.key} type="button" onClick={() => onJump(j.key)}>
                  {j.label}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
