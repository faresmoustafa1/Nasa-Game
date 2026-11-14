// Mission ARES — Phase 4: the rover trip to the delta.
//
// A hand-drawn map of Jezero Crater with three sample sites (flat, gentle climb, steep climb).
// First, Mission Control warns of a dust storm and offers a shortcut, but a message to Earth takes
// time (today's real delay, worked out from NASA/JPL orbit data):
//   Wait for Earth   every trip costs 1 less Power, but 1 sample fewer (the dust gets closer)
//   Go now           full price, more samples
// Then the player taps sites. The rover drives out, takes a sample (Power + 1 Air) and drives back.
// The dust thickens with every sample. A tired crew (2 faces or fewer) makes each sample cost +1 Power,
// and so does each level the garage gear was too light for the cold (the `cold` prop, see weather.ts).
// Samples allowed: 3 if the rover goes first, 2 if second, 1 fewer if you waited.
//
// Usage:  <Rover game={game} onDone={(next) => …} />      Dev: ?scene=task&room=rover (add &done=greenhouse for "second")

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import { NoteLayer } from "../game/notes";
import type { SceneNote } from "../game/notes";
import { applySample } from "../game/state";
import type { GameState } from "../game/state";
import Tablet from "../game/Tablet";
import { useTimeline } from "../game/useTimeline";
import "../game/game.css";
import { JUDGE_DELAY_MIN, isJudge } from "../game/judge";
import { earthMarsDelayMinutes } from "./delay";
import { ADVICE_NOTE, DUST_NOTE, HINT_NOTE, INTRO_NOTE, JEZERO_FACT, OPPORTUNITY_FACT, choiceNote, rockNote, sampleNote, waitingNote } from "./notes";
import { BASE_POS, BONUS_POINTS, SITES, rockValue, sampleCap, sampleCost } from "./sites";
import type { Site } from "./sites";
import "./rover.css";

type RoverProps = {
  game: GameState;
  /** Called when the player heads home. The state has the new meters and samples. */
  onDone: (game: GameState) => void;
  /** Extra Power per sample because the gear was too light for the cold (set in the garage). */
  cold?: number;
  sound?: boolean;
};

const CHOICE_AT = 5.8;
const WAIT_SECONDS = 6; // the game's shortcut for the real delay
const ADVICE_SECONDS = 4.5;
const ROCK_SECONDS = 5.5;
const DRIVE_MS = 2200;
const SAMPLE_MS = 900;

type Decision = { kind: "wait" | "go"; at: number } | null;
type Pose = { x: number; y: number; rot: number };

/** The route from the base to a site: a gentle curve. */
function route(site: Site) {
  const c = { x: (BASE_POS.x + site.x) / 2, y: Math.min(BASE_POS.y, site.y) - 70 };
  return { c, d: `M${BASE_POS.x} ${BASE_POS.y} Q${c.x} ${c.y} ${site.x} ${site.y}` };
}

/** Where the rover is `u` (0 = base, 1 = site) along the route, and which way it faces. */
function along(site: Site, u: number, back: boolean): Pose {
  const { c } = route(site);
  const p0 = BASE_POS;
  const p2 = site;
  const k = 1 - u;
  const x = k * k * p0.x + 2 * k * u * c.x + u * u * p2.x;
  const y = k * k * p0.y + 2 * k * u * c.y + u * u * p2.y;
  const dx = 2 * k * (c.x - p0.x) + 2 * u * (p2.x - c.x);
  const dy = 2 * k * (c.y - p0.y) + 2 * u * (p2.y - c.y);
  return { x, y, rot: (Math.atan2(dy, dx) * 180) / Math.PI + (back ? 180 : 0) };
}

const ease = (v: number) => v * v * (3 - 2 * v);

