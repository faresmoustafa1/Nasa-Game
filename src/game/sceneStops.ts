// Mission ARES — where Next ▸ / ◂ Back jump to (used with SceneNav).

/** Start times of a scene's notes (plus 0), in order. */
export function stopsOf(notes: { from: number }[]): number[] {
  return [0, ...notes.map((n) => n.from)];
}

/** Where Next goes: the first stop after `t`, or `limit` when a task is waiting there. */
export function nextTarget(stops: number[], t: number, limit?: number): number | undefined {
  const next = stops.find((s) => s > t + 0.05);
  if (next === undefined) return undefined;
  return limit !== undefined ? Math.min(next, limit) : next;
}

/** Where Back goes: the start of the note showing, or (if it just started) the one before it. */
export function backTarget(stops: number[], t: number): number {
  const i = stops.findLastIndex((s) => s <= t);
  if (i < 0) return 0;
  if (t - stops[i] > 1.6 || i === 0) return stops[i];
  return stops[i - 1];
}
