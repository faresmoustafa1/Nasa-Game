// The top bar: to-do, the 3 resource bars, time points, shield meter.
// Plus CostChips, used on every button that costs something.

import { useState } from "react";
import type { ReactNode } from "react";
import { fmt, text } from "../game/config";
import type { Amounts, StatId } from "../game/types";
import { Icon } from "./Icons";
import type { IconName } from "./Icons";

type StatName = keyof typeof text.stats;
const statName = (s: StatId) => text.stats[s as StatName].name;

// ---------------------------------------------------------------------------

export function ResourceBar({
  stat,
  value,
  max,
  low,
  onExplain,
}: {
  stat: "power" | "air" | "food";
  value: number;
  max: number;
  low: boolean;
  onExplain: () => void;
}) {
  // Remember the last value so a change can float up as "+3" / "-3".
  const [prev, setPrev] = useState(value);
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null);
  if (value !== prev) {
    setPrev(value);
    setDelta({ n: value - prev, key: (delta?.key ?? 0) + 1 });
  }

  const name = statName(stat);
  return (
    <button
      type="button"
      className={`rbar rbar--${stat}${low ? " is-low" : ""}`}
      onClick={onExplain}
      aria-label={`${name}: ${value} of ${max}.${low ? " " + text.hud.low : ""} Tap to learn more.`}
    >
      <Icon name={stat} size={36} />
      <span className="rbar__body">
        <span className="rbar__top">
          <span className="rbar__name">{name}</span>
          <span className="rbar__num">
            {value}
            <small>/{max}</small>
          </span>
        </span>
        <span className="rbar__track" aria-hidden="true">
          <span className="rbar__fill" style={{ width: `${(value / max) * 100}%` }} />
        </span>
        {low && <span className="rbar__low">⚠ {text.hud.low}</span>}
      </span>
      {delta && (
        <span key={delta.key} className={`rbar__delta ${delta.n > 0 ? "is-up" : "is-down"}`} aria-hidden="true">
          {delta.n > 0 ? `+${delta.n}` : delta.n}
        </span>
      )}
    </button>
  );
}

export function TimePoints({ left, max, onExplain }: { left: number; max: number; onExplain: () => void }) {
  return (
    <button
      type="button"
      className="tpoints"
      onClick={onExplain}
      aria-label={`${fmt(text.hud.timeLeft, { n: left, max })}. Tap to learn more.`}
    >
      <span className="tpoints__label">
        <Icon name="time" size={22} />
        {text.hud.time}
      </span>
      <span className="tpoints__pips" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`tpoints__pip${i < left ? " is-full" : ""}`} />
        ))}
      </span>
      <span className="tpoints__num">
        {left}
        <small>/{max}</small>
      </span>
    </button>
  );
}

export function ShieldMeter({
  level,
  max,
  dose,
  doseMax,
  onExplain,
}: {
  level: number;
  max: number;
  dose: number;
  doseMax: number;
  onExplain: () => void;
}) {
  return (
    <button
      type="button"
      className="smeter"
      onClick={onExplain}
      aria-label={`${fmt(text.hud.shield, { n: level, max })}. ${fmt(text.hud.dose, { n: dose, max: doseMax })}. Tap to learn more.`}
    >
      <Icon name="shield" size={30} />
      <span className="smeter__segs" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`smeter__seg${i < level ? " is-on" : ""}`} />
        ))}
      </span>
      <span className="smeter__num">
        <span className="smeter__long">{fmt(text.hud.shield, { n: level, max })}</span>
        <span className="smeter__short">
          {level}/{max}
        </span>
      </span>
      <span className={`smeter__dose${dose > 0 ? " is-hot" : ""}`}>
        <Icon name="dose" size={18} />
        <span className="smeter__long">{fmt(text.hud.dose, { n: dose, max: doseMax })}</span>
        <span className="smeter__short">
          {dose}/{doseMax}
        </span>
      </span>
    </button>
  );
}

