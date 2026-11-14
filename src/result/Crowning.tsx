// Mission ARES — the crowning: the boy, in his astronaut suit, walks onto a podium and the crew crown him.
// The crown matches his badge (gold, silver or bronze). Fireworks, confetti, cheering crew. Then the result screen.

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { Astronaut, CrewMember, StarField } from "../game/art";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import { NoteLayer } from "../game/notes";
import type { SceneNote } from "../game/notes";
import { seededRandom } from "../game/random";
import { useTimeline } from "../game/useTimeline";
import type { Badge } from "./score";
import "../game/game.css";
import "./crowning.css";

type CrowningProps = {
  badge: Badge;
  onDone: () => void;
  sound?: boolean;
};

const WALK_AT = 0.4;
const ARRIVE_AT = 2.8;
const CROWN_AT = 3.2;
const LAND_AT = 4.1;
const CTA_AT = 6.5;

const CONFETTI = ["#ffd84a", "#ff6f91", "#4a8be0", "#7ee0b0", "#ff9a3c", "#b48cff"];
const BURSTS = [
  { x: 380, y: 250, at: 4.1, color: "#ffd84a" },
  { x: 1220, y: 220, at: 4.7, color: "#ff6f91" },
  { x: 800, y: 140, at: 5.3, color: "#7ee0b0" },
  { x: 560, y: 330, at: 5.9, color: "#4a8be0" },
  { x: 1040, y: 330, at: 6.4, color: "#ff9a3c" },
];

const NOTES = (badge: Badge): SceneNote[] => [
  { from: 0.8, to: CROWN_AT, kind: "story", text: "Mission complete! The crew is safe. Everybody came to say thank you.", box: { x: 460, y: 70, w: 680 } },
  { from: CROWN_AT, to: 9999, kind: "shout", text: `The crew crowns you ${badge.name.split("· ")[1]}! Hooray!`, box: { x: 440, y: 70, w: 720 } },
];

function Crown({ badge }: { badge: Badge }) {
  return (
    <g aria-hidden="true">
      <path d="M-44 0 L-52 -52 L-26 -26 L0 -66 L26 -26 L52 -52 L44 0 Z" fill={badge.color} stroke={badge.rim} strokeWidth="5" strokeLinejoin="round" />
      <rect x="-46" y="-9" width="92" height="12" rx="4" fill={badge.rim} />
      <circle cx="-52" cy="-54" r="7" fill="#ff6f91" stroke={badge.rim} strokeWidth="2.5" />
      <circle cx="0" cy="-69" r="8" fill="#4a8be0" stroke={badge.rim} strokeWidth="2.5" />
      <circle cx="52" cy="-54" r="7" fill="#ff6f91" stroke={badge.rim} strokeWidth="2.5" />
      <circle cx="-20" cy="-6" r="3.6" fill="#fff6c8" />
      <circle cx="0" cy="-6" r="3.6" fill="#fff6c8" />
      <circle cx="20" cy="-6" r="3.6" fill="#fff6c8" />
    </g>
  );
}

