# Mission ARES

## Run
    npm install
    npm run dev      # open the link it prints (http://localhost:5173)

Click Play: the ~60-second prologue, the ~35-second cruise, the touchdown at Jezero
and the tablet tutorial run, then a placeholder "base hub" screen (Phase 2).

Testing a scene? (dev only)
- Prologue: `?t=SECONDS`, e.g. http://localhost:5173/?t=40, then press Play.
- Any later scene: `?scene=cruise|touchdown|hub` and optionally `&at=SECONDS`,
  e.g. http://localhost:5173/?scene=touchdown&at=31 jumps to the tablet.
  (`at` skips the story beats, so CSS animations that start with a beat replay
  from their start; play from 0 to see the real timing.)

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

## The Mars part (Phase 1: cruise + touchdown)
Same rules as the prologue: SVG on a 1600 x 900 stage, one note at a time in the
scene, synthesized sound, no image files. Every scene has BEATS (what happens
and when) in its .tsx and the words in its notes.ts, so every fact and its
`source` can be listed on the Data Sources screen.
1. Cruise: the ship leaves Earth. Day 2: knocking in the locker, the boy is
   found. "We packed for 4. Now we are 5." Calendar flips month 1 to 7.
2. Touchdown: entry, parachute, rockets, landing, the crew steps out (the boy
   in the spare suit). The Commander hands over the tablet. The player taps
   Power, Water and Air; then "Start mission".

Shared by every Mars scene (src/game):
- state.ts       the 3 meters + crew score + sol + choice log (start values from the cost table)
- Tablet.tsx     the Commander's tablet (HUD); every row is tappable
- notes.tsx      the in-scene notes: story, shout, fact and radio (Mission Control, used from the rover scene on)
- art.tsx        stars, the crew and the boy
- useTimeline.ts the scene clock (with the dev `at` jump)
- gameAudio.ts   synthesized hum, thump, roar, parachute, thud, hatch, chime

## Files
- src/prologue/Prologue.tsx   BEATS (timing), SCENE_NOTES (words) + both scenes
- src/prologue/Prologue.css   all the art and animation
- src/prologue/prologueAudio.ts   synthesized crickets / chime / clang / beeps / rumble
- src/cruise/, src/touchdown/   Phase 1 scenes (.tsx = beats + art, notes.ts = words, .css = art + animation)
- src/App.tsx   Play button, prologue, cruise, touchdown, then the base hub placeholder (Phase 2)
