// Mission ARES — the base screen and the sol loop.
//
//   briefing → PLAN (untimed, Time Points) → predict → ALERT banner → Ready
//   → countdown (no Time Points; fixes cost seconds + supplies) → night
//   → Day Report → debrief → next sol         (Mission Pause → retry)
//
//   top:    to-do · 3 resource bars · time points · shield meter (flare days)
//   middle: the base from above; walk with keys / WASD / tap / joystick
//   bottom: room actions with exact costs · Ask Earth · tonight · Ready
//
// Dev only: ?sol=3 starts a fresh game on sol 3.

import { useEffect, useReducer, useRef, useState } from "react";
import {
  EXAMPLE_FLARE,
  ROOMS,
  alertFor,
  alerts,
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
  alertAllFixed,
  alertDoTask,
  alertTaskCheck,
  askEarth,
  askEarthCheck,
  beginAlert,
  canSurviveSol,
  doAction,
  endSol,
  flareTonight,
  goalMet,
  isLow,
  newGame,
  resolveAlert,
  retrySol,
  solarPower,
  tonightNeeds,
  walk,
} from "../game/engine";
import {
  clearSession,
  coachDone,
  loadSession,
  loadSettings,
  saveSession,
  saveSettings,
  setCoachDone,
} from "../game/save";
import type { Session, Settings, TimerMode } from "../game/save";
import type { AlertDef, Amounts, Check, DayDef, GameState, ResourceId, RoomId, Snapshot, StatId } from "../game/types";
import {
  AlertIntroCard,
  BriefingCard,
  CompleteCard,
  DebriefCard,
  EarthAnswer,
  FlareTag,
  PauseCard,
  PredictCard,
  ReportCard,
  SettingsCard,
} from "./Cards";
import Coach from "./Coach";
import { CostChips, DeltaChips, ResourceBar, ShieldMeter, TimePoints, TodoCard } from "./Hud";
import { Icon } from "./Icons";
import type { IconName } from "./Icons";
import { COACH_STEPS } from "./layout";
import MapScene from "./MapScene";
import type { ThreatBadge } from "./MapScene";
import { nasaNow, pickFlare, subscribeNasa } from "../game/nasa";
import "./BaseScreen.css";
import "./Cards.css";
import "./MapScene.css";

type Msg = { text: string; kind: "info" | "warn"; key: number };

type Act =
  | { type: "enter"; room: RoomId }
  | { type: "act"; id: string; free: boolean }
  | { type: "askEarth" }
  | { type: "startPlay" }
  | { type: "endPlan" }
  | { type: "back" }
  | { type: "predict"; choice: string }
  | { type: "alertGo" }
  | { type: "alertTask"; id: string }
  | { type: "alertEnd" }
  | { type: "retryAlert" }
  | { type: "showReport" }
  | { type: "reportNext" }
  | { type: "debriefNext" }
  | { type: "retry" }
  | { type: "backSol" }
  | { type: "liveFlare"; flare: Session["flare"] }
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
    v: 3,
    game,
    phase: "briefing",
    result: null,
    predicted: null,
    flare: pickFlare(nasaNow(), Math.floor(Math.random() * 1e9)) ?? EXAMPLE_FLARE,
    mornings: game.morning ? { [sol]: game.morning } : {},
    alertStart: null,
    alertLines: null,
  };
}

function init(): Session {
  const devSol = import.meta.env.DEV && new URLSearchParams(window.location.search).has("sol");
  const saved = devSol ? null : loadSession();
  if (!saved) return freshSession();
  // Reloaded mid-alert or mid-night: replay the alert banner / skip to the report.
  if (saved.phase === "alert" && saved.alertStart) {
    return { ...saved, phase: "alertIntro", game: restore(saved.alertStart, saved.game.morning) };
  }
  if (saved.phase === "night") return { ...saved, phase: "report" };
  return saved;
}

const today = (g: GameState) => dayById(g.dayOrder[g.sol - 1]);
const tomorrow = (g: GameState) => (g.sol < g.dayOrder.length ? dayById(g.dayOrder[g.sol]) : null);
const restore = (snap: Snapshot, morning: Snapshot | null): GameState => ({ ...structuredClone(snap), morning });

