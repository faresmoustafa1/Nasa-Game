// Mission ARES — the base screen and the sol loop.
//
//   briefing → play → predict → night → report → debrief → next sol's briefing
//                                          └→ Mission Pause → retry the sol
//
//   top:    to-do · 3 resource bars · time points · shield meter (flare days)
//   middle: the base cutaway; tap a room and the kid walks there (−1 time)
//   bottom: room actions with exact costs · Ask Earth · tonight's needs · End Sol
//
// Dev only: ?sol=3 starts a fresh game on sol 3.

import { useEffect, useReducer, useRef, useState } from "react";
import {
  EXAMPLE_FLARE,
  ROOMS,
  balance,
  dayById,
  days,
  factsForDay,
  fmt,
  runInfo,
  text,
} from "../game/config";
import {
  actionCheck,
  actionDeal,
  actionsInRoom,
  askEarth,
  askEarthCheck,
  canSurviveSol,
  doAction,
  endSol,
  flareTonight,
  goalMet,
  isLow,
  newGame,
  retrySol,
  solarPower,
  tonightNeeds,
  walk,
  walkCheck,
} from "../game/engine";
import { clearSession, coachDone, loadSession, saveSession, setCoachDone } from "../game/save";
import type { Session } from "../game/save";
import type { Amounts, Check, DayDef, GameState, ResourceId, RoomId, StatId } from "../game/types";
import BaseScene from "./BaseScene";
import { BriefingCard, CompleteCard, DebriefCard, EarthAnswer, PauseCard, PredictCard, ReportCard } from "./Cards";
import Coach from "./Coach";
import { CostChips, DeltaChips, ResourceBar, ShieldMeter, TimePoints, TodoCard } from "./Hud";
import { Icon } from "./Icons";
import type { IconName } from "./Icons";
import { COACH_STEPS, KID_X } from "./layout";
import "./BaseScreen.css";
import "./Cards.css";

type Msg = { text: string; kind: "info" | "warn"; key: number };

type Act =
  | { type: "walk"; to: RoomId }
  | { type: "act"; id: string }
  | { type: "askEarth" }
  | { type: "startPlay" }
  | { type: "endSol" }
  | { type: "back" }
  | { type: "predict"; choice: string }
  | { type: "showReport" }
  | { type: "reportNext" }
  | { type: "debriefNext" }
  | { type: "retry" }
  | { type: "backSol" }
  | { type: "new" };

/** Days in play order. Step 8 shuffles the middle ones; for now, file order. */
function defaultOrder(): string[] {
  const first = days.filter((d) => d.slot === "first");
  const middle = days.filter((d) => d.slot === "shuffle");
  const last = days.filter((d) => d.slot === "last");
  return [...first, ...middle, ...last].map((d) => d.id);
}

function freshSession(): Session {
  const devSol = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get("sol")) || 0 : 0;
  const order = defaultOrder();
  const sol = devSol >= 1 && devSol <= order.length ? devSol : 1;
  const game = newGame(balance, order, dayById(order[sol - 1]), sol);
  return {
    v: 2,
    game,
    phase: "briefing",
    result: null,
    predicted: null,
    flare: EXAMPLE_FLARE,
    mornings: game.morning ? { [sol]: game.morning } : {},
  };
}

function init(): Session {
  const devSol = import.meta.env.DEV && new URLSearchParams(window.location.search).has("sol");
  const saved = devSol ? null : loadSession();
  if (!saved) return freshSession();
  // Reloaded during the night animation: skip to the report.
  return saved.phase === "night" ? { ...saved, phase: "report" } : saved;
}

const today = (g: GameState) => dayById(g.dayOrder[g.sol - 1]);
const tomorrow = (g: GameState) => (g.sol < g.dayOrder.length ? dayById(g.dayOrder[g.sol]) : null);

