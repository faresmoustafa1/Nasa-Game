// Mission ARES — Step 2: the base screen.
//   top:    to-do · 3 resource bars (power, air, food) · time points · shield meter
//   middle: the base cutaway; tap a room and the kid walks there (−1 time)
//   bottom: what you can do in the room you are in, with exact costs
//
// Step 3 adds End Sol + Day Report; Step 4 adds the briefing / predict /
// debrief loop. Dev only: ?sol=3 starts a fresh game on sol 3.

import { useEffect, useReducer, useRef, useState } from "react";
import { ROOMS, balance, dayById, days, fmt, text } from "../game/config";
import {
  actionCheck,
  actionsInRoom,
  doAction,
  goalMet,
  isLow,
  newGame,
  solarPower,
  walk,
  walkCheck,
} from "../game/engine";
import { clearGame, loadGame, saveGame } from "../game/save";
import type { Amounts, Check, GameState, RoomId, StatId } from "../game/types";
import BaseScene from "./BaseScene";
import { KID_X } from "./layout";
import { CostChips, ResourceBar, ShieldMeter, TimePoints, TodoCard } from "./Hud";
import { Icon } from "./Icons";
import type { IconName } from "./Icons";
import "./BaseScreen.css";

type Msg = { text: string; kind: "info" | "warn"; key: number };

type Act = { type: "walk"; to: RoomId } | { type: "act"; id: string } | { type: "new" };

/** Days in play order. Step 8 shuffles the middle ones; for now, file order. */
function defaultOrder(): string[] {
  const first = days.filter((d) => d.slot === "first");
  const middle = days.filter((d) => d.slot === "shuffle");
  const last = days.filter((d) => d.slot === "last");
  return [...first, ...middle, ...last].map((d) => d.id);
}

function freshGame(): GameState {
  const devSol = import.meta.env.DEV
    ? Number(new URLSearchParams(window.location.search).get("sol")) || 0
    : 0;
  const order = defaultOrder();
  return newGame(balance, order, devSol >= 1 && devSol <= order.length ? devSol : 1);
}

function init(): GameState {
  const devSol = import.meta.env.DEV && new URLSearchParams(window.location.search).has("sol");
  return (!devSol && loadGame()) || freshGame();
}

function reducer(state: GameState, a: Act): GameState {
  if (a.type === "walk") return walk(balance, state, a.to);
  if (a.type === "act") return doAction(balance, state, a.id);
  clearGame();
  return freshGame();
}

type StatName = keyof typeof text.stats;
const statName = (s: StatId) => text.stats[s as StatName].name;

function reasonText(c: Check, room: RoomId): string {
  if (c.ok) return "";
  const r = text.reasons;
  switch (c.reason) {
    case "noTime":
      return fmt(r.noTime, { n: c.need ?? 1, have: c.have ?? 0 });
    case "notEnough":
      return fmt(r.notEnough, { stat: statName(c.stat!), n: c.need ?? 0, have: c.have ?? 0 });
    case "full":
      return fmt(r.full, { stat: statName(c.stat!) });
    case "limit":
      return r.limit;
    case "noDust":
      return r.noDust;
    case "notHere":
      return fmt(r.notHere, { room: text.rooms[room].name });
  }
}

const ROOM_ICON: Record<RoomId, IconName> = { power: "power", air: "air", greenhouse: "food", shelter: "shield" };

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------------------

