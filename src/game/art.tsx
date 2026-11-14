// Mission ARES — shared drawing pieces (all SVG, no image files).
// Same palette as the prologue: warm #ffcf99, the boy's teal shirt and yellow
// backpack, deep-blue night.

import { useMemo } from "react";
import { CREW } from "./crew";
import type { CrewId } from "./crew";
import { seededRandom } from "./random";

export function StarField({ count = 120, seed = 2026, maxY = 900 }: { count?: number; seed?: number; maxY?: number }) {
  const stars = useMemo(() => {
    const rand = seededRandom(seed);
    return Array.from({ length: count }, () => ({
      x: rand() * 1600,
      y: rand() * maxY,
      r: 0.6 + rand() * 1.5,
      delay: rand() * 4,
    }));
  }, [count, seed, maxY]);
  return (
    <g className="ares__stars" aria-hidden="true">
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} style={{ animationDelay: `${s.delay}s` }} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// People. Feet at (0, 0), about 200 units tall, seen from the front.
// ---------------------------------------------------------------------------

export type Mood = "calm" | "smile" | "wow" | "worried";

function FaceParts({ cy, look, mood }: { cy: number; look: number; mood: Mood }) {
  const ex = look * 3;
  return (
    <g aria-hidden="true">
      {mood === "worried" && (
        <>
          <path d={`M${-13 + ex} ${cy - 11} L${-4 + ex} ${cy - 14}`} stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" />
          <path d={`M${13 + ex} ${cy - 11} L${4 + ex} ${cy - 14}`} stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      <circle cx={-8 + ex} cy={cy} r={mood === "wow" ? 3.4 : 2.7} fill="#14100c" />
      <circle cx={8 + ex} cy={cy} r={mood === "wow" ? 3.4 : 2.7} fill="#14100c" />
      {mood === "smile" && (
        <path d={`M${-8 + ex} ${cy + 9} Q${ex} ${cy + 17} ${8 + ex} ${cy + 9}`} fill="none" stroke="#5a2a1a" strokeWidth="2.2" strokeLinecap="round" />
      )}
      {mood === "calm" && (
        <path d={`M${-6 + ex} ${cy + 11} L${6 + ex} ${cy + 11}`} stroke="#5a2a1a" strokeWidth="2.2" strokeLinecap="round" />
      )}
      {mood === "wow" && <ellipse cx={ex} cy={cy + 12} rx="4" ry="5" fill="#5a2a1a" />}
      {mood === "worried" && (
        <path d={`M${-6 + ex} ${cy + 13} Q${-2 + ex} ${cy + 8} ${ex} ${cy + 12} Q${2 + ex} ${cy + 16} ${6 + ex} ${cy + 11}`} fill="none" stroke="#5a2a1a" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </g>
  );
}

export type AstronautProps = {
  accent: string;
  skin: string;
  hair: string;
  helmet?: boolean;
  look?: -1 | 0 | 1;
  mood?: Mood;
  /** Hold something up with the right hand (used for the tablet and clipboard). */
  className?: string;
};

export function Astronaut({ accent, skin, hair, helmet = false, look = 0, mood = "calm", className }: AstronautProps) {
  return (
    <g className={`astro${className ? ` ${className}` : ""}`}>
      <ellipse className="astro__shadow" cx="0" cy="2" rx="40" ry="7" />
      <rect x="-19" y="-82" width="15" height="78" rx="6" fill="#dfe4ee" />
      <rect x="4" y="-82" width="15" height="78" rx="6" fill="#d3d9e6" />
      <ellipse cx="-11" cy="-3" rx="11" ry="5.5" fill="#46526e" />
      <ellipse cx="12" cy="-3" rx="11" ry="5.5" fill="#46526e" />
      <g className="astro__arm">
        <rect x="-46" y="-148" width="15" height="66" rx="7" fill="#e4e8f1" stroke="#b8c0d2" strokeWidth="1" />
        <circle cx="-38.5" cy="-80" r="7.5" fill="#46526e" />
      </g>
      <rect x="-31" y="-152" width="62" height="76" rx="17" fill="#eef1f7" stroke="#b8c0d2" strokeWidth="1.5" />
      <rect x="-31" y="-118" width="62" height="10" fill={accent} />
      <circle cx="-14" cy="-134" r="6.5" fill={accent} />
      <rect x="-9" y="-104" width="18" height="12" rx="3" fill="#b8c0d2" />
      <g className="astro__arm astro__arm--r">
        <rect x="31" y="-148" width="15" height="66" rx="7" fill="#e4e8f1" stroke="#b8c0d2" strokeWidth="1" />
        <circle cx="38.5" cy="-80" r="7.5" fill="#46526e" />
      </g>
      <rect x="-7" y="-166" width="14" height="14" fill={skin} />
      <circle cx="0" cy="-180" r="22" fill={skin} />
      <path d="M-22 -184 Q0 -210 22 -184 Q12 -194 0 -193 Q-12 -194 -22 -184 Z" fill={hair} />
      <FaceParts cy={-178} look={look} mood={mood} />
      {helmet && (
        <g aria-hidden="true">
          <circle cx="0" cy="-179" r="32" fill="rgba(150,195,235,0.2)" stroke="#d6deee" strokeWidth="4" />
          <path d="M-18 -196 A24 24 0 0 1 4 -206" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
          <rect x="-24" y="-156" width="48" height="8" rx="4" fill="#cfd8ea" />
        </g>
      )}
    </g>
  );
}

/** The boy in his own clothes: teal shirt, yellow backpack. Kid-sized look. */
export function Boy({ mood = "worried", look = 0, className }: { mood?: Mood; look?: -1 | 0 | 1; className?: string }) {
  return (
    <g className={`boy${className ? ` ${className}` : ""}`}>
      <ellipse className="astro__shadow" cx="0" cy="2" rx="36" ry="7" />
      <rect x="-17" y="-80" width="14" height="76" rx="6" fill="#26324f" />
      <rect x="3" y="-80" width="14" height="76" rx="6" fill="#222c47" />
      <ellipse cx="-10" cy="-3" rx="10" ry="5" fill="#0e1424" />
      <ellipse cx="10" cy="-3" rx="10" ry="5" fill="#0e1424" />
      <g className="astro__arm">
        <rect x="-39" y="-146" width="13" height="62" rx="6" fill="#2b7686" />
        <circle cx="-32.5" cy="-82" r="6.5" fill="#c98b62" />
      </g>
      <path d="M-28 -150 Q0 -158 28 -150 L31 -84 Q0 -76 -31 -84 Z" fill="#2f8496" />
      <rect x="-31" y="-90" width="62" height="10" rx="4" fill="#256b7a" />
      <rect x="-21" y="-152" width="9" height="66" rx="4" fill="#e0a63a" />
      <rect x="12" y="-152" width="9" height="66" rx="4" fill="#e0a63a" />
      <g className="astro__arm astro__arm--r">
        <rect x="26" y="-146" width="13" height="62" rx="6" fill="#2b7686" />
        <circle cx="32.5" cy="-82" r="6.5" fill="#c98b62" />
      </g>
      <rect x="-6" y="-164" width="12" height="13" fill="#b57a54" />
      <circle cx="-20" cy="-178" r="4.5" fill="#c98b62" />
      <circle cx="20" cy="-178" r="4.5" fill="#c98b62" />
      <circle cx="0" cy="-180" r="20" fill="#c98b62" />
      <path d="M-21 -184 Q0 -208 21 -184 Q10 -192 0 -191 Q-10 -192 -21 -184 Z" fill="#2a1a12" />
      <FaceParts cy={-179} look={look} mood={mood} />
    </g>
  );
}

export function CrewMember({ id, helmet, look, mood, className }: { id: CrewId; helmet?: boolean; look?: -1 | 0 | 1; mood?: Mood; className?: string }) {
  const c = CREW.find((m) => m.id === id)!;
  return <Astronaut accent={c.accent} skin={c.skin} hair={c.hair} helmet={helmet} look={look} mood={mood} className={className} />;
}
