// Mission ARES — the result screen: badge, score, what you chose, three "Back on Earth" cards,
// and a button to the Data Sources screen. Nobody fails: every player gets a badge.

import { useEffect, useRef, useState } from "react";
import { createGameAudio } from "../game/gameAudio";
import type { GameAudio } from "../game/gameAudio";
import { crewFaces } from "../game/state";
import type { GameState } from "../game/state";
import { EARTH_CARDS } from "./earth";
import { badgeOf, scoreOf } from "./score";
import type { Badge } from "./score";
import Sources from "./Sources";
import "./result.css";

type ResultProps = {
  game: GameState;
  onAgain: () => void;
  onTitle: () => void;
  sound?: boolean;
};

const FACE = { happy: "😀", okay: "🙂", tired: "😟" } as const;

function Medal({ badge }: { badge: Badge }) {
  return (
    <svg className="res__medal" viewBox="0 0 200 240" role="img" aria-label={`${badge.name} badge`}>
      <path d="M60 0 L100 80 L140 0 Z" fill="#4a8be0" />
      <path d="M80 0 L100 40 L120 0 Z" fill="#8cb8f0" />
      <circle cx="100" cy="150" r="78" fill={badge.rim} />
      <circle cx="100" cy="150" r="66" fill={badge.color} />
      <circle cx="100" cy="150" r="52" fill="none" stroke={badge.rim} strokeWidth="4" strokeDasharray="3 7" />
      <path d="M100 118 L110 140 L134 142 L116 158 L122 182 L100 169 L78 182 L84 158 L66 142 L90 140 Z" fill={badge.rim} />
    </svg>
  );
}

export default function Result({ game, onAgain, onTitle, sound = true }: ResultProps) {
  const [view, setView] = useState<"result" | "sources">("result");
  const audioRef = useRef<GameAudio | null>(null);
  const s = scoreOf(game);
  const badge = badgeOf(s.total);

  useEffect(() => {
    if (!sound) return;
    const audio = createGameAudio();
    audioRef.current = audio;
    const id = window.setTimeout(() => audio.chime(), 500);
    return () => {
      window.clearTimeout(id);
      audio.stop();
      audioRef.current = null;
    };
  }, [sound]);

  if (view === "sources") return <Sources onBack={() => setView("result")} />;

  const rows: { label: string; value: string; hint: string }[] = [
    { label: "Rocks", value: `+${s.rocks}`, hint: `${game.samples} rock${game.samples === 1 ? "" : "s"} from Mars` },
    { label: "Harvest", value: `+${s.harvest}`, hint: "fresh food from the greenhouse" },
    { label: "Crew", value: `+${s.crew}`, hint: "how happy and well your crew is" },
    { label: "Supplies left", value: `+${s.leftover}`, hint: `Power ${game.meters.power} · Water ${game.meters.water} · Air ${game.meters.air}` },
  ];
  if (s.penalty > 0) rows.push({ label: "Emergency backups", value: `−${s.penalty}`, hint: "the backup saved the crew, but it costs points" });

  return (
    <div className="res">
      <div className="res__page">
        <header className="res__head">
          <Medal badge={badge} />
          <div>
            <h1>Mission complete!</h1>
            <p className="res__badge" style={{ color: badge.color }}>
              {badge.name}
            </p>
            <p className="res__line">{badge.line}</p>
          </div>
        </header>

        <section className="res__score" aria-label="Your score">
          <h2>
            Your score <b>{s.total}</b>
          </h2>
          <ul>
            {rows.map((r) => (
              <li key={r.label}>
                <span>
                  {r.label}
                  <small>{r.hint}</small>
                </span>
                <b>{r.value}</b>
              </li>
            ))}
          </ul>
          <div className="res__crew" aria-label="Crew mood">
            {crewFaces(game.crew).map((f, i) => (
              <span key={i}>{FACE[f]}</span>
            ))}
          </div>
        </section>

        <section className="res__recap" aria-label="What you chose">
          <h2>What you chose</h2>
          <ol>
            {game.log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </section>

        <section className="res__earth" aria-label="Back on Earth">
          <h2>Back on Earth</h2>
          <div className="res__cards">
            {EARTH_CARDS.map((c) => (
              <article key={c.id}>
                <b>{c.title}</b>
                <p>{c.text}</p>
                <small>Source: {c.source}</small>
              </article>
            ))}
          </div>
        </section>

        <div className="res__buttons">
          <button type="button" className="res__btn res__btn--main" onClick={onAgain}>
            Play again ▸
          </button>
          <button type="button" className="res__btn" onClick={() => setView("sources")}>
            Data sources
          </button>
          <button type="button" className="res__btn" onClick={onTitle}>
            Title
          </button>
        </div>
        <p className="res__note">Next time the weather, the crop and the interesting rock will be different.</p>
      </div>
    </div>
  );
}
