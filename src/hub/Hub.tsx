// Mission ARES — Phase 2a: the base hub. "Two problems, one crew."
//
// The base is cut open so you can see four rooms. Two of them glow: the greenhouse
// and the garage (the rover). The player taps one, the boy walks there by himself,
// and the other job is marked "Later: …" (it will be harder). Nothing is wrong:
// the tablet just shows what each choice costs.
//
// First visit: both jobs glow. Second visit (after the storm): only the job that
// is left glows, already marked.
//
// Usage:  <Hub game={game} onDone={(next, task) => …} />
// Dev:    ?scene=hub   (add &done=greenhouse or &done=rover to see the second visit)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Boy, CrewMember } from "../game/art";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import { NoteLayer } from "../game/notes";
import type { GameState, Task, TabletFocus } from "../game/state";
import Tablet from "../game/Tablet";
import { useTimeline } from "../game/useTimeline";
import "../game/game.css";
import BaseArt from "./BaseArt";
import { BOY_START_X, CREW_POS, FLOOR_Y, PERSON_SCALE, TASK_STAND_X } from "./layout";
import { HUB_INTRO_NOTES, pickedNote, secondNote } from "./notes";
import "./hub.css";

type HubProps = {
  game: GameState;
  /** Called after the boy has walked to the chosen job. */
  onDone: (game: GameState, task: Task) => void;
  sound?: boolean;
};

const WALK_MS = 2700; // matches the transform transition in hub.css
const PAUSE_MS = 1100; // a beat at the door before the job starts
const OTHER: Record<Task, Task> = { greenhouse: "rover", rover: "greenhouse" };

const place = (x: number): CSSProperties => ({ transform: `translate(${x}px, ${FLOOR_Y}px) scale(${PERSON_SCALE})` });

export default function Hub({ game, onDone, sound = true }: HubProps) {
  const audioRef = useRef<GameAudio | null>(null);
  const second = game.tasks.length > 0;
  const todo = (["greenhouse", "rover"] as Task[]).filter((k) => !game.tasks.includes(k));

  const { t } = useTimeline({ holdAt: 13.5 });
  const [picked, setPicked] = useState<Task | null>(null);
  const [arrived, setArrived] = useState(false);
  const [focus, setFocus] = useState<TabletFocus | null>(null);

  useEffect(() => {
    if (!sound) return;
    const audio = createGameAudio();
    audioRef.current = audio;
    return () => {
      audio.stop();
      audioRef.current = null;
    };
  }, [sound]);

  // The walk, then the pause, then hand over to the job.
  useEffect(() => {
    if (!picked) return;
    const arrive = window.setTimeout(() => {
      setArrived(true);
      audioRef.current?.chime();
    }, WALK_MS);
    const go = window.setTimeout(() => {
      const first = !game.order;
      onDone(
        {
          ...game,
          order: game.order ?? (picked === "greenhouse" ? "GR" : "RG"),
          log: [...game.log, first ? `Chose the ${picked} first` : `Then the ${picked}`],
        },
        picked,
      );
    }, WALK_MS + PAUSE_MS);
    return () => {
      window.clearTimeout(arrive);
      window.clearTimeout(go);
    };
  }, [picked, game, onDone]);

  const choose = useCallback(
    (task: Task) => {
      if (picked) return;
      audioRef.current?.blip(task === "greenhouse" ? 660 : 520);
      setPicked(task);
    },
    [picked],
  );

  const pickTablet = useCallback((row: TabletFocus) => {
    setFocus((f) => (f === row ? null : row));
    audioRef.current?.blip(row === "power" ? 660 : row === "water" ? 760 : row === "air" ? 880 : 560);
  }, []);

  // Which job is marked "Later": the other one after the first pick, or the one that is left.
  const later: Task | null = second ? (todo[0] ?? null) : picked ? OTHER[picked] : null;

  const notes = useMemo(() => {
    if (second) return todo[0] ? [secondNote(todo[0])] : [];
    if (picked) return [pickedNote(picked)];
    return HUB_INTRO_NOTES;
  }, [second, picked, todo]);

  const boyX = picked ? TASK_STAND_X[picked] : BOY_START_X;

  return (
    <div className={`ares hub${t < 1.2 ? " is-opening" : ""}`}>
      <div className="ares__stage">
        <BaseArt glow={todo} picked={picked} later={later} onPick={choose}>
          <g className="hub__people">
            <g className="hub__person" style={place(CREW_POS.commander)}>
              <CrewMember id="commander" look={-1} mood="calm" />
            </g>
            <g className="hub__person" style={place(CREW_POS.doctor)}>
              <CrewMember id="doctor" look={1} mood="calm" />
            </g>
            <g className="hub__person" style={place(CREW_POS.engineer)}>
              <CrewMember id="engineer" look={-1} mood="calm" />
            </g>
            <g className="hub__person" style={place(CREW_POS.pilot)}>
              <CrewMember id="pilot" look={-1} mood="calm" />
            </g>
            <g className={`hub__person hub__boy${picked && !arrived ? " is-walk" : ""}${arrived ? " is-wave" : ""}`} style={place(boyX)}>
              <Boy mood={picked ? "smile" : "calm"} look={picked ? 1 : 0} />
            </g>
          </g>
        </BaseArt>

        <NoteLayer notes={notes} t={Math.max(t, second || picked ? 1 : 0)} />

        <Tablet meters={game.meters} locked={game.locked} crew={game.crew} focus={focus} onPick={pickTablet} />

        {!picked && t >= 1.2 && <p className="hub__hint">Tap a glowing room</p>}
        <div className="ares__flash" aria-hidden="true" />
      </div>
    </div>
  );
}