export default function Crowning({ badge, onDone, sound = true }: CrowningProps) {
  const audioRef = useRef<GameAudio | null>(null);
  const { t } = useTimeline({});
  const sec = Math.floor(t);

  const confetti = useMemo(() => {
    const rand = seededRandom(77);
    return Array.from({ length: 70 }, (_, i) => ({
      x: rand() * 1600,
      w: 10 + rand() * 12,
      h: 6 + rand() * 8,
      delay: rand() * 3.2,
      dur: 3 + rand() * 2.5,
      color: CONFETTI[i % CONFETTI.length],
      spin: (rand() > 0.5 ? 1 : -1) * (300 + rand() * 500),
    }));
  }, []);

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
    if (sec === 1) audio?.hiss();
    if (sec === 3) audio?.fanfare();
    if (sec === 4 || sec === 5 || sec === 6) audio?.chime();
  }, [sec]);

  const walking = t >= WALK_AT && t < ARRIVE_AT;
  const crowned = t >= LAND_AT;
  const party = t >= LAND_AT;

  return (
    <div className={`ares crown${crowned ? " is-crowned" : ""}`}>
      <div className="ares__stage">
        <svg className="ares__scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`The crew crowns the boy ${badge.name}`}>
          <defs>
            <linearGradient id="cr-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#120f33" />
              <stop offset="0.55" stopColor="#4a2457" />
              <stop offset="1" stopColor="#d97a4a" />
            </linearGradient>
            <linearGradient id="cr-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b9783f" />
              <stop offset="1" stopColor="#6e3a1e" />
            </linearGradient>
            <linearGradient id="cr-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff6c8" stopOpacity="0.5" />
              <stop offset="1" stopColor="#fff6c8" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#cr-sky)" />
          <StarField count={110} seed={9} maxY={520} />
          <circle cx="800" cy="600" r="230" fill="#ffb070" opacity="0.28" />
          <path d="M0 610 Q200 540 420 600 Q640 650 860 590 Q1100 530 1320 600 Q1480 640 1600 590 V900 H0 Z" fill="#8a4a2a" />
          <rect y="640" width="1600" height="260" fill="url(#cr-ground)" />
          <path d="M0 700 H1600 M0 780 H1600" stroke="#6e3a1e" strokeWidth="3" opacity="0.5" />

          {/* The spotlight on the podium */}
          <path d="M800 0 L520 790 L1080 790 Z" fill="url(#cr-beam)" style={{ opacity: t >= 2.4 ? 1 : 0, transition: "opacity 1.2s" }} />

          {/* The podium */}
          <g>
            <rect x="680" y="702" width="240" height="94" rx="10" fill="#8f5c3a" stroke="#5a3a22" strokeWidth="5" />
            <rect x="680" y="690" width="240" height="22" rx="8" fill={badge.color} stroke={badge.rim} strokeWidth="4" />
            <path d="M800 724 L808 744 L830 746 L813 760 L818 782 L800 770 L782 782 L787 760 L770 746 L792 744 Z" fill={badge.color} stroke={badge.rim} strokeWidth="3" strokeLinejoin="round" />
          </g>

          {/* The crew, cheering */}
          {(
            [
              ["commander", 450],
              ["doctor", 575],
              ["engineer", 1025],
              ["pilot", 1150],
            ] as const
          ).map(([id, x]) => (
            <g key={id} transform={`translate(${x} 800) scale(0.92)`}>
              <CrewMember id={id} helmet mood="smile" look={x < 800 ? 1 : -1} className={`is-bob${party ? " is-cheer" : " is-wave"}`} />
            </g>
          ))}

          {/* The boy: walks in, steps up, gets crowned */}
          <g className="crown__walk" style={{ transform: `translate(${t >= WALK_AT ? 800 : -140}px, ${t >= ARRIVE_AT - 0.4 ? 698 : 800}px) scale(1.15)` }}>
            <g className={crowned ? "crown__hop" : ""}>
              <Astronaut accent="#2f8496" skin="#c98b62" hair="#2a1a12" helmet mood="smile" look={0} className={walking ? "is-walk" : crowned ? "is-cheer" : "is-wave"} />
            </g>
          </g>

          {/* The crown comes down onto the helmet */}
          <g style={{ transform: `translate(800px, ${t >= CROWN_AT ? 470 : -140}px)`, transition: "transform 0.9s cubic-bezier(0.3, 1.5, 0.5, 1)" }}>
            <Crown badge={badge} />
          </g>

          {/* Fireworks */}
          {party &&
            BURSTS.filter((b) => t >= b.at).map((b) => (
              <g key={b.at} transform={`translate(${b.x} ${b.y})`} aria-hidden="true">
                {Array.from({ length: 16 }, (_, i) => {
                  const a = (i / 16) * Math.PI * 2;
                  return (
                    <circle key={i} className="crown__spark" r={i % 2 ? 7 : 5} fill={i % 3 === 0 ? "#ffffff" : b.color} style={{ "--dx": `${Math.cos(a) * 190}px`, "--dy": `${Math.sin(a) * 190}px` } as CSSProperties} />
                  );
                })}
              </g>
            ))}

          {/* Confetti */}
          {party && (
            <g aria-hidden="true">
              {confetti.map((c, i) => (
                <rect key={i} className="crown__conf" x={c.x} y={-30} width={c.w} height={c.h} fill={c.color} style={{ "--spin": `${c.spin}deg`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` } as CSSProperties} />
              ))}
            </g>
          )}
        </svg>

        <NoteLayer notes={NOTES(badge)} t={t} />

        <button type="button" className="ares__skip" onClick={onDone}>
          Skip ▸
        </button>
        {t >= CTA_AT && (
          <button type="button" className="ares__cta crown__cta" onClick={onDone}>
            See my score ▸
          </button>
        )}
      </div>
    </div>
  );
}
