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
