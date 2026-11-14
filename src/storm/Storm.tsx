// Mission ARES — Phase 3: the solar storm (Sol 2).
//
// An alarm rings, the crew runs to the shelter, and Mission Control calls with the storm's size
// (real data from NASA DONKI, or one of three saved real events). The player picks a shield:
//   thin   Power −1, locks 2 Water
//   medium Power −2, locks 4 Water
//   thick  Power −3, locks 6 Water
// A storm bigger than the shield costs the crew 2 points per level. If a big flare blocked the
// radio, the message is lost and the player has to guess. Nothing is "wrong": it all shows on the tablet.
//
// Timeline (seconds): 0 alarm, 0.8 the crew runs, 3.4 radio message, 3.8 shield buttons.
// After the pick the clock keeps going: result note, radiation fact, then "Storm over ▸".
//
// Usage:  <Storm game={game} onDone={(next) => …} />
// Dev:    ?scene=storm   (&storm=small|medium|big forces an event, &live=0 skips the live call)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boy, CrewMember } from "../game/art";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import { NoteLayer } from "../game/notes";
import { SHIELD, applyStorm } from "../game/state";
import type { GameState, Level } from "../game/state";
import Tablet from "../game/Tablet";
import { useTimeline } from "../game/useTimeline";
import "../game/game.css";
import BaseArt from "../hub/BaseArt";
import { BOY_START_X, CREW_POS, FLOOR_Y, PERSON_SCALE } from "../hub/layout";
import "../hub/hub.css";
import { devEvent, fetchLiveEvent, levelOf, messageLost, nextSaved } from "./donki";
import type { StormEvent } from "./donki";
import { ALARM_NOTE, radioNote, resultNotes } from "./notes";
import "./storm.css";

type StormProps = {
  game: GameState;
  /** Called when the player presses "Storm over". */
  onDone: (game: GameState) => void;
  sound?: boolean;
};

const RUN_AT = 0.8;
const RUN_END = 3;
const RADIO_AT = 3.4;
const CHOOSE_AT = 3.8;
/** Where everybody stands in the shelter. */
const SHELTER_X = { commander: 1110, doctor: 905, engineer: 958, pilot: 1010, boy: 1060 } as const;
const SHIELDS: Level[] = [1, 2, 3];

const place = (x: number) => ({ transform: `translate(${x}px, ${FLOOR_Y}px) scale(${PERSON_SCALE})` });

/** Asks NASA (1.5 s at most), else takes the next saved real event. Never blocks the scene. */
function useStormEvent(): StormEvent | null {
  const [event, setEvent] = useState<StormEvent | null>(null);
  useEffect(() => {
    let alive = true;
    const { forced, skipLive } = devEvent();
    const get = forced ? Promise.resolve(forced) : skipLive ? Promise.resolve(nextSaved()) : fetchLiveEvent().then((e) => e ?? nextSaved());
    void get.then((e) => {
      if (alive) setEvent(e);
    });
    return () => {
      alive = false;
    };
  }, []);
  return event;
}

const niceDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function Storm({ game, onDone, sound = true }: StormProps) {
  const audioRef = useRef<GameAudio | null>(null);
  const finished = useRef(false);
  const event = useStormEvent();
  const { t } = useTimeline({});
  const sec = Math.floor(t);

  const [pick, setPick] = useState<{ at: number; next: GameState } | null>(null);
  const since = pick ? t - pick.at : -1;
  const rec = pick?.next.storm ?? null;

  useEffect(() => {
    if (!sound) return;
    const audio = createGameAudio();
    audioRef.current = audio;
    return () => {
      audio.stop();
      audioRef.current = null;
    };
  }, [sound]);

  useEffect(() => {
    const audio = audioRef.current;
    if (sec === 0) audio?.alarm();
    if (sec === 2) audio?.alarm();
    if (sec === Math.floor(RADIO_AT) && event) {
      if (messageLost(event)) audio?.crackle();
      else audio?.blip(660);
    }
  }, [sec, event]);

  const choose = useCallback(
    (shield: Level) => {
      if (pick || !event) return;
      const next = applyStorm(game, { level: levelOf(event), shield, speed: event.speed, date: event.date, live: event.live, flare: event.flare, lost: messageLost(event) });
      setPick({ at: t, next });
      if ((next.storm?.hits ?? 0) > 0) audioRef.current?.thud();
      else audioRef.current?.chime();
    },
    [pick, event, game, t],
  );

  const finish = useCallback(() => {
    if (finished.current || !pick) return;
    finished.current = true;
    onDone(pick.next);
  }, [pick, onDone]);

  const notes = useMemo(() => {
    if (rec && pick) return resultNotes(pick.at, rec);
    return event ? [ALARM_NOTE, radioNote(event)] : [ALARM_NOTE];
  }, [event, rec, pick]);

  const view = pick?.next ?? game;
  const running = t >= RUN_AT && t < RUN_END;
  const inShelter = t >= RUN_AT;
  const hits = rec?.hits ?? 0;
  const mood = !pick ? "worried" : hits > 0 ? "worried" : "smile";
  const at = (id: keyof typeof SHELTER_X, home: number) => place(inShelter ? SHELTER_X[id] : home);
  const nudge = pick ? (hits > 0 ? (["power", "water", "crew"] as const) : (["power", "water"] as const)) : [];

  return (
    <div className={`ares storm${t < 1 ? " is-opening" : ""}`}>
      <div className="ares__stage">
        <BaseArt storm shield={rec ? rec.shield : 0} hit={hits > 0 && since >= 0.4}>
          <g className="hub__people">
            <g className={`hub__person hub__runner${running ? " is-walk" : ""}`} style={at("commander", CREW_POS.commander)}>
              <CrewMember id="commander" look={0} mood={mood} />
            </g>
            <g className={`hub__person hub__runner${running ? " is-walk" : ""}`} style={at("doctor", CREW_POS.doctor)}>
              <CrewMember id="doctor" look={0} mood={mood} />
            </g>
            <g className={`hub__person hub__runner${running ? " is-walk" : ""}`} style={at("engineer", CREW_POS.engineer)}>
              <CrewMember id="engineer" look={0} mood={mood} />
            </g>
            <g className={`hub__person hub__runner${running ? " is-walk" : ""}`} style={at("pilot", CREW_POS.pilot)}>
              <CrewMember id="pilot" look={0} mood={mood} />
            </g>
            <g className={`hub__person hub__runner${running ? " is-walk" : ""}`} style={at("boy", BOY_START_X)}>
              <Boy mood={mood} look={0} />
            </g>
          </g>
        </BaseArt>

        <NoteLayer notes={notes} t={t} />

        <Tablet meters={view.meters} locked={view.locked} crew={view.crew} nudge={[...nudge]} />

        {event && t >= RADIO_AT && (
          <p className="storm__tag">
            {event.live ? "LIVE · NASA DONKI" : `SAVED REAL EVENT · ${niceDate(event.date)} · NASA DONKI`}
          </p>
        )}

        {event && !pick && t >= CHOOSE_AT && (
          <div className="storm__shields" role="group" aria-label="Pick a shield">
            {SHIELDS.map((lv) => (
              <button
                key={lv}
                type="button"
                className="storm__shield"
                onClick={() => choose(lv)}
                aria-label={`${SHIELD[lv].name} shield: costs ${SHIELD[lv].power} Power and locks ${SHIELD[lv].lock} Water`}
              >
                <span className="storm__tanks" aria-hidden="true">
                  {SHIELDS.map((n) => (
                    <i key={n} className={n <= lv ? "is-on" : ""} />
                  ))}
                </span>
                <b>{SHIELD[lv].name[0].toUpperCase() + SHIELD[lv].name.slice(1)}</b>
                <span>
                  Power −{SHIELD[lv].power} · locks {SHIELD[lv].lock} Water
                </span>
              </button>
            ))}
          </div>
        )}

        {rec && since >= 0.8 && (
          <aside className="storm__dose" aria-label="Radiation in the shelter">
            <p className="storm__dose-title">RADIATION IN THE SHELTER</p>
            <div className="storm__dose-bar" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i <= hits ? `is-on is-${hits}` : ""} />
              ))}
            </div>
            <p className="storm__dose-label">{hits === 0 ? "Low" : hits === 1 ? "Medium" : "High"}</p>
            <p className="storm__dose-text">
              {hits === 0 ? "The shield was thick enough. The crew is safe." : `The shield was ${hits} level${hits > 1 ? "s" : ""} too thin. Crew −${2 * hits}.`}
            </p>
          </aside>
        )}

        {pick && since >= 2.5 && (
          <button type="button" className="ares__cta" onClick={finish}>
            Storm over ▸
          </button>
        )}
        <div className="ares__flash" aria-hidden="true" />
      </div>
    </div>
  );
}
