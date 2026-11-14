// Mission ARES — the words, inside the scene (shared by every Mars scene).
//
// Same idea as the prologue: one short note at a time, placed next to what it
// talks about, with a dotted pointer line. Coordinates are in the 1600 × 900
// scene. Kinds:
//   story  dark glass     what is happening, or what someone says
//   shout  warm, bold     a loudspeaker, an alarm
//   fact   taped paper    a SPACE FACT (always give a `source`)
//   radio  green screen   a message from Mission Control (used from the rover scene on)
//
// List every fact's `source` on the Data Sources screen.

export type SceneNote = {
  from: number;
  to: number;
  kind: "story" | "fact" | "shout" | "radio";
  text: string;
  /** fact: "SPACE FACT · title"; radio: "MISSION CONTROL · title". */
  title?: string;
  source?: string;
  box: { x: number; y: number; w: number };
  point?: { x: number; y: number };
};

// Rough text metrics at the note font sizes (viewBox units), used to size each box.
const NOTE_CHAR_W = 17;
const NOTE_LINE_H = 40;

/** The ◂ ▸ icons inside a note box. */
export type NoteNav = { onBack: () => void; onNext: () => void };
const NAV_H = 44;

function noteHeight(note: SceneNote, nav = false) {
  const perLine = Math.max(8, Math.floor((note.box.w - 40) / NOTE_CHAR_W));
  const lines = Math.ceil(note.text.length / perLine);
  return lines * NOTE_LINE_H + 40 + (note.title ? 40 : 0) + (nav ? NAV_H : 0);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function tagFor(note: SceneNote) {
  if (note.kind === "fact") return `SPACE FACT · ${note.title}`;
  if (note.kind === "radio") return `MISSION CONTROL${note.title ? ` · ${note.title}` : ""}`;
  return null;
}

/** Plain text of a note, for screen readers. */
function noteSpeech(note: SceneNote | undefined) {
  if (!note) return "";
  const tag = tagFor(note);
  return `${tag ? `${tag}: ` : ""}${note.text}`;
}

function SceneNoteView({ note, leaving, nav }: { note: SceneNote; leaving: boolean; nav?: NoteNav }) {
  const { x, y, w } = note.box;
  const h = noteHeight(note, Boolean(nav));
  const p = note.point;
  const from = p && { x: clamp(p.x, x + 18, x + w - 18), y: clamp(p.y, y, y + h) };
  const tag = tagFor(note);
  return (
    <g className={`gnote gnote--${note.kind}${leaving ? " is-leaving" : ""}`}>
      {p && from && (
        <>
          <path className="gnote__pointer" d={`M${from.x} ${from.y} L${p.x} ${p.y}`} />
          <circle className="gnote__target" cx={p.x} cy={p.y} r="12" />
          <circle className="gnote__dot" cx={p.x} cy={p.y} r="4.5" />
        </>
      )}
      <foreignObject x={x} y={y} width={w} height={h}>
        <div className="gnote__box">
          {tag && <p className="gnote__tag">{tag}</p>}
          <p className="gnote__text">{note.text}</p>
          {nav && <NavIcons nav={nav} />}
        </div>
      </foreignObject>
    </g>
  );
}

/** Small back / next icons in the corner of a note box. Shared with the prologue's own notes. */
export function NavIcons({ nav, className = "gnote__nav" }: { nav: NoteNav; className?: string }) {
  return (
    <span className={className}>
      <button type="button" aria-label="Back: read the last note again" onClick={nav.onBack}>
        ◂
      </button>
      <button type="button" aria-label="Next note" onClick={nav.onNext}>
        ▸
      </button>
    </span>
  );
}

/** Draws whichever note is active at second `t`. Drop it on top of a scene. Pass `nav` for ◂ ▸ icons. */
export function NoteLayer({ notes, t, nav }: { notes: SceneNote[]; t: number; nav?: NoteNav }) {
  const index = notes.findIndex((n) => t >= n.from && t < n.to);
  const note = index >= 0 ? notes[index] : undefined;

  return (
    <>
      <svg className="ares__scene ares__notes" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {note && <SceneNoteView key={index} note={note} leaving={t >= note.to - 0.4} nav={nav} />}
      </svg>
      <p className="ares__sr-only" aria-live="polite">
        {noteSpeech(note)}
      </p>
    </>
  );
}
