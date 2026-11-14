// Mission ARES — the base, seen from above.
//
//   Power (top) · Air (left) · Greenhouse (right) · Shield Shelter (bottom),
//   joined by a hub in the middle. Geometry lives in src/game/map.ts.
//
// Move: arrow keys / WASD, tap or click a room (auto-walk), or the on-screen
// joystick on touch screens. Near a door: "Space / Tap" to walk in.
// Walking is free and the same speed for everyone.
//
// The kid's position is kept in a ref and drawn straight to the SVG each
// frame, so React only re-renders when the room (or the door) changes.

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { text } from "../game/config";
import {
  CORRIDOR,
  HUB,
  KID_R,
  MAP_H,
  MAP_W,
  ROOM_RECT,
  SPEED,
  doorPoint,
  nearDoor,
  pathTo,
  roomAt,
  roomCenter,
  step,
} from "../game/map";
import type { Pt } from "../game/map";
import type { RoomId } from "../game/types";
import { SceneIcon } from "./Icons";
import type { IconName } from "./Icons";

const ROOMS: RoomId[] = ["power", "air", "greenhouse", "shelter"];
const ROOM_ICON: Record<RoomId, IconName> = { power: "power", air: "air", greenhouse: "food", shelter: "shield" };
const FLOOR: Record<RoomId, string> = { power: "#4a4126", air: "#22425a", greenhouse: "#24452f", shelter: "#352c52" };

export type ThreatBadge = { id: string; room: RoomId; status: "open" | "done" | "prepared" | "decoy" };

type Props = {
  power: number;
  powerMax: number;
  air: number;
  airMax: number;
  food: number;
  foodMax: number;
  shield: number;
  shieldMax: number;
  solarToday: number;
  lightsOn: boolean;
  /** Where the kid stands when `resetKey` changes (new sol, retry…). */
  homeRoom: RoomId;
  resetKey: string;
  canMove: boolean;
  /** Tap-to-walk request; a new `n` starts a new walk. */
  goTo: { room: RoomId; n: number } | null;
  night: boolean;
  flareFx: "blocked" | "hit" | null;
  threats: ThreatBadge[];
  /** Work in progress during the alert (0..1). */
  working: { room: RoomId; progress: number } | null;
  onRoomTap: (room: RoomId) => void;
  onRoomChange: (room: RoomId | null) => void;
};

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  W: [0, -1],
  S: [0, 1],
  A: [-1, 0],
  D: [1, 0],
};

const isTouch = () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

// ---------------------------------------------------------------------------

