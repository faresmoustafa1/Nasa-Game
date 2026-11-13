import type { RoomId } from "../game/types";

/** Where the kid stands in each room (x in the 1600 × 800 base scene). */
export const KID_X: Record<RoomId, number> = {
  power: 335,
  air: 715,
  greenhouse: 1085,
  shelter: 1305,
};
