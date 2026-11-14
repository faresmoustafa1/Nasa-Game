// Mission ARES — where things are in the base cut-away (1600 × 900 coordinates).
// The four rooms sit side by side. Everyone stands on FLOOR_Y.

import type { Task } from "../game/state";

export const FLOOR_Y = 748;
export const ROOF_Y = 480;

export type RoomId = "greenhouse" | "oxygen" | "shelter" | "garage";

export const ROOMS: Record<RoomId, { x: number; w: number; name: string }> = {
  greenhouse: { x: 100, w: 400, name: "GREENHOUSE" },
  oxygen: { x: 500, w: 360, name: "OXYGEN MAKER" },
  shelter: { x: 860, w: 320, name: "SHELTER" },
  garage: { x: 1180, w: 340, name: "GARAGE" },
};

/** The two jobs, and the room each one happens in. */
export const TASK_ROOM: Record<Task, RoomId> = { greenhouse: "greenhouse", rover: "garage" };

export const roomCenter = (id: RoomId) => ROOMS[id].x + ROOMS[id].w / 2;

/** Where the boy stands when he arrives for a job (a little left of centre, so the tools stay visible). */
export const TASK_STAND_X: Record<Task, number> = { greenhouse: 330, rover: 1215 };

/** Where the crew stand during the day. */
export const CREW_POS = { commander: 1130, doctor: 440, engineer: 825, pilot: 1215 } as const;

/** Where the boy starts: in the shelter, between the beds and the commander. */
export const BOY_START_X = 1050;
export const PERSON_SCALE = 0.8;