export default function MapScene(props: Props) {
  const { canMove, goTo, homeRoom, resetKey, onRoomChange } = props;

  const pos = useRef<Pt>(roomCenter(homeRoom));
  const angle = useRef(90);
  const path = useRef<Pt[]>([]);
  const keys = useRef(new Set<string>());
  const stick = useRef<Pt>({ x: 0, y: 0 });
  const kidRef = useRef<SVGGElement>(null);
  const lastRoom = useRef<RoomId | null>(homeRoom);
  const lastDoor = useRef<RoomId | null>(null);
  const canMoveRef = useRef(canMove);
  const [door, setDoor] = useState<RoomId | null>(null);
  const [touch] = useState(isTouch);

  // Latest callbacks, without restarting the loop.
  const cb = useRef({ onRoomChange });
  useEffect(() => {
    cb.current = { onRoomChange };
  });
  useEffect(() => {
    canMoveRef.current = canMove;
    if (!canMove) {
      keys.current.clear();
      path.current = [];
    }
  }, [canMove]);

  const draw = (moving: boolean) => {
    const g = kidRef.current;
    if (!g) return;
    g.setAttribute("transform", `translate(${pos.current.x} ${pos.current.y}) rotate(${angle.current})`);
    g.classList.toggle("is-moving", moving);
  };

  // New sol / retry: put the kid back in the home room.
  useEffect(() => {
    pos.current = roomCenter(homeRoom);
    path.current = [];
    lastRoom.current = homeRoom;
    draw(false);
    cb.current.onRoomChange(homeRoom);
  }, [resetKey]); // only on a reset, not when homeRoom follows the kid

  // Tap-to-walk.
  useEffect(() => {
    if (goTo && canMoveRef.current) path.current = pathTo(pos.current, goTo.room);
  }, [goTo]);

  // Keyboard.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!canMoveRef.current) return;
      if (KEYS[e.key]) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        e.preventDefault();
        keys.current.add(e.key);
        path.current = [];
      } else if ((e.key === " " || e.key === "Enter") && lastDoor.current) {
        e.preventDefault();
        path.current = pathTo(pos.current, lastDoor.current);
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key);
      keys.current.delete(e.key.toLowerCase());
      keys.current.delete(e.key.toUpperCase());
    };
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // The movement loop.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Real time, so the kid walks at the same speed on fast and slow devices.
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      let vx = 0;
      let vy = 0;
      if (canMoveRef.current) {
        for (const k of keys.current) {
          const v = KEYS[k];
          if (v) {
            vx += v[0];
            vy += v[1];
          }
        }
        vx = Math.sign(vx);
        vy = Math.sign(vy);
        if (!vx && !vy && (stick.current.x || stick.current.y)) {
          vx = stick.current.x;
          vy = stick.current.y;
          path.current = [];
        }
      }
      let moving = false;
      const len = Math.hypot(vx, vy);
      if (len > 0.15) {
        // Small sub-steps so a long frame never jumps through a wall.
        const total = (SPEED * dt * Math.min(1, len)) / len;
        const n = Math.max(1, Math.ceil((total * len) / 10));
        const start = pos.current;
        for (let i = 0; i < n; i++) pos.current = step(pos.current, (vx * total) / n, (vy * total) / n);
        moving = pos.current.x !== start.x || pos.current.y !== start.y;
        angle.current = (Math.atan2(vy, vx) * 180) / Math.PI;
      } else if (path.current.length && canMoveRef.current) {
        let budget = SPEED * dt;
        while (budget > 0 && path.current.length) {
          const target = path.current[0];
          const dx = target.x - pos.current.x;
          const dy = target.y - pos.current.y;
          const d = Math.hypot(dx, dy);
          if (d <= budget) {
            pos.current = target;
            path.current = path.current.slice(1);
            budget -= d;
          } else {
            pos.current = { x: pos.current.x + (dx / d) * budget, y: pos.current.y + (dy / d) * budget };
            angle.current = (Math.atan2(dy, dx) * 180) / Math.PI;
            budget = 0;
          }
        }
        moving = true;
      }
      draw(moving);

      const room = roomAt(pos.current);
      if (room !== lastRoom.current) {
        lastRoom.current = room;
        cb.current.onRoomChange(room);
      }
      const nd = nearDoor(pos.current);
      if (nd !== lastDoor.current) {
        lastDoor.current = nd;
        setDoor(nd);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onKey = (r: RoomId) => (e: ReactKeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      props.onRoomTap(r);
    }
  };

  const badgeFor = (room: RoomId) => props.threats.filter((t) => t.room === room && t.status !== "decoy");

  return (
    <div className={`map${props.night ? " is-night" : ""}`}>
      <svg
        className="map__svg"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="The Mars base from above. Tap a room to walk there, or use the arrow keys."
      >
        <rect x="-2000" y="-2000" width="5400" height="4900" fill="#6e2f1c" />
        {[
          [30, 60, 40],
          [1330, 80, 34],
          [1300, 820, 46],
          [60, 820, 30],
          [400, 160, 22],
          [1000, 150, 26],
          [420, 760, 24],
          [1020, 760, 20],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#5a2516" />
        ))}

        {/* Rooms, hub, doorways */}
        {ROOMS.map((r) => (
          <rect key={r} className="map__room" x={ROOM_RECT[r].x} y={ROOM_RECT[r].y} width={ROOM_RECT[r].w} height={ROOM_RECT[r].h} rx="26" fill={FLOOR[r]} />
        ))}
        <rect className="map__room" x={HUB.x} y={HUB.y} width={HUB.w} height={HUB.h} rx="30" fill="#2b3040" />
        {ROOMS.map((r) => {
          const c = CORRIDOR[r];
          return <rect key={r} x={c.x} y={c.y - 10} width={c.w} height={c.h + 20} fill="#2b3040" className="map__door" />;
        })}
        {ROOMS.map((r) => {
          const c = CORRIDOR[r];
          const vertical = c.w > c.h;
          return vertical ? (
            <g key={r} className="map__doorwall">
              <rect x={c.x - 8} y={c.y - 8} width="16" height={c.h + 16} />
              <rect x={c.x + c.w - 8} y={c.y - 8} width="16" height={c.h + 16} />
            </g>
          ) : (
            <g key={r} className="map__doorwall">
              <rect x={c.x - 8} y={c.y - 8} width={c.w + 16} height="16" />
              <rect x={c.x - 8} y={c.y + c.h - 8} width={c.w + 16} height="16" />
            </g>
          );
        })}
        <g className="map__logo" aria-hidden="true">
          <circle cx={HUB.x + HUB.w / 2} cy={HUB.y + HUB.h / 2} r="62" />
          <text x={HUB.x + HUB.w / 2} y={HUB.y + HUB.h / 2 + 12}>
            ARES
          </text>
        </g>

        <PowerRoom power={props.power} max={props.powerMax} solar={props.solarToday} />
        <AirRoom air={props.air} max={props.airMax} />
        <Greenhouse food={props.food} max={props.foodMax} lightsOn={props.lightsOn} />
        <Shelter shield={props.shield} max={props.shieldMax} flash={props.flareFx === "blocked"} />

        {/* Room names + alert badges */}
        {ROOMS.map((r) => {
          const R = ROOM_RECT[r];
          const label = r === "shelter" ? { x: R.x + R.w / 2, y: R.y + R.h - 26 } : { x: R.x + R.w / 2, y: R.y + 62 };
          const badges = badgeFor(r);
          return (
            <g key={r} className="map__label" aria-hidden="true">
              <SceneIcon name={ROOM_ICON[r]} x={label.x - 150} y={label.y - 40} size={46} />
              <text x={label.x + 10} y={label.y} textAnchor="middle">
                {text.rooms[r].name}
              </text>
              {badges.map((b, i) => (
                <g key={b.id} transform={`translate(${R.x + R.w - 48 - i * 70} ${r === "shelter" ? R.y + 44 : R.y + R.h - 44})`}>
                  <g className={`map__badge map__badge--${b.status}`}>
                    <circle r="30" />
                    <text y="12">{b.status === "open" ? "!" : "✓"}</text>
                  </g>
                </g>
              ))}
            </g>
          );
        })}

        {/* Tap areas */}
        {ROOMS.map((r) => (
          <rect
            key={r}
            className="map__hit"
            x={ROOM_RECT[r].x}
            y={ROOM_RECT[r].y}
            width={ROOM_RECT[r].w}
            height={ROOM_RECT[r].h}
            rx="26"
            role="button"
            tabIndex={0}
            aria-label={`${text.rooms[r].name}. Walk there.`}
            onClick={() => props.onRoomTap(r)}
            onKeyDown={onKey(r)}
          />
        ))}

        {/* "Space / Tap" prompt near a door */}
        {door && canMove && <DoorPrompt room={door} onTap={() => props.onRoomTap(door)} />}

        {/* The kid */}
        <g ref={kidRef} className="tkid" transform={`translate(${pos.current.x} ${pos.current.y}) rotate(${angle.current})`}>
          <TopKid />
        </g>
        {props.working && <WorkRing room={props.working.room} progress={props.working.progress} pos={pos.current} />}
      </svg>

      {touch && canMove && <Joystick stick={stick} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function DoorPrompt({ room, onTap }: { room: RoomId; onTap: () => void }) {
  const d = doorPoint(room);
  const hub = { x: HUB.x + HUB.w / 2, y: HUB.y + HUB.h / 2 };
  const x = d.x + (hub.x - d.x) * 0.5;
  const y = d.y + (hub.y - d.y) * 0.5 + (room === "air" || room === "greenhouse" ? -70 : 0);
  return (
    <g className="map__prompt" transform={`translate(${x} ${y})`} onClick={onTap} role="button" aria-label={`Enter the ${text.rooms[room].name}`}>
      <rect x="-118" y="-30" width="236" height="60" rx="30" />
      <text y="11">{text.map.prompt}</text>
    </g>
  );
}

/** The kid from above: head, shoulders, yellow backpack. Faces right at angle 0. */
function TopKid() {
  return (
    <g className="tkid__body">
      <ellipse cx="4" cy="6" rx={KID_R + 4} ry={KID_R} fill="rgba(0,0,0,0.35)" />
      <rect x="-30" y="-15" width="18" height="30" rx="6" fill="#e0a63a" stroke="#8a5f14" strokeWidth="2" />
      <ellipse cx="0" cy="0" rx="17" ry="26" fill="#2f8496" />
      <circle className="tkid__hand tkid__hand--l" cx="12" cy="-22" r="7" fill="#c98b62" />
      <circle className="tkid__hand tkid__hand--r" cx="12" cy="22" r="7" fill="#c98b62" />
      <circle cx="2" cy="0" r="15" fill="#c98b62" />
      <path d="M-13 -8 A15 15 0 0 0 -13 8 L-2 12 Q-8 0 -2 -12 Z" fill="#2a1a12" />
      <path d="M-14 -6 Q-6 -16 6 -13 Q-4 -6 -4 0 Q-4 6 6 13 Q-6 16 -14 6 Z" fill="#2a1a12" />
      <circle cx="16" cy="0" r="2.6" fill="#a8704c" />
    </g>
  );
}

function WorkRing({ progress, pos }: { room: RoomId; progress: number; pos: Pt }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <g className="map__work" transform={`translate(${pos.x} ${pos.y})`} aria-hidden="true">
      <circle r={r} className="map__work-bg" />
      <circle r={r} className="map__work-fg" strokeDasharray={`${c * progress} ${c}`} transform="rotate(-90)" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Rooms, each with a live mini-indicator

function PowerRoom({ power, max, solar }: { power: number; max: number; solar: number }) {
  const R = ROOM_RECT.power;
  const level = power / max;
  return (
    <g className="map__power" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={R.x + 40 + i * 30} y={R.y + 100} width="24" height="110" rx="4" fill="#1f3f8f" stroke="#8fb0ff" strokeWidth="3" />
      ))}
      <text className="map__mini" x={R.x + 100} y={R.y + 238}>
        ☀ {solar}
      </text>
      <g transform={`translate(${R.x + R.w - 120} ${R.y + 96})`}>
        <rect x="0" y="0" width="80" height="128" rx="10" fill="#151a28" stroke="#ffd23f" strokeWidth="5" />
        <rect x="26" y="-12" width="28" height="14" rx="4" fill="#ffd23f" />
        <rect x="8" y={8 + 112 * (1 - level)} width="64" height={112 * level} rx="6" fill="#ffd23f" />
        <text className="map__mini" x="40" y="160">
          {power}
        </text>
      </g>
    </g>
  );
}

