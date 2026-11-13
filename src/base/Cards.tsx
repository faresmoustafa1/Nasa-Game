// The learning-loop cards: briefing, predict, Day Report, debrief,
// Mission Pause, mission complete, and Earth's late answer.
// Rule for every card: short sentences, icons first, one big button.

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { balance, factsForDay, fmt, glossary, text } from "../game/config";
import type { RunFlare } from "../game/config";
import type { DayDef, DayReport, PauseStat, ReportLine } from "../game/types";
import { DeltaChips } from "./Hud";
import { Icon } from "./Icons";
import type { IconName } from "./Icons";

type ActionName = keyof typeof text.actions;

// ---------------------------------------------------------------------------

function Card({
  title,
  icon,
  tone = "plain",
  children,
  actions,
}: {
  title: string;
  icon?: ReactNode;
  tone?: "plain" | "night" | "pause" | "win";
  children: ReactNode;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>(".card__actions button")?.focus();
  }, []);
  return (
    <div className="overlay">
      <div ref={ref} className={`card card--${tone}`} role="dialog" aria-modal="true" aria-labelledby="card-title">
        <h2 id="card-title" className="card__title">
          {icon}
          {title}
        </h2>
        <div className="card__body">{children}</div>
        <div className="card__actions">{actions}</div>
      </div>
    </div>
  );
}