export default function Rover({ game, onDone, cold = 0, sound = true }: RoverProps) {
  const audioRef = useRef<GameAudio | null>(null);
  const finished = useRef(false);
  const frame = useRef(0);
  const { t } = useTimeline({});

  const first = game.tasks.length === 0;
  const [delay] = useState(() => (isJudge() ? JUDGE_DELAY_MIN : earthMarsDelayMinutes(new Date())));

  const [cur, setCur] = useState<GameState>(game);
  const [decision, setDecision] = useState<Decision>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [pose, setPose] = useState<Pose>({ x: BASE_POS.x, y: BASE_POS.y, rot: 180 });
  const [last, setLast] = useState<{ at: number; text: string } | null>(null);
  const clock = useRef(0);
  useEffect(() => {
    clock.current = t;
  }, [t]);

  const waited = decision?.kind === "wait";
  const waitDone = decision?.kind === "wait" && t >= decision.at + WAIT_SECONDS;
  const picking = decision?.kind === "go" || waitDone;
  const pickAt = decision ? (decision.kind === "go" ? decision.at : decision.at + WAIT_SECONDS) : 0;
  const rockAt = waited ? pickAt + ADVICE_SECONDS : pickAt;
  const factsAt = rockAt + ROCK_SECONDS;
  const bonus = SITES.find((s) => s.id === game.bonusSite) ?? SITES[0];
  const tired = cur.crew <= 2;
  const cap = sampleCap(first, waited);
  const gained = cur.samples - game.samples;
  const capped = gained >= cap;
  const advice = waitDone;

  useEffect(() => {
    if (!sound) return;
    const audio = createGameAudio();
    audioRef.current = audio;
    return () => {
      audio.stop();
      audioRef.current = null;
    };
  }, [sound]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const sec = Math.floor(t);
  useEffect(() => {
    if (sec === Math.floor(CHOICE_AT)) audioRef.current?.blip(660);
    if (decision?.kind === "wait" && sec === Math.floor(decision.at + WAIT_SECONDS)) audioRef.current?.chime();
  }, [sec, decision]);

  const decide = useCallback(
    (kind: "wait" | "go") => {
      if (decision) return;
      audioRef.current?.blip(kind === "wait" ? 560 : 760);
      setDecision({ kind, at: t });
    },
    [decision, t],
  );

  /** Drive out, take the sample, drive back. */
  const visit = useCallback(
    (i: number) => {
      const site = SITES[i];
      if (busy !== null || !picking || capped || done.includes(site.id)) return;
      const cost = sampleCost(site, tired, advice, cold);
      const value = rockValue(site, game.bonusSite);
      const special = site.id === game.bonusSite;
      setBusy(i);
      audioRef.current?.blip(520);
      const start = performance.now();
      let sampled = false;
      const step = (now: number) => {
        const e = now - start;
        if (e < DRIVE_MS) {
          setPose(along(site, ease(e / DRIVE_MS), false));
        } else if (e < DRIVE_MS + SAMPLE_MS) {
          setPose(along(site, 1, false));
          if (!sampled) {
            sampled = true;
            setCur((c) => applySample(c, cost, value));
            setDone((d) => [...d, site.id]);
            setLast({ at: clock.current, text: special ? `The interesting rock! ★ +${value} points (+${BONUS_POINTS} bonus). Power −${cost}, Air −1.` : `Rock collected! ★ +${value} points. Power −${cost}, Air −1.` });
            audioRef.current?.chime();
          }
        } else if (e < 2 * DRIVE_MS + SAMPLE_MS) {
          setPose(along(site, 1 - ease((e - DRIVE_MS - SAMPLE_MS) / DRIVE_MS), true));
        } else {
          setPose({ ...along(site, 0, true), rot: 180 });
          setBusy(null);
          return;
        }
        frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    },
    [busy, picking, capped, done, tired, advice, cold, game.bonusSite],
  );

  const finish = useCallback(() => {
    if (finished.current || gained < 1) return;
    finished.current = true;
    onDone({ ...cur, log: [...cur.log, `Rover: ${gained} rock${gained > 1 ? "s" : ""} (${cur.rockPoints - game.rockPoints} points)${waited ? ", waited for Earth's advice" : ", went right away"}`] });
  }, [cur, gained, waited, onDone, game.rockPoints]);

  const notes = useMemo<SceneNote[]>(() => {
    if (last && last.text && t < last.at + 3.6 && !capped) return [sampleNote(last.at, last.text)];
    if (!decision) return t < CHOICE_AT ? [INTRO_NOTE] : [choiceNote(delay)];
    if (!picking) return [waitingNote(delay)];
    if (capped) return [DUST_NOTE];
    const list: SceneNote[] = [];
    if (waited) list.push({ ...ADVICE_NOTE, from: pickAt, to: pickAt + ADVICE_SECONDS });
    list.push(rockNote(bonus.name, rockAt, factsAt), JEZERO_FACT(factsAt), OPPORTUNITY_FACT(factsAt), HINT_NOTE(factsAt));
    return list;
  }, [last, t, capped, decision, picking, delay, waited, pickAt, rockAt, factsAt, bonus.name]);

  const dust = Math.min(1, 0.12 + (picking ? gained / cap : 0) * 0.8 + (decision ? 0.08 : 0));
  const canPick = picking && busy === null && !capped;

  return (
    <div className={`ares rover${t < 1 ? " is-opening" : ""}`}>
      <div className="ares__stage">
        <svg className="ares__scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="group" aria-label="Map of Jezero Crater with three sample sites">
          <defs>
            <radialGradient id="rv-floor" cx="0.5" cy="0.5" r="0.6">
              <stop offset="0" stopColor="#d49a63" />
              <stop offset="1" stopColor="#b9783f" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill="#7a4326" />
          <rect width="1600" height="900" fill="#8f5230" opacity="0.5" />

          {/* The crater: rim, floor, and height lines (higher = closer to the rim) */}
          <ellipse cx="800" cy="500" rx="720" ry="390" fill="#a35f37" stroke="#6f3b22" strokeWidth="26" />
          <ellipse cx="800" cy="500" rx="650" ry="330" fill="url(#rv-floor)" />
          {[0.88, 0.7, 0.5].map((k) => (
            <ellipse key={k} cx="800" cy="500" rx={650 * k} ry={330 * k} fill="none" stroke="#8a5430" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="10 8" />
          ))}

          {/* The old river comes in from the west and builds the delta fan */}
          <path d="M0 470 Q70 430 120 480 T200 490" fill="none" stroke="#7a5a44" strokeWidth="14" strokeLinecap="round" />
          <path d="M170 480 Q430 290 640 370 Q720 480 640 610 Q420 660 170 520 Z" fill="#dcb07a" stroke="#b98a56" strokeWidth="4" />
          {[-50, -25, 0, 25, 50].map((o) => (
            <path key={o} d={`M178 ${500 + o * 0.2} Q420 ${470 + o * 3} 620 ${490 + o * 4}`} fill="none" stroke="#a97c4c" strokeWidth="3" strokeLinecap="round" />
          ))}
          <text className="rover__geo" x="420" y="700" textAnchor="middle">
            ANCIENT RIVER DELTA
          </text>
          <text className="rover__title" x="800" y="76" textAnchor="middle">
            JEZERO CRATER
          </text>

          {/* The base */}
          <g transform={`translate(${BASE_POS.x} ${BASE_POS.y})`}>
            <circle r="48" fill="#4a5070" stroke="#cfd8ea" strokeWidth="4" />
            <circle r="28" fill="#2d2842" />
            <rect x="-86" y="-12" width="30" height="24" rx="3" fill="#2b4a7a" />
            <rect x="56" y="-12" width="30" height="24" rx="3" fill="#2b4a7a" />
            <text className="rover__label" y="82" textAnchor="middle">
              BASE
            </text>
          </g>

          {/* Routes, sites, rover */}
          {SITES.map((s) => (
            <path key={s.id} d={route(s).d} className="rover__route" />
          ))}
          {SITES.map((s, i) => {
            const cost = sampleCost(s, tired, advice, cold);
            const isDone = done.includes(s.id);
            const active = canPick && !isDone;
            return (
              <g
                key={s.id}
                className={`rover__site${active ? " is-glow" : ""}${isDone ? " is-done" : ""}`}
                role={active ? "button" : undefined}
                tabIndex={active ? 0 : undefined}
                aria-label={active ? `Send the rover to the ${s.name}: ${s.climb}, costs ${cost} Power and 1 Air${s.id === game.bonusSite ? `, interesting rock, ${BONUS_POINTS} bonus points` : ""}` : undefined}
                onClick={active ? () => visit(i) : undefined}
                onKeyDown={
                  active
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          visit(i);
                        }
                      }
                    : undefined
                }
              >
                <circle className="rover__ring" cx={s.x} cy={s.y} r="38" />
                <circle cx={s.x} cy={s.y} r="22" fill={isDone ? "#7ee0b0" : "#ffcf99"} stroke="#2a1608" strokeWidth="4" />
                {isDone ? (
                  <text className="rover__mark" x={s.x} y={s.y + 9} textAnchor="middle">
                    ✓
                  </text>
                ) : (
                  <path transform={`translate(${s.x} ${s.y})`} d="M-12 7 L-14 -2 L-5 -11 L7 -10 L14 -1 L10 8 Z" fill="#8a5a38" stroke="#2a1608" strokeWidth="3" strokeLinejoin="round" />
                )}
                {s.id === game.bonusSite && !isDone && (
                  <g aria-hidden="true">
                    <circle className="rover__ring rover__ring--gold" cx={s.x} cy={s.y} r="46" />
                    <text className="rover__star" x={s.x + 68} y={s.y + 18} textAnchor="middle">
                      ★
                    </text>
                  </g>
                )}
                <text className="rover__label" x={s.x} y={s.y - 52} textAnchor="middle">
                  {s.name}
                </text>
                <text className="rover__sub" x={s.x} y={s.y + 62} textAnchor="middle">
                  {isDone ? "collected" : s.id === game.bonusSite ? `Power −${cost} · ★ ${s.points} + ${BONUS_POINTS} bonus` : `Power −${cost} · ★ ${s.points}`}
                </text>
                <text className="rover__sub rover__sub--small" x={s.x} y={s.y + 88} textAnchor="middle">
                  {s.climb}
                </text>
                <rect className="rover__hit" x={s.x - 70} y={s.y - 80} width="140" height="190" />
              </g>
            );
          })}

          <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.rot}) scale(1.25)`} aria-hidden="true">
            <ellipse cx="0" cy="3" rx="36" ry="24" fill="#000" opacity="0.3" />
            {[-20, 0, 20].map((x) => (
              <g key={x}>
                <rect x={x - 7} y="-27" width="14" height="9" rx="3" fill="#1a1f2e" />
                <rect x={x - 7} y="18" width="14" height="9" rx="3" fill="#1a1f2e" />
              </g>
            ))}
            <rect x="-30" y="-18" width="60" height="36" rx="9" fill="#e8ecf3" stroke="#9aa6b8" strokeWidth="2" />
            <rect x="-24" y="-11" width="28" height="22" rx="3" fill="#2b4a7a" />
            <circle cx="-9" cy="0" r="9" fill="#d6deee" stroke="#4a8be0" strokeWidth="3" />
            <circle cx="-9" cy="0" r="5" fill="#14100c" />
            <circle cx="20" cy="0" r="6" fill="#46526e" />
            <circle cx="25" cy="0" r="2.6" fill="#7ee0b0" />
          </g>

          {busy === null && (
            <text className="rover__label" x={pose.x} y={pose.y - 44} textAnchor="middle" aria-hidden="true">
              ROVER
            </text>
          )}

          {/* The dust storm creeps in */}
          <rect width="1600" height="900" fill="#c2763a" style={{ opacity: dust * 0.55 }} className="rover__haze" />
          <g className="rover__swirls" style={{ opacity: Math.min(1, dust * 1.2) } as CSSProperties}>
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse key={i} cx={200 + i * 340} cy={200 + (i % 3) * 230} rx="260" ry="70" style={{ animationDelay: `${i * -3}s` }} />
            ))}
          </g>
        </svg>

        <NoteLayer notes={notes} t={t} />

        <Tablet meters={cur.meters} locked={cur.locked} crew={cur.crew} nudge={busy !== null ? ["power", "air"] : []} />

        {picking && (
          <div className="rover__jars" aria-label={`Rocks collected: ${gained} of ${cap}`}>
            <span>ROCKS</span>
            {Array.from({ length: cap }, (_, i) => (
              <i key={i} className={i < gained ? "is-full" : ""} />
            ))}
            <em>{[tired && "Tired crew: +1 Power each", cold > 0 && `Cold battery: +${cold} Power each`].filter(Boolean).join(" · ")}</em>
          </div>
        )}

        {picking && (
          <aside className="rover__goal" aria-label="Goal">
            <b>GOAL: collect rocks</b>
            <span>Rocks are points ★. Far spots cost more Power, but their rocks are worth more. The gold star is an interesting rock: +{BONUS_POINTS} bonus!</span>
          </aside>
        )}

        {!decision && t >= CHOICE_AT && (
          <div className="rover__choice" role="group" aria-label="Wait for Earth or go now">
            <button type="button" onClick={() => decide("wait")}>
              <b>Ask Earth, then wait</b>
              <span>Trips cost 1 less Power · 1 rock fewer</span>
            </button>
            <button type="button" onClick={() => decide("go")}>
              <b>Go now</b>
              <span>Full price · more rocks</span>
            </button>
          </div>
        )}

        {decision?.kind === "wait" && !waitDone && (
          <div className="rover__wait" role="status">
            <p>Reply in</p>
            <b>{Math.max(0, Math.ceil(decision.at + WAIT_SECONDS - t))}</b>
          </div>
        )}

        {gained >= 1 && busy === null && (
          <button type="button" className="ares__cta" onClick={finish}>
            Head home ▸
          </button>
        )}
        <div className="ares__flash" aria-hidden="true" />
      </div>
    </div>
  );
}
