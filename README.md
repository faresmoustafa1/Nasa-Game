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