export default function BaseScreen() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [walking, setWalking] = useState<{ ms: number; to: RoomId } | null>(null);
  const [facing, setFacing] = useState<1 | -1>(-1);
  const [msg, setMsg] = useState<Msg | null>(null);
  const walkTimer = useRef<number | undefined>(undefined);

  const day = dayById(state.dayOrder[state.sol - 1]);
  const solarToday = solarPower(balance, state.dust);

  useEffect(() => saveGame(state), [state]);
  useEffect(() => () => window.clearTimeout(walkTimer.current), []);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [msg]);

  const say = (t: string, kind: Msg["kind"] = "info") => setMsg({ text: t, kind, key: (msg?.key ?? 0) + 1 });

  const explain = (stat: StatName) =>
    say(`${text.stats[stat].name}: ${fmt(text.stats[stat].explain, { n: balance.day.timePoints })}`);

  function onRoomTap(to: RoomId) {
    if (walking) return say(text.reasons.walking, "warn");
    if (to === state.room) return;
    const check = walkCheck(balance, state, to);
    if (!check.ok) return say(reasonText(check, to), "warn");
    const dx = KID_X[to] - KID_X[state.room];
    const ms = reducedMotion() ? 150 : Math.max(450, Math.round(Math.abs(dx) / 0.7));
    setFacing(dx > 0 ? 1 : -1);
    setWalking({ ms, to });
    dispatch({ type: "walk", to });
    window.clearTimeout(walkTimer.current);
    walkTimer.current = window.setTimeout(() => setWalking(null), ms);
  }

  function onAction(id: string) {
    if (walking) return say(text.reasons.walking, "warn");
    const check = actionCheck(balance, state, id);
    if (!check.ok) return say(reasonText(check, state.room), "warn");
    dispatch({ type: "act", id });
  }

  function onNewGame() {
    if (window.confirm(text.confirmNewGame)) {
      setWalking(null);
      dispatch({ type: "new" });
    }
  }

  const lightsOn = (state.usedToday.growLights ?? 0) > 0;
  const canWalk = state.timeLeft >= balance.walk.time;

  return (
    <div className="base">
      <header className="base__hud">
        <TodoCard
          sol={state.sol}
          total={state.dayOrder.length}
          todo={day.todo}
          done={goalMet(day, state)}
          onExplainSol={() => say(text.hud.solExplain)}
        />
        <div className="base__bars">
          {(["power", "air", "food"] as const).map((r) => (
            <ResourceBar
              key={r}
              stat={r}
              value={state[r]}
              max={balance.resources[r].max}
              low={isLow(balance, r, state[r])}
              onExplain={() => explain(r)}
            />
          ))}
        </div>
        <div className="base__side">
          <TimePoints left={state.timeLeft} max={balance.day.timePoints} onExplain={() => explain("time")} />
          {day.showRadiation && (
            <ShieldMeter level={state.shield} max={balance.shield.max} onExplain={() => explain("shield")} />
          )}
          <div className="base__tools">
            <button type="button" className="tag tag--game" onClick={() => say(text.hud.gameSizedExplain)}>
              {text.hud.gameSized}
            </button>
            <button type="button" className="base__menu" onClick={onNewGame}>
              {text.hud.menu}
            </button>
          </div>
        </div>
      </header>

      <main className="base__stage">
        <BaseScene
          room={state.room}
          power={state.power}
          powerMax={balance.resources.power.max}
          air={state.air}
          airMax={balance.resources.air.max}
          food={state.food}
          foodMax={balance.resources.food.max}
          shield={state.shield}
          shieldMax={balance.shield.max}
          dust={state.dust}
          dustMax={balance.dust.max}
          solarToday={solarToday}
          lightsOn={lightsOn}
          walking={walking}
          facing={facing}
          canWalk={canWalk}
          onRoomTap={onRoomTap}
        />
      </main>

      <nav className="base__roombar" aria-label="Rooms">
        {ROOMS.map((r) => {
          const here = r === state.room && !walking;
          return (
            <button
              key={r}
              type="button"
              className={`roomtab${r === state.room ? " is-here" : ""}`}
              onClick={() => onRoomTap(r)}
              aria-label={here ? `${text.rooms[r].name}. ${text.panel.youAreHere}.` : `${text.rooms[r].name}. ${text.panel.walkCost}: minus 1 time.`}
            >
              <Icon name={ROOM_ICON[r]} size={26} />
              <span className="roomtab__name">{text.rooms[r].name}</span>
              {r !== state.room && (
                <span className="roomtab__cost" aria-hidden="true">
                  <Icon name="walk" size={16} />−1<Icon name="time" size={16} />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <footer className="base__panel" aria-live="polite">
        {msg && (
          <p key={msg.key} className={`toast toast--${msg.kind}`} role={msg.kind === "warn" ? "alert" : "status"}>
            {msg.text}
          </p>
        )}
        <RoomPanel state={state} walkingTo={walking?.to ?? null} onAction={onAction} />
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** What the chips show. Cleaning shows its real payoff: more power tomorrow. */
function shownDeal(id: string): { cost: Amounts; gain: Amounts; later: { inDays: number; gain: Amounts }[] } {
  const a = balance.actions[id];
  const gain = { ...a.gain };
  const later = [...(a.later ?? [])];
  if ((gain.dust ?? 0) < 0) {
    later.push({ inDays: 1, gain: { power: -gain.dust! * balance.day.dustPowerLossPerLevel } });
    delete gain.dust;
  }
  return { cost: a.cost, gain, later };
}

type ActionName = keyof typeof text.actions;

function RoomPanel({
  state,
  walkingTo,
  onAction,
}: {
  state: GameState;
  walkingTo: RoomId | null;
  onAction: (id: string) => void;
}) {
  const ids = actionsInRoom(balance, state.room);
  const room = text.rooms[state.room];
  return (
    <section className={`panel${walkingTo ? " is-busy" : ""}`}>
      <h2 className="panel__title">
        <Icon name={ROOM_ICON[state.room]} size={30} />
        {room.name}
        <span className="panel__about">{room.about}</span>
      </h2>
      {ids.length === 0 ? (
        <p className="panel__hint">{text.panel.noActions}</p>
      ) : (
        <div className="panel__actions">
          {ids.map((id) => {
            const check = actionCheck(balance, state, id);
            const deal = shownDeal(id);
            const used = state.usedToday[id] ?? 0;
            const max = balance.actions[id].maxPerDay;
            const words = text.actions[id as ActionName];
            return (
              <button
                key={id}
                type="button"
                className={`action${check.ok ? "" : " is-off"}`}
                aria-disabled={!check.ok}
                onClick={() => onAction(id)}
              >
                <span className="action__name">{words.name}</span>
                <span className="action__about">{words.about}</span>
                <CostChips cost={deal.cost} gain={deal.gain} later={deal.later} />
                <span className="action__foot">
                  {!check.ok ? (
                    <span className="action__why">{reasonText(check, state.room)}</span>
                  ) : (
                    <span />
                  )}
                  <span className="action__uses">{fmt(text.panel.usesToday, { n: used, max })}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {walkingTo ? (
        <p className="panel__hint panel__walking">
          <Icon name="walk" size={24} /> {fmt(text.panel.walking, { room: text.rooms[walkingTo].name })}
        </p>
      ) : (
        <p className="panel__hint">{text.panel.tapRoom}</p>
      )}
    </section>
  );
}
