// Mission ARES — tests for the game rules (the same functions the scenes and the balance check use).
// Run: npm test

import assert from "node:assert/strict";
import { test } from "node:test";
import { CROPS, cropOf } from "../src/greenhouse/crops";
import { applyGreenhouse, outcomeOf } from "../src/greenhouse/rules";
import { NIGHT_STEPS, SUNRISE_POWER, applySample, applySteps, applyStorm, crewFaces, newGame } from "../src/game/state";
import type { GameState, Level } from "../src/game/state";
import { BADGES, badgeOf, scoreOf } from "../src/result/score";
import { FALLBACK_DELAY_MIN, earthMarsDelayMinutes, safeDelayMinutes } from "../src/rover/delay";
import { MISSIONS, SITES, missionOf, rockValue, sampleCap, sampleCost } from "../src/rover/sites";
import { COLD_CREW, SAVED_READINGS, applyGear, coldLevel } from "../src/rover/weather";
import { SAVED_EVENTS, flaresInNote, levelOf, messageLost, missOdds, stormLevel } from "../src/storm/donki";

const fresh = (patch: Partial<GameState> = {}): GameState => ({ ...newGame(), ...patch });

test("a meter that would go below 0 is refilled to 1 and costs 3 points", () => {
  const g = applySteps(fresh({ meters: { power: 1, water: 5, air: 5 } }), [{ key: "power", delta: -4, at: 0 }]);
  assert.equal(g.meters.power, 1);
  assert.equal(g.penalty, 3);
});

test("the night: Air −3 +2, Water −1, Power −1 then +sunrise", () => {
  const g = applySteps(fresh(), NIGHT_STEPS);
  assert.deepEqual(g.meters, { power: Math.min(12, 12 - 1 + SUNRISE_POWER), water: 9, air: 5 });
});

test("greenhouse: too little wilts, enough grows, one extra of both is lush, and going second needs 1 more water", () => {
  const radish = CROPS.radish;
  assert.equal(outcomeOf(radish, 0, 1, true), "wilt");
  assert.equal(outcomeOf(radish, 1, 1, true), "grow");
  assert.equal(outcomeOf(radish, 2, 2, true), "lush");
  assert.equal(outcomeOf(radish, 1, 1, false), "wilt");
  assert.equal(outcomeOf(CROPS.tomato, 3, 3, true), "grow", "tomatoes can never be lush");
  const g = applyGreenhouse(fresh({ crop: "radish" }), 1, 1);
  assert.equal(g.harvest, radish.grow);
  assert.equal(g.meters.water, 9);
  assert.equal(g.meters.power, 11);
});

test("garage: a heater too weak for the cold costs the crew, the right one does not", () => {
  const freezing = SAVED_READINGS.find((r) => coldLevel(r.temp) === 3)!;
  const weak = applyGear(fresh(), freezing, 1);
  assert.equal(weak.crew, 4 - COLD_CREW);
  assert.equal(weak.meters.power, 11);
  const right = applyGear(fresh(), freezing, 3);
  assert.equal(right.crew, 4);
  assert.equal(right.meters.power, 9);
});

test("rover: costs never drop below 1 Power, waiting or going second means fewer rocks, the science team's rock is worth +2", () => {
  const floor = SITES[0];
  assert.equal(sampleCost(floor, false, true), 1);
  assert.equal(sampleCost(floor, true, false, 2), floor.base + 3);
  assert.equal(sampleCap(true, false), 3);
  assert.equal(sampleCap(false, true), 1);
  assert.equal(rockValue(floor, "floor"), floor.points + 2);
  assert.equal(rockValue(floor, "top"), floor.points);
  const g = applySample(fresh(), 3, 6);
  assert.deepEqual([g.meters.power, g.meters.air, g.samples, g.rockPoints], [9, 5, 1, 6]);
});

test("storm: each level the storm is bigger than the shield costs the crew 2; the shield locks water", () => {
  const base = { forecast: 2 as Level, speed: 700, date: "2025-06-06", live: false, flare: null, lost: false };
  const held = applyStorm(fresh(), { ...base, level: 2, shield: 3 });
  assert.equal(held.storm?.hits, 0);
  assert.equal(held.crew, 4);
  assert.equal(held.locked, 6);
  const hit = applyStorm(fresh(), { ...base, level: 3, shield: 1 });
  assert.equal(hit.storm?.hits, 2);
  assert.equal(hit.crew, 0);
});

test("DONKI: forecast size from speed and proton events; saved events are one of each size and all reach Mars", () => {
  assert.deepEqual(SAVED_EVENTS.map(levelOf), [1, 2, 3]);
  assert.ok(SAVED_EVENTS.every((e) => e.marsHit && e.arrival && e.link));
  assert.equal(messageLost(SAVED_EVENTS[2]), true, "the X1.8 flare event has no forecast");
  for (const f of [1, 2, 3] as Level[])
    for (const glancing of [false, true]) {
      const odds = missOdds(f, glancing);
      assert.ok(Math.abs(odds[0] + odds[1] + odds[2] - 1) < 1e-9);
    }
  for (const e of SAVED_EVENTS) {
    const lv = stormLevel(e);
    assert.ok(Math.abs(lv - levelOf(e)) <= 1, "a storm is at most one size off its forecast");
    assert.equal(stormLevel(e), lv, "the same event always turns out the same way");
  }
});

test("the Earth–Mars message delay stays in the real range (about 3 to 23 minutes)", () => {
  for (let m = 0; m < 48; m++) {
    const d = earthMarsDelayMinutes(new Date(Date.UTC(2024, m, 1)));
    assert.ok(d > 3 && d < 23, `delay ${d.toFixed(1)} min`);
  }
});

test("score and badges", () => {
  const g = fresh({ rockPoints: 12, harvest: 3, crew: 3, meters: { power: 3, water: 5, air: 2 }, penalty: 0 });
  assert.equal(scoreOf(g).total, 28);
  assert.equal(badgeOf(28).id, "silver");
  assert.equal(badgeOf(BADGES[0].min).id, "gold");
  assert.equal(badgeOf(0).id, "bronze");
});

test("crew faces: one per crew member", () => {
  assert.deepEqual(crewFaces(4), ["happy", "happy", "happy", "happy", "tired"]);
  assert.equal(crewFaces(9).length, 5);
  assert.deepEqual(crewFaces(-1), Array(5).fill("tired"));
});

test("DONKI notes: flare classes are read from 'X flare', not from the coronagraph names C2/C3", () => {
  assert.deepEqual(flaresInNote("Visible in SOHO LASCO C2/C3. The source is a C1.3 flare and eruption."), ["C1.3"]);
  assert.deepEqual(flaresInNote("Associated with an M3.5 flare from AR 4000"), ["M3.5"]);
  assert.deepEqual(flaresInNote(undefined), []);
});

test("fallbacks: unknown data never breaks the game", () => {
  assert.equal(safeDelayMinutes(new Date(Date.UTC(2090, 0, 1))), FALLBACK_DELAY_MIN, "outside the orbit data's years");
  assert.equal(safeDelayMinutes(new Date(Number.NaN)), FALLBACK_DELAY_MIN, "an unreadable date");
  assert.equal(cropOf("banana"), CROPS.radish);
  assert.equal(missionOf("moon"), MISSIONS.foot);
  const g = applyGreenhouse(fresh({ crop: "banana" as never }), 1, 1);
  assert.equal(g.harvest, CROPS.radish.grow);
});
