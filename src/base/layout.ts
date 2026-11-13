import type { RoomId } from "../game/types";

/** Where the kid stands in each room (x in the 1600 × 800 base scene). */
export const KID_X: Record<RoomId, number> = {
  power: 335,
  air: 715,
  greenhouse: 1085,
  shelter: 1305,
};

/** First-run tips, in order (Sol 1 only). */
export type CoachStep = "bars" | "rooms" | "panel" | "endsol";
export const COACH_STEPS: CoachStep[] = ["bars", "rooms", "panel", "endsol"];
