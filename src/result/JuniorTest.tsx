// Mission ARES — the Junior Astronaut Test: three quick questions about facts the player met in the game.
// It is optional, nobody loses points, and a wrong answer just shows the right one. A game badge, not a real job.

import { useEffect, useRef, useState } from "react";
import { CrewMember, StarField } from "../game/art";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import "../game/game.css";
import "./junior.css";

type Question = { ask: string; options: string[]; right: number; why: string; source: string };

/** Every question comes from a fact shown (with its source) earlier in the game; see game/sources.ts. */
const QUESTIONS: Question[] = [
  {
    ask: "Which Mars rock is best at keeping clues of ancient life?",
    options: ["Rock made from hot lava", "Rock made of lake mud", "All rocks are the same"],
    right: 1,
    why: "Mud that settles in a lake traps tiny clues. NASA found the most organic matter of the mission in a lake-mud rock called Wildcat Ridge.",
    source: "NASA · Perseverance Rover Investigates Geologically Rich Mars Terrain (Sept 15, 2022)",
  },
  {
    ask: "How long does landing on Mars take?",
    options: ["About 7 minutes", "About 7 hours", "About 7 days"],
    right: 0,
    why: "The ship slows from 19,500 km/h to almost zero in only about 7 minutes!",
    source: "NASA/JPL · Mars 2020 Perseverance press kit",
  },
  {
    ask: "How can a base make air to breathe?",
    options: ["It collects wind", "It melts rocks", "A machine splits water into oxygen, using power"],
    right: 2,
    why: "The space station does it this way too: water plus power gives oxygen.",
    source: "NASA · ISS Environmental Control and Life Support System",
  },
];

type Props = { onDone: (stars: number | null) => void };

export default function JuniorTest({ onDone }: Props) {
  /** -1 = the offer, 0..2 = a question, 3 = finished. */
  const [step, setStep] = useState(-1);
  const [picked, setPicked] = useState<number | null>(null);
  const [stars, setStars] = useState(0);
  const audioRef = useRef<GameAudio | null>(null);

  useEffect(() => {
    const audio = createGameAudio();
    audioRef.current = audio;
    return () => {
      audio.stop();
      audioRef.current = null;
    };
  }, []);

  const q = step >= 0 && step < QUESTIONS.length ? QUESTIONS[step] : null;

  const answer = (i: number) => {
    if (!q || picked !== null) return;
    setPicked(i);
    if (i === q.right) {
      setStars((s) => s + 1);
      audioRef.current?.chime();
    }
  };
  const next = () => {
    setPicked(null);
    setStep((s) => s + 1);
    if (step + 1 >= QUESTIONS.length) audioRef.current?.fanfare();
  };

  const line =
    step === -1
      ? "You think like a real astronaut! Want to take the Junior Astronaut Test? It is just a game, 3 quick questions, and nobody loses points."
      : q
        ? picked === null
          ? `Question ${step + 1} of ${QUESTIONS.length}`
          : picked === q.right
            ? "Yes! That is right!"
            : "Almost! Here is the answer:"
        : stars === QUESTIONS.length
          ? "3 out of 3! You are a real Junior Astronaut!"
          : `${stars} out of 3. You earned your Junior Astronaut badge, and now you know more about Mars!`;

  return (
    <div className="ares junior">
      <div className="ares__stage">
        <svg className="ares__scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The Commander offers the Junior Astronaut Test">
          <defs>
            <linearGradient id="jt-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b0f2e" />
              <stop offset="1" stopColor="#3b2457" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#jt-sky)" />
          <StarField count={110} seed={31} />
          <path d="M0 800 Q400 740 800 790 Q1200 830 1600 770 V900 H0 Z" fill="#6e3a1e" />
          <g transform="translate(220 820) scale(1.35)">
            <CrewMember id="commander" helmet mood="smile" look={1} className="is-bob" />
          </g>
        </svg>

        <div className="junior__card" role="group" aria-live="polite">
          <p className="junior__tag">Junior Astronaut Test</p>
          <p className="junior__line">{line}</p>

          {step === -1 && (
            <div className="junior__row">
              <button type="button" className="junior__btn junior__btn--go" onClick={() => setStep(0)}>
                Take the test ▸
              </button>
              <button type="button" className="junior__btn" onClick={() => onDone(null)}>
                Skip
              </button>
            </div>
          )}

          {q && (
            <>
              <p className="junior__ask">{q.ask}</p>
              <div className="junior__opts">
                {q.options.map((o, i) => (
                  <button
                    key={o}
                    type="button"
                    disabled={picked !== null}
                    className={`junior__btn junior__opt${picked !== null && i === q.right ? " is-right" : ""}${picked === i && i !== q.right ? " is-miss" : ""}`}
                    onClick={() => answer(i)}
                  >
                    {o}
                  </button>
                ))}
              </div>
              {picked !== null && (
                <>
                  <p className="junior__why">
                    {q.why}
                    <span className="junior__src">Source: {q.source}</span>
                  </p>
                  <button type="button" className="junior__btn junior__btn--go" onClick={next}>
                    {step + 1 < QUESTIONS.length ? "Next question ▸" : "Finish ▸"}
                  </button>
                </>
              )}
            </>
          )}

          {step >= QUESTIONS.length && (
            <>
              <p className="junior__stars" aria-label={`${stars} of ${QUESTIONS.length} stars`}>
                {QUESTIONS.map((_, i) => (i < stars ? "★" : "☆")).join(" ")}
              </p>
              <button type="button" className="junior__btn junior__btn--go" onClick={() => onDone(stars)}>
                Continue ▸
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