function AirRoom({ air, max }: { air: number; max: number }) {
  const R = ROOM_RECT.air;
  const cx = R.x + 130;
  const cy = R.y + 170;
  const r = 62;
  const c = 2 * Math.PI * r;
  return (
    <g className="map__air" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="#0f2a40" stroke="#2c5a7a" strokeWidth="14" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#4cc3ff" strokeWidth="14" strokeDasharray={`${c * (air / max)} ${c}`} transform={`rotate(-90 ${cx} ${cy})`} />
      <text className="map__mini" x={cx} y={cy + 4}>
        O₂
      </text>
      <text className="map__mini map__mini--small" x={cx} y={cy + 40}>
        {air}
      </text>
      {[0, 1, 2].map((i) => (
        <circle key={i} className="map__bubble" cx={R.x + 300 + i * 40} cy={R.y + 200} r={10 + i * 3} style={{ animationDelay: `${-i * 0.6}s` }} />
      ))}
    </g>
  );
}

function Greenhouse({ food, max, lightsOn }: { food: number; max: number; lightsOn: boolean }) {
  const R = ROOM_RECT.greenhouse;
  const health = food / max;
  const size = 10 + 18 * health;
  const droop = health < 0.3;
  return (
    <g className={`map__green${lightsOn ? " is-lit" : ""}`} aria-hidden="true">
      <rect className="map__glow" x={R.x + 20} y={R.y + 90} width={R.w - 40} height={R.h - 110} rx="20" />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect x={R.x + 50} y={R.y + 110 + row * 56} width={R.w - 100} height="36" rx="8" fill="#6b4a32" />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <g key={k} className={`map__plant${droop ? " is-droopy" : ""}`}>
              <circle cx={R.x + 90 + k * 56} cy={R.y + 128 + row * 56} r={size} fill="#5fd068" />
              <circle cx={R.x + 90 + k * 56} cy={R.y + 128 + row * 56} r={size * 0.45} fill="#3c9a45" />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

function Shelter({ shield, max, flash }: { shield: number; max: number; flash: boolean }) {
  const R = ROOM_RECT.shelter;
  const cx = R.x + R.w / 2;
  const cy = R.y + 110;
  return (
    <g className="map__shelter" aria-hidden="true">
      <rect x={R.x + 30} y={R.y + 40} width="90" height="150" rx="10" fill="#8b93a0" />
      <rect x={R.x + 38} y={R.y + 48} width="74" height="62" rx="8" fill="#c36b5a" />
      <rect x={R.x + 38} y={R.y + 120} width="74" height="62" rx="8" fill="#4c7fb3" />
      <rect x={R.x + R.w - 120} y={R.y + 60} width="90" height="60" rx="8" fill="#9aa3b5" />
      <rect x={R.x + R.w - 106} y={R.y + 70} width="40" height="28" rx="4" fill="#4cc3ff" />
      <circle className={`map__shieldglow${flash ? " is-flash" : ""}`} cx={cx} cy={cy} r="120" style={{ opacity: shield > 0 ? 0.15 + (shield / max) * 0.45 : 0 }} />
      {Array.from({ length: max }, (_, i) => (
        <rect key={i} x={cx - 66 + i * 46} y={cy - 18} width="40" height="36" rx="8" className={`map__seg${i < shield ? " is-on" : ""}`} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------

/** On-screen joystick for touch screens. Writes a direction into `stick`. */
function Joystick({ stick }: { stick: { current: Pt } }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<Pt>({ x: 0, y: 0 });
  const move = (e: ReactPointerEvent) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const max = r.width / 2;
    let dx = e.clientX - (r.left + max);
    let dy = e.clientY - (r.top + max);
    const d = Math.hypot(dx, dy);
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    setKnob({ x: dx, y: dy });
    stick.current = { x: dx / max, y: dy / max };
  };
  const end = () => {
    setKnob({ x: 0, y: 0 });
    stick.current = { x: 0, y: 0 };
  };
  return (
    <div
      ref={base}
      className="joy"
      role="application"
      aria-label="Joystick: drag to walk"
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* not a real pointer (tests) */
        }
        move(e);
      }}
      onPointerMove={(e) => e.buttons && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span className="joy__knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