/** Commander Rivera, the crew mentor. */
export function Rivera({ size = 96 }: { size?: number }) {
  return (
    <svg className="rivera" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#26324f" />
      <path d="M14 100 Q16 72 50 70 Q84 72 86 100 Z" fill="#e8ecf2" />
      <path d="M38 72 L50 86 L62 72" fill="none" stroke="#c9d1dc" strokeWidth="4" />
      <circle cx="68" cy="84" r="6" fill="#e0a63a" stroke="#c58c27" strokeWidth="2" />
      <rect x="44" y="58" width="12" height="14" fill="#8a5a3c" />
      <circle cx="50" cy="44" r="21" fill="#a8704c" />
      <path d="M29 42 Q30 20 50 20 Q70 20 71 42 Q64 30 50 31 Q36 30 29 42 Z" fill="#1f1410" />
      <circle cx="42" cy="45" r="2.8" fill="#1a1208" />
      <circle cx="58" cy="45" r="2.8" fill="#1a1208" />
      <path d="M42 54 Q50 61 58 54" fill="none" stroke="#1a1208" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M37 38 l8 -2 M55 36 l8 2" stroke="#1f1410" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Briefing

export function BriefingCard({ sol, day, onGo }: { sol: number; day: DayDef; onGo: () => void }) {
  const words = day.glossary.filter((w) => glossary[w]);
  return (
    <Card
      title={fmt(text.briefing.title, { n: sol, title: day.title })}
      icon={<Icon name={day.icon as IconName} size={34} />}
      actions={
        <button type="button" className="btn btn--go" onClick={onGo}>
          {text.briefing.go}
        </button>
      }
    >
      <div className="brief">
        <Rivera />
        <div className="brief__bubble">
          <p className="brief__from">{text.briefing.from}</p>
          <p className="brief__say">{day.briefing}</p>
        </div>
      </div>
      {words.length > 0 && (
        <div className="words">
          <p className="words__title">{text.briefing.words}</p>
          {words.map((w) => (
            <p key={w} className="words__item">
              {glossary[w]}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Predict

const BADGE: Record<string, string> = {
  down: "⬇",
  up: "⬆",
  same: "＝",
  radiation: "✕",
  ok: "✓",
  old: "⏳",
  wrong: "✕",
};
const PIC_ICON: Record<string, IconName> = {
  power: "power",
  air: "air",
  plants: "plants",
  crew: "shield",
  message: "message",
};

/** "power-down" → a bolt with a down arrow. */
function PredictPic({ pic }: { pic: string }) {
  const [what, how] = pic.split("-");
  return (
    <span className={`ppic ppic--${how}`} aria-hidden="true">
      <Icon name={PIC_ICON[what] ?? "science"} size={52} />
      <span className="ppic__badge">{BADGE[how] ?? "?"}</span>
    </span>
  );
}

export function PredictCard({ day, onPick, onBack }: { day: DayDef; onPick: (id: string) => void; onBack: () => void }) {
  return (
    <Card
      title={text.predict.title}
      icon={<Icon name="night" size={32} />}
      tone="night"
      actions={
        <button type="button" className="btn btn--quiet" onClick={onBack}>
          {text.predict.back}
        </button>
      }
    >
      <p className="predict__q">{day.predict.question}</p>
      <p className="predict__sub">{text.predict.sub}</p>
      <div className="predict__options">
        {day.predict.options.map((o) => (
          <button key={o.id} type="button" className="popt" onClick={() => onPick(o.id)}>
            <PredictPic pic={o.pic} />
            <span className="popt__text">{o.text}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Day Report

function lineView(line: ReportLine): { icon: IconName; words: string } {
  const r = text.report;
  switch (line.kind) {
    case "walked":
      return { icon: "walk", words: fmt(r.walked, { n: line.count }) };
    case "did":
      return { icon: "check", words: fmt(r.did, { name: text.actions[line.id as ActionName]?.name ?? line.id, n: line.count }) };
    case "breathe":
      return { icon: "air", words: r.breathe };
    case "eat":
      return { icon: "food", words: r.eat };
    case "heat":
      return { icon: "power", words: r.heat };
    case "plantsDroop":
      return { icon: "plants", words: r.plantsDroop };
    case "flare": {
      const words =
        line.through === 0 ? r.flareAll : line.blocked === 0 ? r.flareNone : r.flareSome;
      return { icon: "flare", words: fmt(words, { cls: line.cls, blocked: line.blocked, through: line.through }) };
    }
    case "shieldFade":
      return { icon: "shield", words: r.shieldFade };
    case "sun":
      return { icon: "power", words: line.dust > 0 ? r.sunDusty : r.sun };
    case "pending":
      return { icon: "food", words: r.pending };
    case "dustAdd":
      return { icon: "dust", words: r.dustAdd };
  }
}

function Lines({ lines }: { lines: ReportLine[] }) {
  return (
    <ul className="rlines">
      {lines.map((l, i) => {
        const v = lineView(l);
        return (
          <li key={i} className={`rline rline--${l.kind}`}>
            <Icon name={v.icon} size={26} />
            <span className="rline__words">{v.words}</span>
            <DeltaChips change={l.change} />
          </li>
        );
      })}
    </ul>
  );
}

export function ReportCard({ report, onNext }: { report: DayReport; onNext: () => void }) {
  const r = text.report;
  return (
    <Card
      title={fmt(r.title, { n: report.sol })}
      icon={<Icon name="night" size={32} />}
      actions={
        <button type="button" className="btn btn--go" onClick={onNext}>
          {r.next}
        </button>
      }
    >
      <div className="rbars">
        {(["power", "air", "food"] as const).map((s) => {
          const d = report.after[s] - report.before[s];
          return (
            <div key={s} className={`rbars__item rbars__item--${s}`}>
              <Icon name={s} size={28} />
              <span className="rbars__name">{text.stats[s].name}</span>
              <span className="rbars__nums">
                {report.before[s]} → <b>{report.after[s]}</b>
              </span>
              <span className={`rbars__d ${d >= 0 ? "is-up" : "is-down"}`}>{d > 0 ? `+${d}` : d === 0 ? "±0" : `${d}`}</span>
            </div>
          );
        })}
      </div>
      <p className={`rtodo${report.goalDone ? " is-done" : ""}`}>
        <span className="todo__box" aria-hidden="true">
          {report.goalDone && <Icon name="check" size={20} />}
        </span>
        {report.goalDone ? r.todoDone : r.todoNot}
      </p>
      <h3 className="rhead">{r.today}</h3>
      {report.today.length ? <Lines lines={report.today} /> : <p className="rline">{r.nothing}</p>}
      <h3 className="rhead">{r.night}</h3>
      <Lines lines={report.night} />
      {report.tomorrow.length > 0 && (
        <>
          <h3 className="rhead">{r.tomorrow}</h3>
          <Lines lines={report.tomorrow} />
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Debrief

export function DebriefCard({
  day,
  report,
  predicted,
  notebookCount,
  flare,
  nextSol,
  onNext,
}: {
  day: DayDef;
  report: DayReport;
  predicted: string | null;
  notebookCount: number;
  flare: RunFlare;
  nextSol: number | null;
  onNext: () => void;
}) {
  const d = text.debrief;
  const right = predicted === day.predict.answer;
  const answer = day.predict.options.find((o) => o.id === day.predict.answer);
  const flareLine = report.night.find((l) => l.kind === "flare");
  const cards = factsForDay(day, flare);
  return (
    <Card
      title={d.title}
      icon={<Icon name="science" size={32} />}
      tone="win"
      actions={
        <button type="button" className="btn btn--go" onClick={onNext}>
          {nextSol ? fmt(d.next, { n: nextSol }) : d.finish}
        </button>
      }
    >
      <p className={`guess ${right ? "is-right" : "is-wrong"}`}>
        <span className="guess__mark" aria-hidden="true">
          {right ? "🎉" : "💡"}
        </span>
        {right ? d.right : d.wrong}
      </p>
      {!right && answer && <p className="guess__answer">{fmt(d.answer, { text: answer.text })}</p>}
      <p className="why">{day.debrief.why}</p>
      {flareLine && flareLine.kind === "flare" && (
        <p className="why why--flare">
          <Icon name="flare" size={24} />
          {fmt(flareLine.through === 0 ? text.report.flareAll : flareLine.blocked === 0 ? text.report.flareNone : text.report.flareSome, {
            cls: flareLine.cls,
            blocked: flareLine.blocked,
            through: flareLine.through,
          })}
          <span className={`tag ${flare.source === "example" ? "tag--example" : "tag--real"}`}>
            {flare.source === "example" ? text.labels.example : text.labels.real}
          </span>
        </p>
      )}
      {cards.map((f) => (
            <figure key={f.id} className="fact">
              <p className="fact__tag">
                <span className="tag tag--real">{f.label}</span>
                {!f.checked && import.meta.env.DEV && <span className="tag tag--warn">{d.unchecked}</span>}
              </p>
              <h3 className="fact__title">{f.title}</h3>
              <p className="fact__text">
                {fmt(f.text, { date: flare.date ?? "", class: flare.classType })}
              </p>
              <figcaption className="fact__src">
                Source: {f.source_url ? <a href={f.source_url} target="_blank" rel="noreferrer">{f.source_name}</a> : f.source_name}
              </figcaption>
            </figure>
      ))}
      <p className="notebook-add">
        <Icon name="science" size={22} /> {fmt(d.notebook, { n: notebookCount })}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mission Pause

const PAUSE_ICON: Record<PauseStat, IconName> = { air: "air", food: "food", power: "power", dose: "dose" };
const PAUSE_TIP: Record<PauseStat, keyof typeof text.pause> = {
  air: "tipAir",
  food: "tipFood",
  power: "tipPower",
  dose: "tipDose",
};

export function PauseCard({
  stat,
  sol,
  stuck,
  onRetry,
  onBack,
}: {
  stat: PauseStat;
  sol: number;
  /** No plan can save this sol from its morning: suggest going back. */
  stuck: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  const p = text.pause;
  return (
    <Card
      title={p.title}
      icon={<Icon name={PAUSE_ICON[stat]} size={34} />}
      tone="pause"
      actions={
        stuck ? (
          <>
            <button type="button" className="btn btn--quiet" onClick={onRetry}>
              {fmt(p.retryAnyway, { n: sol })}
            </button>
            <button type="button" className="btn btn--go" onClick={onBack}>
              {fmt(p.back, { n: sol - 1 })}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--go" onClick={onRetry}>
            {fmt(p.retry, { n: sol })}
          </button>
        )
      }
    >
      <p className="pause__why">{p[stat]}</p>
      {stuck ? (
        <p className="pause__tip">{fmt(p.stuck, { n: sol })}</p>
      ) : (
        <p className="pause__tip">{fmt(p[PAUSE_TIP[stat]], { n: balance.day.nightHeatPower })}</p>
      )}
      <p className="pause__calm">{p.calm}</p>
    </Card>
  );
}

export function CompleteCard({
  sols,
  stars,
  cards,
  onAgain,
}: {
  sols: number;
  stars: number;
  cards: number;
  onAgain: () => void;
}) {
  const c = text.complete;
  return (
    <Card
      title={c.title}
      icon={<Icon name="science" size={34} />}
      tone="win"
      actions={
        <button type="button" className="btn btn--go" onClick={onAgain}>
          {c.again}
        </button>
      }
    >
      <div className="brief">
        <Rivera />
        <p className="brief__say">{fmt(c.body, { n: sols })}</p>
      </div>
      <p className="complete__stat">
        <Icon name="science" size={26} /> {fmt(c.stars, { n: stars })}
      </p>
      <p className="complete__stat">
        <Icon name="check" size={26} /> {fmt(c.cards, { n: cards })}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Earth's answer

export function EarthAnswer({ hint, seconds, onClose }: { hint: string; seconds: number; onClose: () => void }) {
  const a = text.askEarth;
  return (
    <div className="earth" role="status">
      <Icon name="message" size={30} />
      <div className="earth__body">
        <p className="earth__says">
          <b>{a.earthSays}</b> {hint}
        </p>
        <p className="earth__note">{fmt(a.delayNote, { s: seconds })}</p>
      </div>
      <button type="button" className="btn btn--small" onClick={onClose}>
        {a.close}
      </button>
    </div>
  );
}