function reducer(s: Session, a: Act): Session {
  const g = s.game;
  switch (a.type) {
    case "walk":
      return s.phase === "play" ? { ...s, game: walk(balance, g, a.to) } : s;
    case "act":
      return s.phase === "play" ? { ...s, game: doAction(balance, g, a.id) } : s;
    case "askEarth":
      return s.phase === "play" ? { ...s, game: askEarth(balance, g) } : s;
    case "startPlay":
      return { ...s, phase: "play" };
    case "endSol":
      return s.phase === "play" ? { ...s, phase: "predict" } : s;
    case "back":
      return { ...s, phase: "play" };
    case "predict": {
      if (s.phase !== "predict") return s;
      const result = endSol(balance, g, today(g), tomorrow(g), runInfo(s.flare));
      return { ...s, phase: "night", result, predicted: a.choice, game: result.night };
    }
    case "showReport":
      return s.phase === "night" ? { ...s, phase: "report" } : s;
    case "reportNext":
      if (!s.result) return s;
      return { ...s, phase: s.result.report.paused ? "pause" : "debrief" };
    case "debriefNext": {
      if (!s.result) return s;
      const day = today(g);
      const notebook = [...new Set([...g.notebook, ...factsForDay(day, s.flare).map((f) => f.id)])];
      const predictions = [
        ...g.predictions,
        { sol: g.sol, dayId: day.id, choice: s.predicted ?? "", right: s.predicted === day.predict.answer },
      ];
      if (!s.result.next) {
        return { ...s, phase: "complete", result: null, game: { ...g, notebook, predictions } };
      }
      const n = s.result.next;
      const next: GameState = {
        ...n,
        notebook,
        predictions,
        morning: n.morning ? { ...n.morning, notebook, predictions } : null,
      };
      return {
        ...s,
        phase: "briefing",
        result: null,
        predicted: null,
        game: next,
        mornings: next.morning ? { ...s.mornings, [next.sol]: next.morning } : s.mornings,
      };
    }
    case "retry":
      return { ...s, phase: "play", result: null, predicted: null, game: retrySol(g) };
    case "backSol": {
      const prev = s.mornings[g.sol - 1];
      if (!prev) return s;
      const mornings = Object.fromEntries(Object.entries(s.mornings).filter(([k]) => Number(k) < g.sol));
      const game: GameState = { ...structuredClone(prev), morning: prev };
      return { ...s, phase: "briefing", result: null, predicted: null, game, mornings };
    }
    case "new":
      clearSession();
      return freshSession();
  }
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
    case "fixed":
      return r.fixed;
    case "notHere":
      return fmt(r.notHere, { room: text.rooms[room].name });
  }
}

const ROOM_ICON: Record<RoomId, IconName> = { power: "power", air: "air", greenhouse: "food", shelter: "shield" };

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type Earth = { sol: number; until: number } | { sol: number; answer: string } | null;

// ---------------------------------------------------------------------------

