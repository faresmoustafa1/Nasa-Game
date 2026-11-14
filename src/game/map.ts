// Mission ARES — the top-down base map. Pure geometry: no React, no DOM,
// so the balance checker can measure walking times too.
//
//                 ┌──────────────┐
//                 │  Power Room  │
//                 └──────┬───────┘
//   ┌──────────┐   ┌─────┴─────┐   ┌──────────────┐
//   │ Air Room ├───┤    Hub    ├───┤  Greenhouse  │
//   └──────────┘   └─────┬─────┘   └──────────────┘
//                 ┌──────┴───────┐
//                 │Shield Shelter│
//                 └──────────────┘
//
// Map units: 1400 × 900. The kid is a circle of radius KID_R. Walls are
// WALL thick. Collision: the kid's centre must stay inside a "zone" (each
// room, the hub and each corridor, shrunk by the kid's size).

import type { RoomId } from "./types";

export const MAP_W = 1400;
export const MAP_H = 900;
export const WALL = 16;
export const KID_R = 26;
/** Walking speed in map units per second. Same for every player. */
export const SPEED = 400;

export type Rect = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

export const HUB: Rect = { x: 560, y: 320, w: 280, h: 260 };

export const ROOM_RECT: Record<RoomId, Rect> = {
  power: { x: 520, y: 30, w: 360, h: 250 },
  air: { x: 60, y: 300, w: 460, h: 300 },
  greenhouse: { x: 880, y: 300, w: 460, h: 300 },
  shelter: { x: 520, y: 620, w: 360, h: 250 },
};

/** The short corridor (doorway) between each room and the hub. */
export const CORRIDOR: Record<RoomId, Rect> = {
  power: { x: 650, y: 280, w: 100, h: 40 },
  air: { x: 520, y: 400, w: 40, h: 100 },
  greenhouse: { x: 840, y: 400, w: 40, h: 100 },
  shelter: { x: 650, y: 580, w: 100, h: 40 },
};

const ROOM_IDS: RoomId[] = ["power", "air", "greenhouse", "shelter"];
const INSET = KID_R + WALL / 2;

const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const inset = (r: Rect, d: number): Rect => ({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d });
const inside = (p: Pt, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export const HUB_CENTER = center(HUB);
export const roomCenter = (room: RoomId): Pt => center(ROOM_RECT[room]);
export const doorPoint = (room: RoomId): Pt => center(CORRIDOR[room]);

/** A point just inside the room, in front of its door. */
export function doorInside(room: RoomId): Pt {
  const d = doorPoint(room);
  const c = roomCenter(room);
  const dx = Math.sign(c.x - d.x) * (Math.abs(c.x - d.x) > 1 ? 1 : 0);
  const dy = Math.sign(c.y - d.y) * (Math.abs(c.y - d.y) > 1 ? 1 : 0);
  return { x: d.x + dx * 80, y: d.y + dy * 80 };
}

const ROOM_ZONES: Record<RoomId, Rect> = Object.fromEntries(
  ROOM_IDS.map((id) => [id, inset(ROOM_RECT[id], INSET)]),
) as Record<RoomId, Rect>;
const HUB_ZONE = inset(HUB, INSET);

/** Corridor zones: narrowed across, stretched along so they overlap the room and hub zones. */
const CORRIDOR_ZONES: Rect[] = ROOM_IDS.map((id) => {
  const c = CORRIDOR[id];
  const vertical = c.h < c.w ? true : false; // power/shelter corridors run up-down
  const stretch = INSET + 12;
  return vertical
    ? { x: c.x + INSET, y: c.y - stretch, w: c.w - 2 * INSET, h: c.h + 2 * stretch }
    : { x: c.x - stretch, y: c.y + INSET, w: c.w + 2 * stretch, h: c.h - 2 * INSET };
});

export function isWalkable(p: Pt): boolean {
  if (inside(p, HUB_ZONE)) return true;
  for (const id of ROOM_IDS) if (inside(p, ROOM_ZONES[id])) return true;
  return CORRIDOR_ZONES.some((z) => inside(p, z));
}

/** Which room the kid is in (null = hub or a doorway). */
export function roomAt(p: Pt): RoomId | null {
  for (const id of ROOM_IDS) if (inside(p, ROOM_ZONES[id])) return id;
  return null;
}

/** The door the kid is standing near, from the hub side (for the "Space / Tap" prompt). */
export function nearDoor(p: Pt): RoomId | null {
  if (roomAt(p)) return null;
  let best: RoomId | null = null;
  let bestD = 150;
  for (const id of ROOM_IDS) {
    const d = Math.hypot(p.x - doorPoint(id).x, p.y - doorPoint(id).y);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

/** Move with simple collision: try the full step, then slide along x or y. */
export function step(p: Pt, dx: number, dy: number): Pt {
  const full = { x: p.x + dx, y: p.y + dy };
  if (isWalkable(full)) return full;
  const sx = { x: p.x + dx, y: p.y };
  if (dx && isWalkable(sx)) return sx;
  const sy = { x: p.x, y: p.y + dy };
  if (dy && isWalkable(sy)) return sy;
  return p;
}

/** Waypoints for tap-to-walk: out of this room, through the hub, into the target room. */
export function pathTo(from: Pt, target: RoomId): Pt[] {
  const here = roomAt(from);
  if (here === target) return [roomCenter(target)];
  const pts: Pt[] = [];
  if (here) pts.push(doorInside(here), doorPoint(here));
  pts.push(HUB_CENTER, doorPoint(target), doorInside(target), roomCenter(target));
  return pts;
}

export function pathLength(from: Pt, pts: Pt[]): number {
  let len = 0;
  let a = from;
  for (const b of pts) {
    len += Math.hypot(b.x - a.x, b.y - a.y);
    a = b;
  }
  return len;
}

/** Seconds to walk from one room's centre to another's (used by the balance checker). */
export function walkSeconds(from: RoomId, to: RoomId): number {
  if (from === to) return 0;
  const start = roomCenter(from);
  return pathLength(start, pathTo(start, to)) / SPEED;
}