function finishSol(s: Session, g: GameState, alertLines: Session["alertLines"]): Session {
  const result = endSol(balance, g, today(g), tomorrow(g), runInfo(s.flare), alertLines ?? []);
  return { ...s, phase: "night", result, alertLines, game: result.night };
}

function reducer(s: Session, a: Act): Session {
  const g = s.game;
  const def = alertFor(today(g).id);
  switch (a.type) {
    case "enter":
      return s.phase === "play" || s.phase === "alert" ? { ...s, game: walk(balance, g, a.room) } : s;
    case "act":
      return s.phase === "play" || s.phase === "alert" ? { ...s, game: doAction(balance, g, a.id, a.free) } : s;
    case "askEarth":
      return s.phase === "play" || s.phase === "alert" ? { ...s, game: askEarth(balance, g) } : s;
    case "startPlay":
      return { ...s, phase: "play" };
    case "endPlan":
      return s.phase === "play" ? { ...s, phase: "predict" } : s;
    case "back":
      return { ...s, phase: "play" };
    case "predict": {
      if (s.phase !== "predict") return s;
      if (!def) return finishSol({ ...s, predicted: a.choice }, g, null);
      const started = beginAlert(g, def, runInfo(s.flare));
      const { morning: _m, ...snap } = started;
      return { ...s, phase: "alertIntro", predicted: a.choice, game: started, alertStart: structuredClone(snap) };
    }
    case "alertGo":
      return s.phase === "alertIntro" ? { ...s, phase: "alert" } : s;
    case "alertTask":
      return s.phase === "alert" && def ? { ...s, game: alertDoTask(balance, g, def, a.id) } : s;
    case "alertEnd": {
      if (s.phase !== "alert" || !def) return s;
      const r = resolveAlert(balance, g, def);
      return finishSol(s, r.state, r.lines);
    }
    case "retryAlert":
      if (!s.alertStart) return s;
      return { ...s, phase: "alertIntro", result: null, alertLines: null, game: restore(s.alertStart, g.morning) };
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
        alertStart: null,
        alertLines: null,
        game: next,
        mornings: next.morning ? { ...s.mornings, [next.sol]: next.morning } : s.mornings,
      };
    }
    case "retry":
      return { ...s, phase: "play", result: null, predicted: null, alertStart: null, alertLines: null, game: retrySol(g) };
    case "backSol": {
      const prev = s.mornings[g.sol - 1];
      if (!prev) return s;
      const mornings = Object.fromEntries(Object.entries(s.mornings).filter(([k]) => Number(k) < g.sol));
      return {
        ...s,
        phase: "briefing",
        result: null,
        predicted: null,
        alertStart: null,
        alertLines: null,
        game: restore(prev, prev),
        mornings,
      };
    }
    case "liveFlare": {
      // Only before the game has really started (first briefing, nothing done yet).
      const fresh = s.phase === "briefing" && Object.keys(s.mornings).length === 1 && g.log.length === 0 && g.predictions.length === 0;
      return fresh && s.flare.source !== "live" ? { ...s, flare: a.flare } : s;
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
const TIMER_MULT: Record<TimerMode, number | null> = { normal: 1, double: 2, off: null };

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const isTouch = () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

type Earth = { sol: number; until: number } | { sol: number; answer: string } | null;
type Work = { kind: "threat" | "action"; id: string; room: RoomId; left: number; total: number };
/** The alert clock, in ms. left = null means Calm mode with no timer. */
type Clock = { left: number | null; total: number | null; work: Work | null; ending: boolean };

// ---------------------------------------------------------------------------

export default function BaseScreen() {
  const [session, dispatch] = useReducer(reducer, undefined, init);
  const state = session.game;
  const day = today(state);
  const alertDef = alertFor(day.id);
  const phase = session.phase;

  const [inside, setInside] = useState<RoomId | null>(state.room);
  const [goTo, setGoTo] = useState<{ room: RoomId; n: number } | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [earth, setEarth] = useState<Earth>(null);
  const [now, setNow] = useState(() => Date.now());
  const [coach, setCoach] = useState<number | null>(() => (state.sol === 1 && !coachDone() ? 0 : null));
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clock, setClock] = useState<Clock | null>(null);
  const [hidden, setHidden] = useState(false);

  const solarToday = solarPower(balance, state.dust);
  const flare = flareTonight(state, runInfo(session.flare));
  const needs = tonightNeeds(balance, state);
  const short = (Object.entries(needs) as [ResourceId, number][]).filter(([s, n]) => state[s] < n);
  const inAlert = phase === "alert";

  useEffect(() => saveSession(session), [session]);

  // Live NASA data arrived: a game that has not started yet gets a live flare.
  useEffect(() => {
    const onData = () => {
      const f = pickFlare(nasaNow(), Math.floor(Math.random() * 1e9));
      if (f && f.source === "live") dispatch({ type: "liveFlare", flare: f });
    };
    onData();
    return subscribeNasa(onData);
  }, []);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [msg]);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // The night plays out, then the Day Report opens.
  useEffect(() => {
    if (phase !== "night") return;
    const id = window.setTimeout(() => dispatch({ type: "showReport" }), reducedMotion() ? 900 : 3200);
    return () => window.clearTimeout(id);
  }, [phase]);

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

  const earthAnswer = earth && "answer" in earth && earth.sol === state.sol ? earth.answer : null;
  const coachStep = phase === "play" && coach !== null ? COACH_STEPS[coach] : null;

  // ---------------------------------------------------------------- alert clock
  // Paused while any popup, hint or Earth's reply is open (or the tab is hidden).
  const paused = inAlert && (msg?.kind === "info" || !!earthAnswer || settingsOpen || hidden);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Start the clock when the alert starts.
  useEffect(() => {
    if (phase !== "alert" || !alertDef) {
      setClock(null);
      return;
    }
    const mult = TIMER_MULT[loadSettings().timer];
    const total = mult === null ? null : alertDef.duration * mult * 1000;
    setClock({ left: total, total, work: null, ending: false });
  }, [phase, alertDef]);

  // Tick (skipped while paused).
  const running = !!clock && !clock.ending;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const t = performance.now();
      const dt = t - last;
      last = t;
      if (pausedRef.current) return;
      setClock((c) => {
        if (!c || c.ending) return c;
        const work = c.work ? { ...c.work, left: c.work.left - dt } : null;
        return { ...c, left: c.left === null ? null : c.left - dt, work };
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [running]);

  // Work finished, time up, or everything fixed.
  useEffect(() => {
    if (!clock || clock.ending || !alertDef) return;
    if (clock.work && clock.work.left <= 0) {
      const w = clock.work;
      setClock({ ...clock, work: null });
      if (w.kind === "threat") dispatch({ type: "alertTask", id: w.id });
      else dispatch({ type: "act", id: w.id, free: true });
      return;
    }
    if (clock.left !== null && clock.left <= 0) {
      setClock({ ...clock, left: 0, work: null, ending: true });
      setMsg({ text: text.alert.timeUp, kind: "warn", key: Date.now() });
      window.setTimeout(() => dispatch({ type: "alertEnd" }), 900);
    }
  }, [clock, alertDef]);

  useEffect(() => {
    if (!inAlert || !alertDef || !running) return;
    if (alertAllFixed(state, alertDef)) {
      setClock((c) => (c ? { ...c, work: null, ending: true } : c));
      setMsg({ text: text.alert.allFixed, kind: "warn", key: Date.now() });
      window.setTimeout(() => dispatch({ type: "alertEnd" }), 1400);
    }
  }, [state, inAlert, alertDef, running]);

  // ---------------------------------------------------------------- actions
  const say = (t: string, kind: Msg["kind"] = "info") => setMsg({ text: t, kind, key: Date.now() });
  const explain = (stat: StatName) =>
    say(`${text.stats[stat].name}: ${fmt(text.stats[stat].explain, { n: balance.day.timePoints })}`);

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

  const canMove = (phase === "play" || (inAlert && !paused && !clock?.ending)) && !settingsOpen;

  function onRoomTap(room: RoomId) {
    if (!canMove) return;
    setGoTo({ room, n: Date.now() });
  }

  function onRoomChange(room: RoomId | null) {
    setInside(room);
    if (room) {
      dispatch({ type: "enter", room });
      advanceCoach("rooms");
    }
    setClock((c) => {
      if (c?.work && c.work.room !== room) {
        setMsg({ text: text.alert.stopped, kind: "warn", key: Date.now() });
        return { ...c, work: null };
      }
      return c;
    });
  }

  function onAction(id: string) {
    if (inAlert) {
      if (!clock || clock.ending) return;
      if (clock.work) return say(text.alert.busy, "warn");
      const check = actionCheck(balance, state, id, true);
      if (!check.ok) return say(reasonText(check, state.room), "warn");
      const ms = alerts.actionWorkSeconds * 1000;
      setClock({ ...clock, work: { kind: "action", id, room: state.room, left: ms, total: ms } });
      return;
    }
    const check = actionCheck(balance, state, id);
    if (!check.ok) return say(reasonText(check, state.room), "warn");
    dispatch({ type: "act", id, free: false });
    advanceCoach("panel");
  }

  function onAlertTask(id: string) {
    if (!alertDef || !clock || clock.ending) return;
    if (clock.work) return say(text.alert.busy, "warn");
    const check = alertTaskCheck(state, alertDef, id);
    if (!check.ok) return say(reasonText(check, state.room), "warn");
    const t = alertDef.threats.find((x) => x.id === id)!;
    const ms = t.work * 1000;
    setClock({ ...clock, work: { kind: "threat", id, room: t.room, left: ms, total: ms } });
  }

  function onAskEarth() {
    const check = askEarthCheck(balance, state);
    if (!check.ok) return say(check.reason === "limit" ? text.askEarth.used : reasonText(check, state.room), "warn");
    dispatch({ type: "askEarth" });
    const t = Date.now();
    setNow(t);
    setEarth({ sol: state.sol, until: t + balance.askEarth.waitSeconds * 1000 });
  }

  function onEndPlan() {
    advanceCoach("endsol");
    dispatch({ type: "endPlan" });
  }

  function onTimer(t: TimerMode) {
    const next = { ...settings, timer: t };
    setSettings(next);
    saveSettings(next);
    // Change the running alert too, keeping the share of time already used.
    if (clock && alertDef && !clock.ending) {
      const mult = TIMER_MULT[t];
      const total = mult === null ? null : alertDef.duration * mult * 1000;
      const used = clock.total && clock.left !== null ? 1 - clock.left / clock.total : 0;
      setClock({ ...clock, total, left: total === null ? null : total * (1 - used) });
    }
  }

  function onNewGame() {
    if (window.confirm(text.confirmNewGame)) {
      setEarth(null);
      dispatch({ type: "new" });
    }
  }

  const lightsOn = (state.usedToday.growLights ?? 0) > 0;
  const night = phase === "night" || phase === "report" || phase === "pause";
  const flareLine = session.result?.report.night.find((l) => l.kind === "flare");
  const flareFx = night && flareLine && flareLine.kind === "flare" ? (flareLine.through > 0 ? "hit" : "blocked") : null;
  const askCheck = askEarthCheck(balance, state);

  const threats: ThreatBadge[] =
    alertDef && state.alert && (inAlert || phase === "alertIntro")
      ? alertDef.threats.map((t) => ({ id: t.id, room: t.room, status: threatStatus(state, t) }))
      : [];
  const working = clock?.work ? { room: clock.work.room, progress: 1 - Math.max(0, clock.work.left) / clock.work.total } : null;

  // The kid goes back to their room on a new sol, a retry, or a reload.
  const resetKey = `${state.sol}-${phase === "briefing" || phase === "alertIntro" ? phase : "x"}`;

  return (
    <div className={`base phase-${phase}`}>
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
              <DataTag flare={session.flare} />
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
          {inAlert ? (
            <span className="alerttag" role="status">
              <Icon name="flare" size={22} /> {text.alert.hud}
            </span>
          ) : (
            <TimePoints left={state.timeLeft} max={balance.day.timePoints} onExplain={() => explain("time")} />
          )}
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
            <button type="button" className="base__menu" onClick={() => setSettingsOpen(true)} aria-label={text.settings.button}>
              <span className="long">{text.settings.button}</span>
              <span className="short" aria-hidden="true">⚙</span>
            </button>
            <button type="button" className="base__menu" onClick={onNewGame} aria-label={text.hud.menu}>
              <span className="long">{text.hud.menu}</span>
              <span className="short" aria-hidden="true">↺</span>
            </button>
          </div>
        </div>
      </header>

      <main
        className={`base__stage${flare && !night ? " is-flare" : ""}${inAlert ? " is-alert" : ""}`}
        data-coach="rooms"
        style={{ ["--dust" as string]: String(state.dust / balance.dust.max) }}
      >
        <MapScene
          power={state.power}
          powerMax={balance.resources.power.max}
          air={state.air}
          airMax={balance.resources.air.max}
          food={state.food}
          foodMax={balance.resources.food.max}
          shield={state.shield}
          shieldMax={balance.shield.max}
          solarToday={solarToday}
          lightsOn={lightsOn}
          homeRoom={state.room}
          resetKey={resetKey}
          canMove={canMove}
          goTo={goTo}
          night={night}
          flareFx={flareFx}
          threats={threats}
          working={working}
          onRoomTap={onRoomTap}
          onRoomChange={onRoomChange}
        />
        <div className="weather" aria-hidden="true" />
        <div className="weather__labels">
          {state.dust > 0 && (
            <span className="wchip wchip--dust">
              <Icon name="dust" size={18} /> {fmt(text.weather.dust, { n: state.dust, max: balance.dust.max })}
              <span className="tag tag--game-s">{text.labels.game}</span>
            </span>
          )}
          {flare && !night && (
            <span className="wchip wchip--flare">
              <Icon name="flare" size={18} /> ⚠ {fmt(text.weather.flare, { cls: flare.cls })}
              <DataTag flare={session.flare} />
            </span>
          )}
        </div>
        {inAlert && clock && alertDef && <Countdown clock={clock} paused={paused} def={alertDef} onResume={() => setMsg(null)} />}
        {phase === "night" && (
          <p className="nightnote" role="status">
            <Icon name="night" size={26} /> {text.night.title}{" "}
            {flareFx && (flareFx === "hit" ? text.night.flareHit : text.night.flareBlocked)}
          </p>
        )}
      </main>

      <nav className="base__roombar" aria-label="Rooms">
        {ROOMS.map((r) => (
          <button
            key={r}
            type="button"
            className={`roomtab${r === inside ? " is-here" : ""}`}
            onClick={() => onRoomTap(r)}
            aria-label={r === inside ? `${text.rooms[r].name}. ${text.panel.youAreHere}.` : `${text.rooms[r].name}. Walk there.`}
          >
            <Icon name={ROOM_ICON[r]} size={26} />
            <span className="roomtab__name">{text.rooms[r].name}</span>
          </button>
        ))}
      </nav>

      <footer className="base__panel" aria-live="polite" data-coach="panel">
        {msg && (
          <button
            type="button"
            key={msg.key}
            className={`toast toast--${msg.kind}`}
            role={msg.kind === "warn" ? "alert" : "status"}
            onClick={() => setMsg(null)}
          >
            {msg.text}
            {inAlert && msg.kind === "info" && <span className="toast__go">{text.alert.tapToGo}</span>}
          </button>
        )}
        {earthAnswer && (
          <EarthAnswer hint={earthAnswer} seconds={balance.askEarth.waitSeconds} onClose={() => setEarth(null)} />
        )}
        {inAlert && alertDef && <AlertJobs def={alertDef} state={state} inside={inside} />}
        <RoomPanel
          state={state}
          inside={inside}
          alert={inAlert ? alertDef : null}
          work={clock?.work ?? null}
          onAction={onAction}
          onAlertTask={onAlertTask}
        />
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
              <span className="askearth__left">
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

        {inAlert ? (
          <button type="button" className="endsol endsol--alert" onClick={() => dispatch({ type: "alertEnd" })}>
            <Icon name="check" size={24} />
            {text.alert.finish}
          </button>
        ) : (
          <button type="button" className="endsol" onClick={onEndPlan} data-coach="endsol">
            <Icon name={alertDef ? "flare" : "night"} size={26} />
            {alertDef ? text.endbar.toAlert : fmt(text.endbar.endSol, { n: state.sol })}
          </button>
        )}
      </div>

      {coachStep && <Coach step={coachStep} onNext={() => advanceCoach(coachStep)} onSkip={skipCoach} />}

      <PhaseCards session={session} day={day} alertDef={alertDef} timer={settings.timer} dispatch={dispatch} />
      {settingsOpen && <SettingsCard timer={settings.timer} onTimer={onTimer} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function threatStatus(state: GameState, t: AlertDef["threats"][number]): ThreatBadge["status"] {
  if (t.decoy) return "decoy";
  if (state.alert?.prepared.includes(t.id)) return "prepared";
  if (state.alert?.handled.includes(t.id)) return "done";
  return "open";
}

function DataTag({ flare }: { flare: Session["flare"] }) {
  return <FlareTag flare={flare} />;
}

function negate(a: Amounts): Amounts {
  const out: Amounts = {};
  for (const [k, v] of Object.entries(a) as [StatId, number][]) out[k] = -v;
  return out;
}

// ---------------------------------------------------------------------------
// The countdown: big bar + number, readable without color.

function Countdown({ clock, paused, def, onResume }: { clock: Clock; paused: boolean; def: AlertDef; onResume: () => void }) {
  const a = text.alert;
  if (clock.left === null) {
    return (
      <div className="countdown countdown--calm" role="timer">
        <Icon name="time" size={28} />
        <span className="countdown__title">{def.title}</span>
        <span className="countdown__calm">{a.noTimer}</span>
      </div>
    );
  }
  const secs = Math.max(0, Math.ceil(clock.left / 1000));
  const share = clock.total ? Math.max(0, clock.left) / clock.total : 0;
  const low = secs <= 10;
  return (
    <div
      className={`countdown${low ? " is-low" : ""}${paused ? " is-paused" : ""}`}
      role="timer"
      aria-live="off"
      aria-label={`${def.title}: ${secs} seconds left${paused ? `, ${a.paused}` : ""}`}
      onClick={paused ? onResume : undefined}
    >
      <span className="countdown__num">
        {low ? "⚠" : ""}
        {secs}
        <small>s</small>
      </span>
      <span className="countdown__body">
        <span className="countdown__title">
          {def.title}
          {paused && <b className="countdown__paused">⏸ {a.paused}</b>}
        </span>
        <span className="countdown__track" aria-hidden="true">
          <span className="countdown__fill" style={{ width: `${share * 100}%` }} />
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="countdown__tick" style={{ left: `${(i + 1) * 10}%` }} />
          ))}
        </span>
      </span>
    </div>
  );
}