export default function BaseScreen() {
  const [session, dispatch] = useReducer(reducer, undefined, init);
  const state = session.game;
  const day = today(state);

  const [walking, setWalking] = useState<{ ms: number; to: RoomId } | null>(null);
  const [facing, setFacing] = useState<1 | -1>(-1);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [earth, setEarth] = useState<Earth>(null);
  const [now, setNow] = useState(() => Date.now());
  const [coach, setCoach] = useState<number | null>(() => (state.sol === 1 && !coachDone() ? 0 : null));
  const walkTimer = useRef<number | undefined>(undefined);

  const solarToday = solarPower(balance, state.dust);
  const flare = flareTonight(state, runInfo(session.flare));
  const needs = tonightNeeds(balance, state);
  const short = (Object.entries(needs) as [ResourceId, number][]).filter(([s, n]) => state[s] < n);

  useEffect(() => saveSession(session), [session]);
  useEffect(() => () => window.clearTimeout(walkTimer.current), []);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [msg]);

  // The night plays out, then the Day Report opens.
  useEffect(() => {
    if (session.phase !== "night") return;
    const id = window.setTimeout(() => dispatch({ type: "showReport" }), reducedMotion() ? 900 : 3200);
    return () => window.clearTimeout(id);
  }, [session.phase]);

  // Earth's answer is on its way.
  const waiting = earth && "until" in earth && earth.sol === state.sol;
  useEffect(() => {
    if (!earth || !("until" in earth)) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= earth.until) setEarth({ sol: earth.sol, answer: dayById(state.dayOrder[earth.sol - 1]).hint });
    }, 250);
    return () => window.clearInterval(id);
  }, [earth, state.dayOrder]);

  const say = (t: string, kind: Msg["kind"] = "info") => setMsg({ text: t, kind, key: (msg?.key ?? 0) + 1 });
  const explain = (stat: StatName) =>
    say(`${text.stats[stat].name}: ${fmt(text.stats[stat].explain, { n: balance.day.timePoints })}`);

  const coachStep = session.phase === "play" && coach !== null ? COACH_STEPS[coach] : null;
  const advanceCoach = (from: (typeof COACH_STEPS)[number]) => {
    if (coachStep !== from || coach === null) return;
    if (coach + 1 >= COACH_STEPS.length) {
      setCoach(null);
      setCoachDone();
    } else setCoach(coach + 1);
  };
  const skipCoach = () => {
    setCoach(null);
    setCoachDone();
  };

  function onRoomTap(to: RoomId) {
    if (session.phase !== "play") return;
    if (walking) return say(text.reasons.walking, "warn");
    if (to === state.room) return;
    const check = walkCheck(balance, state, to);
    if (!check.ok) return say(reasonText(check, to), "warn");
    const dx = KID_X[to] - KID_X[state.room];
    const ms = reducedMotion() ? 150 : Math.max(450, Math.round(Math.abs(dx) / 0.7));
    setFacing(dx > 0 ? 1 : -1);
    setWalking({ ms, to });
    dispatch({ type: "walk", to });
    advanceCoach("rooms");
    window.clearTimeout(walkTimer.current);
    walkTimer.current = window.setTimeout(() => setWalking(null), ms);
  }

  function onAction(id: string) {
    if (walking) return say(text.reasons.walking, "warn");
    const check = actionCheck(balance, state, id);
    if (!check.ok) return say(reasonText(check, state.room), "warn");
    dispatch({ type: "act", id });
    advanceCoach("panel");
  }

  function onAskEarth() {
    const check = askEarthCheck(balance, state);
    if (!check.ok) return say(check.reason === "limit" ? text.askEarth.used : reasonText(check, state.room), "warn");
    dispatch({ type: "askEarth" });
    const t = Date.now();
    setNow(t);
    setEarth({ sol: state.sol, until: t + balance.askEarth.waitSeconds * 1000 });
  }

  function onEndSol() {
    if (walking) return say(text.reasons.walking, "warn");
    advanceCoach("endsol");
    dispatch({ type: "endSol" });
  }

  function onNewGame() {
    if (window.confirm(text.confirmNewGame)) {
      setWalking(null);
      setEarth(null);
      dispatch({ type: "new" });
    }
  }

  const lightsOn = (state.usedToday.growLights ?? 0) > 0;
  const canWalk = state.timeLeft >= balance.walk.time;
  const night = session.phase === "night" || session.phase === "report" || session.phase === "pause";
  const flareLine = session.result?.report.night.find((l) => l.kind === "flare");
  const flareFx = night && flareLine && flareLine.kind === "flare" ? (flareLine.through > 0 ? "hit" : "blocked") : null;
  const earthAnswer = earth && "answer" in earth && earth.sol === state.sol ? earth.answer : null;
  const askCheck = askEarthCheck(balance, state);

  return (
    <div className={`base phase-${session.phase}`}>
      <header className="base__hud">
        <TodoCard
          sol={state.sol}
          total={state.dayOrder.length}
          todo={day.todo}
          icon={day.icon as IconName}
          done={goalMet(day, state) || !!session.result?.report.goalDone}
          onExplainSol={() => say(text.hud.solExplain)}
        >
          {flare && (
            <p className="todo__flare">
              <Icon name="flare" size={20} />
              <span className="todo__flare-long">
                {fmt(text.hud.flare, { cls: flare.cls, word: flare.word })}.{" "}
                {fmt(text.hud.flarePoints, { n: flare.strength })}
              </span>
              <span className="todo__flare-short">{fmt(text.hud.flareShort, { cls: flare.cls, n: flare.strength })}</span>
              <span className={`tag ${session.flare.source === "example" ? "tag--example" : "tag--real"}`}>
                {session.flare.source === "example" ? text.labels.example : text.labels.real}
              </span>
            </p>
          )}
        </TodoCard>
        <div className="base__bars" data-coach="bars">
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
            <ShieldMeter
              level={state.shield}
              max={balance.shield.max}
              dose={state.dose}
              doseMax={balance.radiation.maxDose}
              onExplain={() => explain("shield")}
            />
          )}
          <div className="base__tools">
            <button type="button" className="tag tag--game" onClick={() => say(text.hud.gameSizedExplain)}>
              {text.hud.gameSized}
            </button>
            <span className="tag tag--book">{fmt(text.hud.notebook, { n: state.notebook.length })}</span>
            <button type="button" className="base__menu" onClick={onNewGame}>
              {text.hud.menu}
            </button>
          </div>
        </div>
      </header>

      <main className="base__stage" data-coach="rooms">
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
          night={night}
          flare={flareFx}
          onRoomTap={onRoomTap}
        />
        {session.phase === "night" && (
          <p className="nightnote" role="status">
            <Icon name="night" size={26} /> {text.night.title}{" "}
            {flareFx && (flareFx === "hit" ? text.night.flareHit : text.night.flareBlocked)}
          </p>
        )}
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

      <footer className="base__panel" aria-live="polite" data-coach="panel">
        {msg && (
          <p key={msg.key} className={`toast toast--${msg.kind}`} role={msg.kind === "warn" ? "alert" : "status"}>
            {msg.text}
          </p>
        )}
        {earthAnswer && (
          <EarthAnswer hint={earthAnswer} seconds={balance.askEarth.waitSeconds} onClose={() => setEarth(null)} />
        )}
        <RoomPanel state={state} walkingTo={walking?.to ?? null} onAction={onAction} />
      </footer>

      <div className="base__endbar">
        <button
          type="button"
          className={`askearth${waiting ? " is-waiting" : ""}${askCheck.ok ? "" : " is-off"}`}
          aria-disabled={!askCheck.ok || !!waiting}
          onClick={() => (waiting ? undefined : onAskEarth())}
        >
          <Icon name="message" size={26} />
          <span className="askearth__words">
            <b>{text.askEarth.button}</b>
            {waiting && earth && "until" in earth ? (
              <span className="askearth__wave">
                {fmt(text.askEarth.sending, { s: Math.max(0, Math.ceil((earth.until - now) / 1000)) })}
              </span>
            ) : (
              <span>
                {state.askedEarth >= balance.askEarth.perDay
                  ? text.askEarth.used
                  : fmt(text.askEarth.left, { n: balance.askEarth.perDay - state.askedEarth })}
              </span>
            )}
          </span>
          {!waiting && state.askedEarth < balance.askEarth.perDay && <DeltaChips change={negate(balance.askEarth.cost)} />}
        </button>

        <div className={`tonight${short.length ? " is-short" : ""}`}>
          <span className="tonight__label">
            <Icon name="night" size={22} /> {text.endbar.tonight}
          </span>
          <DeltaChips change={negate(needs)} />
          {short.map(([s]) => (
            <span key={s} className="tonight__warn" role="alert">
              ⚠ {fmt(text.endbar.notEnough, { stat: text.stats[s].name })}
            </span>
          ))}
          {flare && (
            <span className={`tonight__flare${state.shield >= flare.strength ? " is-ok" : ""}`}>
              <Icon name="flare" size={20} /> {fmt(text.endbar.flareWarn, { n: flare.strength, s: state.shield })}
            </span>
          )}
        </div>

        <button type="button" className="endsol" onClick={onEndSol} data-coach="endsol">
          <Icon name="night" size={26} />
          {fmt(text.endbar.endSol, { n: state.sol })}
        </button>
      </div>

      {coachStep && <Coach step={coachStep} onNext={() => advanceCoach(coachStep)} onSkip={skipCoach} />}

      <PhaseCards session={session} day={day} dispatch={dispatch} />
    </div>
  );
}