export function TodoCard({
  sol,
  total,
  todo,
  icon,
  done,
  onExplainSol,
  children,
}: {
  sol: number;
  total: number;
  todo: string;
  icon: IconName;
  done: boolean;
  onExplainSol: () => void;
  children?: ReactNode;
}) {
  return (
    <div className={`todo${done ? " is-done" : ""}`}>
      <button type="button" className="todo__sol" onClick={onExplainSol} aria-label={`${fmt(text.hud.sol, { n: sol, total })}. What is a sol?`}>
        {fmt(text.hud.sol, { n: sol, total })}
      </button>
      <p className="todo__row">
        <span className="todo__box" role="img" aria-label={done ? "Done" : "Not done yet"}>
          {done && <Icon name="check" size={22} />}
        </span>
        <Icon name={icon} size={24} />
        <span>
          <span className="todo__label">{text.hud.todo}:</span> {todo}
        </span>
      </p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cost chips: "-3 ⚡ Power  →  +3 O₂ Air"

function Chip({ stat, n, note }: { stat: StatId; n: number; note?: string }) {
  const sign = n > 0 ? "+" : "−";
  // More dust or dose is bad news, so it gets the "minus" look.
  const good = stat === "dust" || stat === "dose" ? n < 0 : n > 0;
  return (
    <span className={`chip chip--${stat} ${good ? "chip--plus" : "chip--minus"}`}>
      <Icon name={stat} size={20} />
      <b>
        {sign}
        {Math.abs(n)}
      </b>
      <span className="chip__name">
        {statName(stat)}
        {note && <em> {note}</em>}
      </span>
    </span>
  );
}

/** Signed chips for a change, e.g. { air: -3, food: 1 } → "−3 Air" "+1 Food". */
export function DeltaChips({ change }: { change: Amounts }) {
  const list = (Object.entries(change) as [StatId, number][]).filter(([, n]) => n);
  if (!list.length) return null;
  return (
    <span className="deal__side">
      {list.map(([stat, n]) => (
        <Chip key={stat} stat={stat} n={n} />
      ))}
    </span>
  );
}

/** Adds up "later" gains per stat: [{1d: +1 food}, {2d: +1 food}] → +2 food over 2 sols. */
function laterTotals(later: { inDays: number; gain: Amounts }[]) {
  const totals = new Map<StatId, { n: number; days: number }>();
  for (const l of later) {
    for (const [stat, n] of Object.entries(l.gain) as [StatId, number][]) {
      const t = totals.get(stat) ?? { n: 0, days: 0 };
      totals.set(stat, { n: t.n + n, days: Math.max(t.days, l.inDays) });
    }
  }
  return [...totals.entries()];
}

export function CostChips({
  cost,
  gain,
  later = [],
}: {
  cost: Amounts;
  gain: Amounts;
  later?: { inDays: number; gain: Amounts }[];
}) {
  const costs = (Object.entries(cost) as [StatId, number][]).filter(([, n]) => n);
  const gains = (Object.entries(gain) as [StatId, number][]).filter(([, n]) => n);
  const laters = laterTotals(later);
  return (
    <span className="deal">
      <span className="deal__side">
        <span className="sr-only">{text.panel.costs}: </span>
        {costs.map(([stat, n]) => (
          <Chip key={stat} stat={stat} n={-n} />
        ))}
      </span>
      <span className="deal__arrow" aria-hidden="true">
        →
      </span>
      <span className="deal__side">
        <span className="sr-only">{text.panel.gives}: </span>
        {gains.map(([stat, n]) => (
          <Chip key={stat} stat={stat} n={n} />
        ))}
        {laters.map(([stat, t]) => (
          <Chip
            key={`later-${stat}`}
            stat={stat}
            n={t.n}
            note={t.days > 1 ? fmt(text.panel.overDays, { n: t.days }) : text.panel.tomorrow}
          />
        ))}
      </span>
    </span>
  );
}