function AlertJobs({ def, state, inside }: { def: AlertDef; state: GameState; inside: RoomId | null }) {
  const a = text.alert;
  return (
    <section className="jobs" aria-label={a.jobs}>
      <h3 className="jobs__title">{a.jobs}</h3>
      <ul className="jobs__list">
        {def.threats.map((t) => {
          const status = threatStatus(state, t);
          return (
            <li key={t.id} className={`job job--${status}${t.room === inside ? " is-here" : ""}`}>
              <span className="job__mark" aria-hidden="true">
                {status === "open" ? "!" : status === "decoy" ? "?" : "✓"}
              </span>
              <Icon name={ROOM_ICON[t.room]} size={20} />
              <span className="job__task">{t.task}</span>
              <span className="job__status">{a.status[status]}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PhaseCards({
  session,
  day,
  alertDef,
  timer,
  dispatch,
}: {
  session: Session;
  day: DayDef;
  alertDef: AlertDef | null;
  timer: TimerMode;
  dispatch: (a: Act) => void;
}) {
  const g = session.game;
  const missed = !!session.alertLines?.some((l) => l.kind === "alert" && l.outcome === "missed");
  const retryAlert = missed && session.alertStart ? () => dispatch({ type: "retryAlert" }) : undefined;
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
    case "alertIntro": {
      if (!alertDef) return null;
      const mult = TIMER_MULT[timer];
      return (
        <AlertIntroCard
          def={alertDef}
          seconds={mult === null ? null : alertDef.duration * mult}
          prepared={g.alert?.prepared ?? []}
          onReady={() => dispatch({ type: "alertGo" })}
        />
      );
    }
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
          onRetryAlert={retryAlert}
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
          onRetryAlert={session.alertStart ? () => dispatch({ type: "retryAlert" }) : undefined}
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
function shownDeal(state: GameState, id: string, free: boolean) {
  const a = actionDeal(balance, state, id);
  const gain = { ...a.gain };
  const later = [...(a.later ?? [])];
  if ((gain.dust ?? 0) < 0) {
    later.push({ inDays: 1, gain: { power: -gain.dust! * balance.day.dustPowerLossPerLevel } });
    delete gain.dust;
  }
  const cost = { ...a.cost };
  if (free) delete cost.time;
  return { cost, gain, later };
}

type ActionName = keyof typeof text.actions;

function Secs({ n }: { n: number }) {
  return (
    <span className="chip chip--secs">
      <Icon name="time" size={18} />
      <b>{fmt(text.alert.takes, { n })}</b>
    </span>
  );
}

function RoomPanel({
  state,
  inside,
  alert,
  work,
  onAction,
  onAlertTask,
}: {
  state: GameState;
  inside: RoomId | null;
  alert: AlertDef | null;
  work: Work | null;
  onAction: (id: string) => void;
  onAlertTask: (id: string) => void;
}) {
  if (!inside) {
    return (
      <section className="panel">
        <h2 className="panel__title">
          <Icon name="walk" size={28} />
          {text.map.hub}
        </h2>
        <p className="panel__hint">{isTouch() ? text.map.hintTouch : text.map.hint}</p>
      </section>
    );
  }
  const free = !!alert;
  const ids = actionsInRoom(balance, state, inside);
  const fixes = alert ? alert.threats.filter((t) => t.room === inside) : [];
  const room = text.rooms[inside];
  return (
    <section className="panel">
      <h2 className="panel__title">
        <Icon name={ROOM_ICON[inside]} size={30} />
        {room.name}
        <span className="panel__about">{room.about}</span>
      </h2>
      <div className="panel__actions">
        {fixes.map((t) => {
          const check = alertTaskCheck(state, alert!, t.id);
          const busy = work?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`action action--fix${check.ok ? "" : " is-off"}${busy ? " is-busy" : ""}`}
              aria-disabled={!check.ok || !!work}
              onClick={() => onAlertTask(t.id)}
            >
              <span className="action__name">
                <span className="action__fixmark" aria-hidden="true">
                  !
                </span>
                {t.task}
              </span>
              <span className="deal">
                <Secs n={t.work} />
                <CostChips cost={t.cost} gain={t.gain ?? {}} />
              </span>
              {busy && work ? (
                <WorkBar work={work} />
              ) : (
                <span className="action__foot">
                  {!check.ok ? <span className="action__why">{reasonText(check, inside)}</span> : <span />}
                </span>
              )}
            </button>
          );
        })}
        {ids.map((id) => {
          const check = actionCheck(balance, state, id, free);
          const deal = shownDeal(state, id, free);
          const used = state.usedToday[id] ?? 0;
          const max = balance.actions[id].maxPerDay;
          const words = text.actions[id as ActionName];
          const busy = work?.id === id;
          return (
            <button
              key={id}
              type="button"
              className={`action${check.ok ? "" : " is-off"}${busy ? " is-busy" : ""}`}
              aria-disabled={!check.ok || (free && !!work)}
              onClick={() => onAction(id)}
            >
              <span className="action__name">{words.name}</span>
              <span className="action__about">{words.about}</span>
              <span className="deal">
                {free && <Secs n={alerts.actionWorkSeconds} />}
                <CostChips cost={deal.cost} gain={deal.gain} later={deal.later} />
              </span>
              {busy && work ? (
                <WorkBar work={work} />
              ) : (
                <span className="action__foot">
                  {!check.ok ? <span className="action__why">{reasonText(check, inside)}</span> : <span />}
                  <span className="action__uses">{fmt(text.panel.usesToday, { n: used, max })}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function WorkBar({ work }: { work: Work }) {
  const share = 1 - Math.max(0, work.left) / work.total;
  return (
    <span className="workbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
      <span className="workbar__fill" style={{ width: `${share * 100}%` }} />
      <span className="workbar__text">{fmt(text.alert.working, { n: Math.max(0, Math.ceil(work.left / 1000)) })}</span>
    </span>
  );
}