function negate(a: Amounts): Amounts {
  const out: Amounts = {};
  for (const [k, v] of Object.entries(a) as [StatId, number][]) out[k] = -v;
  return out;
}

function PhaseCards({
  session,
  day,
  dispatch,
}: {
  session: Session;
  day: DayDef;
  dispatch: (a: Act) => void;
}) {
  const g = session.game;
  switch (session.phase) {
    case "briefing":
      return <BriefingCard sol={g.sol} day={day} onGo={() => dispatch({ type: "startPlay" })} />;
    case "predict":
      return (
        <PredictCard
          day={day}
          onPick={(choice) => dispatch({ type: "predict", choice })}
          onBack={() => dispatch({ type: "back" })}
        />
      );
    case "report":
      return session.result ? <ReportCard report={session.result.report} onNext={() => dispatch({ type: "reportNext" })} /> : null;
    case "debrief": {
      if (!session.result) return null;
      const count = new Set([...g.notebook, ...factsForDay(day, session.flare).map((f) => f.id)]).size;
      return (
        <DebriefCard
          day={day}
          report={session.result.report}
          predicted={session.predicted}
          notebookCount={count}
          flare={session.flare}
          nextSol={session.result.next ? g.sol + 1 : null}
          onNext={() => dispatch({ type: "debriefNext" })}
        />
      );
    }
    case "pause": {
      if (!session.result?.report.paused) return null;
      const morning = g.morning ? { ...structuredClone(g.morning), morning: g.morning } : g;
      const savable = canSurviveSol(balance, morning, day, tomorrow(g), runInfo(session.flare));
      return (
        <PauseCard
          stat={session.result.report.paused}
          sol={g.sol}
          stuck={!savable && !!session.mornings[g.sol - 1]}
          onRetry={() => dispatch({ type: "retry" })}
          onBack={() => dispatch({ type: "backSol" })}
        />
      );
    }
    case "complete":
      return (
        <CompleteCard
          sols={g.dayOrder.length}
          stars={g.science}
          cards={g.notebook.length}
          onAgain={() => dispatch({ type: "new" })}
        />
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

/** What the chips show. Cleaning shows its real payoff: more power tomorrow. */
function shownDeal(state: GameState, id: string): { cost: Amounts; gain: Amounts; later: { inDays: number; gain: Amounts }[] } {
  const a = actionDeal(balance, state, id);
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
  const ids = actionsInRoom(balance, state, state.room);
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
            const deal = shownDeal(state, id);
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
                  {!check.ok ? <span className="action__why">{reasonText(check, state.room)}</span> : <span />}
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
