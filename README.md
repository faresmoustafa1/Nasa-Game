# Mission ARES

## Run
    npm install
    npm run dev      # open the link it prints (http://localhost:5173)

Click Play: the ~60-second prologue runs, then a placeholder "Step 1" screen.

Testing a scene? Add `?t=SECONDS` to the URL (dev only), e.g.
http://localhost:5173/?t=40, then press Play to start from that second.

## The words are inside the scene
There is no subtitle bar. One short note at a time appears in the scene, next
to what it talks about, with a dotted pointer line to it:
- story notes (dark glass): what is happening
- shout notes (warm, bold): the loudspeaker and liftoff
- SPACE FACT notes (taped paper): planet or star?, Planetary Parade,
  how rockets fly, how fast a rocket must go

Edit the words, timing, position and pointer target in `SCENE_NOTES` in
Prologue.tsx (coordinates are in the 1600 × 900 scene). List each fact's
`source` on the Data Sources screen.

## The prologue story
1. Asleep in the grass, next to a launch site
2. He wakes up and looks at the sky
3. A Planetary Parade
4. Loudspeaker: "Launch in 5 minutes!"
5. He runs to the rocket
6. Lost at the launch pad
7. He walks through an open door
8. The door slams shut: he's inside the rocket
9. Countdown
10. Liftoff, with him inside

## Files
- src/prologue/Prologue.tsx   BEATS (timing), SCENE_NOTES (words) + both scenes
- src/prologue/Prologue.css   all the art and animation
- src/prologue/prologueAudio.ts   synthesized crickets / chime / clang / beeps / rumble
- src/App.tsx   Play button, prologue, then the next scene (replace with Step 1)

---

## Step 1: project layout and data files

Everything a designer or teacher might want to change lives in JSON:

    src/data/balance.json     every cost and gain (all GAME-SIZED numbers)
    src/data/text.json        every word on the base screen
    src/data/days.json        the 7 Mars days: problem, briefing, predict, debrief
    src/data/facts.json       Mars Notebook cards (each needs source_url + date)
    src/data/glossary.json    science words, one short sentence each
    src/data/flare-table.json real flare class (C/M/X) → game radiation
    src/data/quiz.json        the 3-question before/after picture quiz
    src/data/sources.json     every NASA dataset, why it is used, where
    src/data/nasa-cache/      saved real NASA data (filled in Step 5)

Code:

    src/game/engine.ts   the rules (pure functions, no React, runs in Node too)
    src/game/types.ts    shared types
    src/game/config.ts   loads the JSON files
    src/game/save.ts     localStorage save (this browser only, no accounts)
    src/base/            the base screen (Step 2)
    src/prologue/        the opening story (unchanged)

## Step 2: the base screen

After the prologue (or Skip) you land in the base:
- 4 rooms: Power Room, Air Room, Greenhouse, Shield Shelter.
- Tap a room (or a room tab on phones): the kid walks there for −1 Time.
- 3 bars: Power, Air, Food. Each has its own icon shape and its number.
  Tap a bar to hear what it means. Bars warn "Low!" at a quarter.
- 6 Time points per sol. The shield meter shows only on days that need it.
- Every button shows its exact cost and gain before you tap it.
  Buttons you cannot use yet say why ("Not enough Power. You need 3…").
- The base reacts: lights dim at low power, batteries fill, bubbles show air,
  plants grow with food, grow lights glow pink, the shelter glows with shield,
  dust browns the panels and the sky.

Dev shortcuts (only in `npm run dev`):
- http://localhost:5173/?scene=base opens the base directly (resumes the save)
- http://localhost:5173/?scene=base&sol=3 starts a fresh game on Sol 3
- "New game" (top right) resets the save

## Step 3: the sol loop and the balance checker

A sol goes: **morning** (dust event, food from grow lights, the Sun makes
power) → **day** (walk + act) → **End Sol** → **night** → **Day Report**.

- Tonight's needs are always on screen before you end the sol:
  the crew breathes 3 Air, eats 2 Food, heaters use 2 Power
  (plus extra on event days). A red warning shows when you can't pay.
- Rule: if the base can't pay tonight's needs, or radiation dose reaches 3,
  it is a **Mission Pause**: a friendly reason, a tip, and **Retry Sol N**
  (back to that morning). If no plan can save the sol from that morning,
  the card says so and offers **Back to Sol N−1**: earlier choices matter.
- Flares: each flare point the shield doesn't block adds 1 dose.
  The shield fades by 1 each night.

### Balance checker

    npm run balance                    # every sol, flare classes C, M, X
    npm run balance -- --all-orders    # also all 120 orders of Sols 2-6 (slow)

It plays every combination of walks and actions with the real rules and
numbers and reports, per sol: UNWINNABLE (no choice survives from any start),
DOMINANT (one choice beats all others on every bar), no-brainer actions and
useless actions. Current result: no unwinnable or one-answer sols, and all
120 day orders can be finished with C, M and X flares.

The checker found one real problem: cleaning the panels only cost time, so it
was always right. Cleaning now also costs 1 Air (it's a spacesuit walk), and
became a real trade-off.

## Step 4: the learning loop (every sol)

1. **Briefing**: Commander Rivera says the problem in one sentence and
   explains new science words (from glossary.json).
2. **To-do** with an icon, top left. Flare days show the flare class and points.
3. **Ask Earth**: one hint per sol, costs 1 Power, arrives after a delay
   (10 s here; real messages take minutes).
4. **Predict**: End Sol first asks "What do you think will happen?" with
   2-3 picture choices.
5. **Act** in the rooms.
6. **Consequence**: night falls, bars drop, flare streaks hit the base,
   the shield dome flashes (blocked) or the base flashes orange (hit).
7. **Debrief**: right or wrong (celebrated either way), why it happened,
   the NASA fact card with its label and source.
8. The fact goes into the **Mars Notebook** (counter in the top bar).

Sol 1 has first-run tips with arrows (bars → rooms → buttons → End Sol).
The flare is a labelled GAME EXAMPLE (class M) until Step 5 connects real
DONKI data; the "real flare on <date>" card stays hidden until then.
