// Mission ARES — the Commander's tablet: the three meters and the crew's faces.
//
// It is the one piece of "interface" in the game, so it lives in the story: the
// Commander hands it to the boy. It stays on screen for the rest of the game.
// Every row is a button: tap one and a short note slides out beside it.
// (Colour never carries the meaning alone: each meter has its own icon and number.)

import type { ReactNode } from "react";
import { METER_LABEL, METER_MAX, crewFaces } from "./state";
import type { Face, MeterKey, Meters, TabletFocus } from "./state";
import { TABLET_NOTES } from "./tabletNotes";
import type { TabletNote } from "./tabletNotes";
import "./tablet.css";

const ICONS: Record<MeterKey, ReactNode> = {
  power: <path d="M13 2 5 14h6l-1 8 8-12h-6z" fill="currentColor" />,
  water: <path d="M12 3C12 3 5 11 5 15a7 7 0 0 0 14 0C19 11 12 3 12 3Z" fill="currentColor" />,
  air: (
    <path
      d="M3 8h10a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M3 16h7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  ),
};

function FaceIcon({ face }: { face: Face }) {
  return (
    <svg className={`tablet__face tablet__face--${face}`} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" />
      <circle className="tablet__eye" cx="11" cy={face === "tired" ? 14 : 12} r="2" />
      <circle className="tablet__eye" cx="21" cy={face === "tired" ? 14 : 12} r="2" />
      {face === "happy" && <path className="tablet__mouth" d="M9.5 19Q16 26 22.5 19" />}
      {face === "okay" && <path className="tablet__mouth" d="M10.5 21.5h11" />}
      {face === "tired" && <path className="tablet__mouth" d="M10 23Q16 17.5 22 23" />}
    </svg>
  );
}

type TabletProps = {
  meters: Meters;
  /** Water locked in the shelter walls: shown hatched, and not counted in the number. */
  locked?: number;
  /** Crew score, 0–6. */
  crew: number;
  /** The row whose note is open, if any. */
  focus?: TabletFocus | null;
  /** Rows to pulse ("tap me"). */
  nudge?: TabletFocus[];
  /** If given, rows are tappable. */
  onPick?: (row: TabletFocus) => void;
};

function Note({ note }: { note: TabletNote }) {
  return (
    <div className={`tablet__note${note.source ? " tablet__note--fact" : ""}`} role="status">
      {note.source && <p className="tablet__note-tag">SPACE FACT · {note.title}</p>}
      <p className="tablet__note-text">{note.text}</p>
    </div>
  );
}

export default function Tablet({ meters, locked = 0, crew, focus = null, nudge = [], onPick }: TabletProps) {
  const keys: MeterKey[] = ["power", "water", "air"];
  const faces = crewFaces(crew);
  const usable = (k: MeterKey) => (k === "water" ? Math.max(0, meters.water - locked) : meters[k]);
  return (
    <aside className="tablet" aria-label="Commander's tablet">
      <p className="tablet__title">CREW TABLET</p>
      {keys.map((k) => (
        <div className="tablet__item" key={k}>
          <button
            type="button"
            className={`tablet__row tablet__row--${k}${focus === k ? " is-open" : ""}${nudge.includes(k) ? " is-nudged" : ""}${
              usable(k) <= 3 ? " is-low" : ""
            }`}
            onClick={() => onPick?.(k)}
            aria-label={`${METER_LABEL[k]}: ${usable(k)} of ${METER_MAX}${k === "water" && locked > 0 ? `, ${locked} locked in the shelter walls` : ""}`}
            aria-expanded={focus === k}
          >
            <svg className="tablet__icon" viewBox="0 0 24 24" aria-hidden="true">
              {ICONS[k]}
            </svg>
            <span className="tablet__label">{METER_LABEL[k]}</span>
            <span className="tablet__bar" aria-hidden="true">
              <span style={{ width: `${(usable(k) / METER_MAX) * 100}%` }} />
              {k === "water" && locked > 0 && (
                <span className="tablet__lockseg" style={{ left: `${(usable(k) / METER_MAX) * 100}%`, width: `${(Math.min(locked, meters.water) / METER_MAX) * 100}%` }} />
              )}
            </span>
            <span className="tablet__num">{usable(k)}</span>
          </button>
          {focus === k && <Note note={TABLET_NOTES[k]} />}
        </div>
      ))}
      <div className="tablet__item">
        <button
          type="button"
          className={`tablet__row tablet__row--crew${focus === "crew" ? " is-open" : ""}${nudge.includes("crew") ? " is-nudged" : ""}`}
          onClick={() => onPick?.("crew")}
          aria-label={`Crew: ${faces.filter((f) => f === "happy").length} of 5 happy`}
          aria-expanded={focus === "crew"}
        >
          <span className="tablet__label">Crew</span>
          <span className="tablet__faces" aria-hidden="true">
            {faces.map((f, i) => (
              <FaceIcon key={i} face={f} />
            ))}
          </span>
        </button>
        {focus === "crew" && <Note note={TABLET_NOTES.crew} />}
      </div>
    </aside>
  );
}
