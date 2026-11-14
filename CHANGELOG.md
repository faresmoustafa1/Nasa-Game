# Mission ARES — developer notes and changelog

How the game is built, phase by phase. For what the project is and how to play, see README.md.

## Testing a scene (dev only, `npm run dev`)
- Prologue: `?t=SECONDS`, e.g. http://localhost:5173/?t=40, then press Play.
- Any later scene: `?scene=cruise|touchdown|hub|task|night|storm|end` and optionally `&at=SECONDS`,
  e.g. http://localhost:5173/?scene=touchdown&at=31 jumps to the tablet.
  Add `&done=greenhouse` (or `rover`) to start with one job finished (the hub's second visit).
  (`at` skips the story beats, so CSS animations that start with a beat replay
  from their start; play from 0 to see the real timing.)


## Phase 10: judging review fixes

- **Sunrise power:** the night now ends with sunrise: the solar panels on the roof charge the batteries (Power +2, `SUNRISE_POWER`
  in `src/game/state.ts`), with a fact on why dusty air means less power (Opportunity). Power used today is not refilled during the day.
- **Cold costs the crew:** a heater too weak for the cold now also costs crew −1 (`applyGear` in `src/rover/weather.ts`), so being cold is
  never the cheapest plan. The balance check shows the best plan now always matches the heater to the cold.
- **Storm forecast with uncertainty:** Mission Control gives a FORECAST from the real DONKI speed. The storm can turn out one size bigger or
  smaller (`missOdds` / `stormLevel` in `src/storm/donki.ts`, seeded by the event ID, fixed in Judge Mode), so a thicker shield is insurance.
- **DONKI → Mars:** the live call reads NASA's WSA-Enlil runs stored with each CME and prefers a cloud the model sends to Mars, with the
  predicted arrival date. The three saved events were re-checked and all reach Mars (small one replaced: 25 Oct 2026, 275 km/s).
  The tag shows the CME date and DONKI ID; the result screen links to the event page. The `api.nasa.gov` FLR endpoint currently answers 404,
  so the flare class falls back to the CME's own note ("…a C1.3 flare…").
- **No forecast after a big flare:** reworded. A big flare's particles reach Mars in minutes, before Earth can measure the cloud and send a
  forecast (a message alone takes the real Earth–Mars delay). The old "the flare blocks our radio" was not accurate.
- **NASA RadLab:** real Curiosity RAD readings on Mars (quiet days vs. the 20 May 2024 storm, `src/storm/radlab.ts`) on the storm's radiation card.
- **NASA OSDR:** the greenhouse ends with study OSD-268 (space lettuce tested for germs and nutrients).
- **Real NASA photo:** Jezero's delta from orbit (PIA23239, `public/nasa/`) on the rover map before the trip.
- **CSA:** a "Back on Earth" card on the Naurvik Arctic greenhouse (Canadian Space Agency food toolkit).
- **Facts and sources:** Curiosity RAD citation fixed (Hassler et al., Science, 2014: 0.67 mSv/day); water recovery, sol length and Jezero
  average temperature now cite NASA or the MEDA team's paper; a sourced fact on why water walls stop radiation (Orion storm shelter).
- **Hub:** both "If later: …" chips show before the first pick, so the cost of waiting is visible before choosing.
- **Rover:** the "which rock did the team ask for?" hint no longer shows once that rock is collected.
- **Crew faces:** one face per crew member (crew score 0–5; it could never go above 5 anyway). The result screen uses the same faces.
- **Title:** "Skip the story: start at the landing" for replays and classrooms; Credits list the team, the data and the AI use.
- **Balance:** `npm run balance` (no manual steps). New badge limits: Gold 31+, Silver 27–30, Bronze under 27.
- **Tests:** `npm test` (node:test) for the rules: meters and backups, the night, greenhouse, garage, rover, storm, forecasts, delay, score.
- **Dev:** the made-up finished game behind `?scene=end` / Jump → Result now follows the rules (2 rocks = 12 points).
- Your key goes in `.env.local` (git-ignored); `.env.example` shows the format.

### Phase 10b: fallbacks everywhere, layout, team

- **Fallbacks:** every piece of data has a saved or default value, so nothing can stall or break the game:
  - DONKI: no live cloud aimed at Mars this month, offline, slow, over the limit, an error, or odd data → a saved real Mars-bound
    event (a hard 3.5 s timer in `Storm.tsx` makes sure, even if a request hangs). The FLR endpoint failing → the flare class from the CME note.
  - Earth–Mars delay: outside the orbit data's years (1800–2050) or not a number → 12 minutes (`safeDelayMinutes` in `src/rover/delay.ts`).
  - Unknown crop or science-team rock in the game state → radishes / lake-mud rock (`cropOf`, `missionOf`).
  - The NASA photo fails to load → a drawing of the delta, labeled as a drawing.
  - Dates that cannot be read are never shown as "Invalid Date"; a pick list with one option never returns nothing.
  - Browser storage, sound and saved readings already had fallbacks.
- **No overlap:** in the greenhouse and garage close-ups the tablet's "Your choices" list starts folded (tap to open), the water-drops box
  is anchored to the bottom, and the heater switch sits lower (tighter on phones). Checked at 1920×1080, 1440×900, 1366×768, 1280×720,
  1024×768 and 812×375.
- **Team:** Fares Mostafa, Merna Hossam, Eman Ahmed, Amr Obaia, Ahmed Zahran (Credits screen and README).

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

## The Mars part (Phase 2: base hub + night)
- Hub (src/hub/Hub.tsx): the base cut open, four rooms. The greenhouse and the garage glow;
  tap one and the boy walks there. The other job gets a "Later: ..." chip (the rule lives in
  LATER_COST, src/game/state.ts). After the storm it shows again with only the job that is left.
- Night (src/hub/Night.tsx): sunset, the crew sleeps, five people breathe (Air -3), the oxygen
  maker answers (Power -1, Water -1, Air +2), morning of Sol 2. The costs are NIGHT_STEPS in
  state.ts. A meter that would go below 0 is refilled to 1 and costs 3 points (no game over).
- The jobs, storm and result are stand-in screens (src/game/Placeholder.tsx) until their phases.

## The Mars part (Phase 3: solar storm)
- Storm (src/storm/Storm.tsx): alarm, the crew runs to the shelter, Mission Control calls with the
  storm's size, the player picks a thin / medium / thick shield (water tanks slide around the shelter).
  Power -1/-2/-3 and 2/4/6 Water locked (shown hatched on the tablet until the sol's last job is done).
  A storm bigger than the shield costs the crew 2 points per level. A radiation card shows the result.
- Real data (src/storm/donki.ts): one call to NASA DONKI (CME + flares, last 30 days, 1.5 s limit).
  Size: under 500 km/s small, 500-1000 medium, over 1000 or any proton event big. An M or X flare
  blocks the radio: the message is lost and the player has to guess. If NASA is slow, offline or over
  its rate limit, one of 3 saved REAL events is used (small 3 Jun 2025, medium 6 Jun 2025, big 9 Oct 2024).
  A tag shows LIVE or SAVED. Get a free key at https://api.nasa.gov and put VITE_NASA_API_KEY=... in a
  `.env` file; the shared DEMO_KEY is rate-limited, so you will mostly see the saved events without one.
- Dev: `?scene=storm&storm=small|medium|big` forces an event, `&live=0` skips the live call.

## The result (Phase 6)
- Result screen (src/result/Result.tsx): after the second job. Everyone gets a badge (no fail): Gold "Mars Commander",
  Silver "Mars Pioneer", Bronze "Mars Explorer". Score = rock points + harvest + crew + leftover (Power + Water + Air)
  - emergency-backup penalty (src/result/score.ts). The badge limits (36 / 28) are first-pass; Phase 7 re-runs the balance.
  It also shows the score breakdown, the crew faces, a recap of every choice (`game.log`), and three "Back on Earth"
  cards (food: growing plants in small spaces; water: the station recovers 98%; storms: space weather and power grids),
  each with a source (src/result/earth.ts). Buttons: Play again (new game, skips the prologue; weather, crop and rock change),
  Data sources, Title.
- Data Sources screen (src/result/Sources.tsx, list in src/game/sources.ts): real NASA data the game uses (DONKI storm,
  JPL planet positions for the message delay, saved MEDA readings), every space fact with its source, the Earth cards,
  and a clear list of what is made up for the game. Crop facts, weather and Earth cards are imported, so they cannot drift;
  when you add a fact with a `source` anywhere, add it to sources.ts.
- Dev: `?scene=end` shows the result for a made-up finished game (`&rich=1` for a gold game, `&pen=3` for one emergency backup).

## The Mars part (Phase 5: greenhouse + oxygen puzzle)
- Greenhouse (src/greenhouse/): the camera zooms from the base into the greenhouse room. Drag 0-3 water drops
  onto the plants (each costs 1 Water; a tap or Enter also works, tap x to take one back) and set the lamp
  Off / 1 / 2 / 3 (1 Power per step). The plants change live (wilted / healthy / lush) before the player
  presses Grow!, then a time-lapse, the result, a real NASA fact about that crop and a zoom back out.
- Rules (src/greenhouse/rules.ts): the crop decides the needs (see below), +1 Water if the greenhouse is the second job.
  Too little: wilt, crew -1, harvest 0. Enough: the crop's harvest. One extra of both: lush, bigger harvest, crew +1
  (only for crops that have a lush harvest, and only when the tank and lamp can reach it). Water locked in the shelter walls cannot be used (hatched drops).
  `harvest` is a new field in GameState; the Phase 6 score is rockPoints + harvest + crew + leftover (Power + Water + Air) - penalty.
- A different crop every game (src/greenhouse/crops.ts, stored as `crop` in GameState, never the same twice in a row).
  The crops and the facts are real NASA space-garden crops; the Water/Light numbers are GAME values that fit each plant:
  Radishes W1 L1 harvest 3 / lush 5 (PH-02: ready in 27 days); Lettuce W1 L2, 4 / 7; Mizuna mustard W2 L1, 4 / 7
  (Veg-04); Dwarf tomatoes W2 L3, 6, no lush (Veg-05: watering and dry air problems, 12 ripe tomatoes);
  Hatch chile peppers W2 L2, 5 / 8 (PH-04: 137 days, 26 peppers, water is the biggest factor in spiciness).
  Each crop has its own drawing and its own fact card with its source. Dev: `&crop=radish|lettuce|mizuna|tomato|pepper`.
- Night puzzle (src/hub/OxygenPuzzle.tsx): at 9 s the night waits while the player turns pipes (quarter turns)
  so the water reaches the "Crew air" outlet. Wet pipes turn blue. It cannot be lost: "Hint" appears after 14 s
  and fixes one pipe. Then a fact about the ISS oxygen generator (NASA NTRS, ICES-2019-153) and Continue.
- Dev: `?scene=task&room=greenhouse` (add `&done=rover` for "greenhouse goes second"); the puzzle starts at `?scene=night&at=7`.

## The Mars part (Phase 4: rover to the delta)
- Rover (src/rover/Rover.tsx): a hand-drawn map of Jezero with 3 sites: crater floor (flat, 2 Power),
  delta foot (gentle climb, 3), delta top (steep climb, 4). Each sample also costs 1 Air. Each rock is worth points
  by site (4 / 6 / 7: the best rocks are up on the delta), stored as `rockPoints` in GameState. The map shows
  "Power -N · star points" per site, a labelled ROVER, and a GOAL box ("collect rocks = points, far costs more Power").
  Each game Mission Control spots an interesting rock at a different site (`bonusSite` in GameState, never the same
  twice in a row, `pickBonusSite` in sites.ts): a gold ring and star on the map, a radio note, +2 bonus points
  (BONUS_POINTS, a first-pass value for Phase 7). Dev: `&rock=floor|foot|top`.
  The very first note says what the rover is (also in the hub intro and the garage close-up). A tired crew
  (2 faces or fewer) adds +1 Power per sample. Samples allowed: 3 if the rover goes first, 2 if second.
- The choice (Mission Control): "Ask Earth, then wait" (each trip 1 less Power, 1 sample fewer) or "Go now".
  The message shows today's real one-way delay, worked out in src/rover/delay.ts from NASA/JPL's approximate
  orbit data (real range: about 4 to 24 minutes). The game squeezes the wait into 6 seconds.
- The dust thickens with every sample. Facts shown: Jezero (45 km, ancient lake and delta) and the 2018 dust
  storm that ended Opportunity (last message June 10, 2018). Sources are in src/rover/notes.ts.
- Garage zoom (src/rover/GarageTrip.tsx): the camera zooms into the garage (1.8x, same as the greenhouse).
  Then a close-up of the garage opens (like the greenhouse, src/rover/GarageCloseup.tsx): the boy is in his
  astronaut suit, a thermometer shows a REAL Perseverance (MEDA weather station) temperature for Jezero, and the
  player picks the suit + rover heater: low / medium / high heat (Power -1/-2/-3). It reacts live before
  "Suit up!": too weak = frost, snow, frosted visor, shivering, foggy breath, blue low battery; right = warm glow,
  full green battery; too strong = red edge, heat waves, sweat. The pilot waits in the rover cab and feels it too
  (shivers and says "Brrr!", smiles, or sweats), then waves once the boy has suited up. The pilot also sits in the
  cab in the base view (BaseArt `pilotInRover`) and shows as a helmet on the map rover. Cold levels: -40 C or warmer mild, -40 to -70 cold,
  below -70 freezing. Gear weaker than the cold: each rover sample costs +1 Power per level short (cold battery).
  Then a SPACE FACT about cold Mars, "Drive out", the rover leaves through the door; after "Head home" it drives
  back in and the camera zooms out. There is no live Jezero weather feed, so the game picks at random from five saved
  real readings, never the same one twice in a row (-20 C and -26 C first reading, -22 C afternoon high and -83 C night
  low of sols 43-44, -55 C average), in src/rover/weather.ts.
- Dev: `?scene=task&room=rover` (add `&cold=mild|cold|freezing` to force a reading, `&done=greenhouse` for "rover goes second").

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
- src/result/   Phase 6: Result.tsx, Sources.tsx, score.ts (score + badges), earth.ts (Back on Earth cards), result.css
- src/greenhouse/   Phase 5: Greenhouse.tsx, rules.ts (water/light rules), notes.ts, greenhouse.css (hub/OxygenPuzzle.tsx is the night puzzle)
- src/rover/   Phase 4: GarageTrip.tsx (zoom + gear choice around the trip), GarageCloseup.tsx + garage.css (the suit close-up), weather.ts (Jezero readings + gear rules), Rover.tsx, sites.ts (costs and caps), delay.ts (Earth-Mars delay), notes.ts
- src/storm/   Phase 3: Storm.tsx, donki.ts (live call + saved events), notes.ts
- src/hub/   Phase 2: Hub.tsx, Night.tsx, BaseArt.tsx (drawing), layout.ts (where things are), notes.ts
- src/cruise/, src/touchdown/   Phase 1 scenes (.tsx = beats + art, notes.ts = words, .css = art + animation)
- src/App.tsx   Play button, prologue, cruise, touchdown, the base hub, the job scenes, the night, the storm stand-in, the end stand-in

## Phase 7 – Judge Mode, balance, phone, polish

- **Judge Mode** (tick the box on the title screen, or open `?judge=1`): the random picks are fixed so a demo always plays the same.
  Cold-snap readings = the average one, crop = pepper, bonus rock = the delta foot, Earth message delay = 12 min, storm = the saved medium
  event (no live NASA call). A small "JUDGE MODE" pill shows on screen. Normal play stays random (never the same pick twice in a row).
- **Ending:** after the second job the boy walks onto a podium in his astronaut suit and the crew crowns him (bronze, silver or gold
  by score), with fireworks, confetti and a fanfare. Then the score screen. Preview it with `?scene=crown` (`&rich=1`, `&pen=N`).
- **Title screen** has a jump panel to open any scene (prologue … sources) for testing and demos.
- **Balance:** `src/sim/balance.ts` (a dev tool) tries every legal combination of choices with the real rules. Scores run about 13–37;
  the best plans score 29–37. Rock points were retuned to 4 / 6 / 7 so the far rocks are worth the extra power. Badges: gold ≥ 30,
  silver ≥ 25, else bronze. Run it: `npx rolldown src/sim/balance.ts --platform node --format esm -o /tmp/balance.mjs`, then replace
  `import.meta.env` with `({DEV:false})` and run it with node.
- **Phones:** tested in landscape with touch (812×375): the tablet shrinks on short screens, tags and buttons move out of the way.
  Held upright, a "turn your phone sideways" screen shows.
- **Demo video:** not included — record it yourself with Judge Mode on.


## Phase 8 – Menu, readable opening, Next/Back

- **Main menu** (`src/title/Title.tsx`): night field with Mars glowing, the launch site and the boy with his telescope. Start mission, How to play (3 cards), Settings, NASA data, Credits. The scene-jump panel only shows with Judge Mode on or `?dev=1`.
- **Settings** (`src/game/settings.ts`, saved in the browser): sound on/off, story speed (slower 0.75 / normal / faster 1.3: it scales the story clock in `useTimeline`), Judge mode. There is no voice-over.
- **Opening** (about 75 s in all): the original prologue is back as it was: 40 s in the field (sleeping, planet-or-star fact, planetary parade, loudspeaker, running), then 10 s at the rocket (ramp, door, liftoff), the 7 s trip with the stowaway, and a 7 s landing before the tablet tutorial. Notes are sized to be read (about 0.4 s a word plus a second), and the note text is bigger than before.
- **Next ▸ / ◂ Back** (`src/game/SceneNav.tsx`, `sceneStops.ts`, also the arrow keys) on the prologue, trip, landing and night. Next jumps to the next note, Back replays it.
- **Pipes puzzle:** Skip in the night scene used to skip it. Now Skip/Next stop at the puzzle, and the buttons hide while it is open.
- Dev: `?scene=prologue&at=40` etc. start a scene part-way.

### Phase 8b – note icons, in-game menu, rover "why"

- **◂ ▸ icons inside every note box**, in every scene. Story scenes (prologue, trip, landing, night): next note / read it again. Play scenes (hub, greenhouse, garage, rover, storm, crowning — including Mission Control): ▸ hides the note, ◂ shows the last one again; the scene clock is never moved there, so animations stay correct. The arrow keys still work. (`NavIcons` in `src/game/notes.tsx`; `SceneNav` is now keyboard only.) The bottom Back/Next pill is gone.
- **⚙ menu on every scene** (`src/menu/GameMenu.tsx`): pauses the story (`src/game/pause.ts`), with Resume, Settings (sound, story speed), Restart mission and Exit to main menu (both ask "Are you sure?").
- **Rover:** the goal now says where to go and why: tap a place on the map to send the rover for a rock; rocks from the old river delta may hold signs of ancient life (new fact card, source: NASA Science, "Two Perseverance Sampling Locations in Jezero's Delta"). Mission Control says "Go to the gold star!".
- **Longer flights:** the liftoff now flies for about 5 s, and the trip to Mars is about 15 s (3 s leaving Earth, the stowaway, then 5 s of the long curve with the months flipping).
- `src/game/nav.css` and `src/game/speech.ts` are no longer used and can be deleted.

## Phase 9: Junior Astronaut Test and the last shot

- After the crowning there is an optional **Junior Astronaut Test** (`src/result/JuniorTest.tsx`): the Commander offers 3 quick questions. Each uses a fact the player already met, shown with its source. Wrong answers just show the right one, nobody loses points. Finishing adds a "Junior Astronaut ★★☆" chip on the result screen. It is a game badge, not a real NASA program. It can be skipped.
- Flow: crown, test, result. The dev URL is `?scene=test`.

## Phase 9b: rover science missions, arrows only in story scenes

- **No more gold-star bonus.** Each game Mission Control asks for one kind of rock, with the real NASA reason
  (`MISSIONS` in `src/rover/sites.ts`, picked without repeats; dev `&rock=floor|foot|top`):
  - LAVA rock (crater floor): its crystals work like a clock, so it tells when the lake was there. Source: NASA Science, Perseverance science highlights.
  - LAKE MUD rock (delta foot): mud from a drying lake traps clues; Wildcat Ridge had the most organic matter of the mission. Source: NASA, Sept 15, 2022.
  - RIVER SAND rock (delta top): sand and rock bits the river carried from far outside the crater (Skinner Ridge). Source: NASA, Sept 15, 2022.
- The map no longer marks the right place. Each site shows its rock type in yellow, and the player matches it to the request.
  The needed rock is worth +2 (MISSION_POINTS, same value as the old bonus, so the balance is unchanged). Any other rock says
  "Good find, but the team still needs …", so a wrong pick still teaches.
- The Junior Astronaut Test's first question is now "Which Mars rock is best at keeping clues of ancient life?" (lake mud).
- The final grass shot was removed.
- **◂ ▸ icons only appear in story scenes** (prologue, cruise, landing, the night's story notes). Scenes where the player
  moves on by making a choice (greenhouse, garage, rover, storm, pipes puzzle, tablet, crowning) have no icons. Exception: the hub's first-visit story notes ("Two jobs today…", "The plants need water…") keep ◂ ▸, because they are read-along; the notes after you pick a room have none.

## Phase 9c: arrows in the rover, "Your choices" on the tablet, badge cut-offs

- **Rover ◂ ▸:** the rover's read-along boxes (intro, Earth's reply, Jezero and Opportunity facts, the hint, the "rock collected" box) have ◂ ▸.
  The three boxes that ask for a decision have none: the dust storm warning, "Message sent", and the science team's rock request (`noNav` on those notes).
  In this scene ▸ hides the box and ◂ brings the one before it back; the scene clock is never touched (`selfNav` in `NoteLayer`).
- **Your choices (the tablet):** `GameState.decisions` records every choice with its consequence (hub order, greenhouse water and light, garage heater, wait or go, each rover stop, storm shield).
  It is shown under the meters on the Crew Tablet in every Mars scene, newest on top of the view, and can be collapsed.
  A rover trip to the wrong rock gets an orange ✗ and a "WRONG ROCK" tag, and says which rock the team needed. The result screen's "What you chose" uses the same list.
- Delta top and Delta foot moved right a little on the rover map so the longer tablet never covers them.
- **Badges:** Gold 30+, Silver 25–29, Bronze under 25 (from the balance check). The result screen now shows the three cut-offs, which one you got,
  and how many points are missing for the next one.

### Phase 9d: more rover arrows, countdown sound

- ◂ ▸ now also on the "Message sent" box (the wait for Earth) and on the garage's "Just right!", "Cold Mars" and "Home safe" boxes.
  Still none on the three boxes that ask for a decision: the weather report (heater), the dust storm warning (wait or go),
  and the science team's rock request (where to drive).
- Countdown sound: while the rover waits for Earth's reply, a tick plays every second, higher and doubled for the last three, then the chime (`tick` in `gameAudio.ts`; silent when Sound is off).
- The science team's rock request ("Where is the LAVA rock?") now stays on screen until the player has chosen a destination and the rover reaches it.
  The Jezero and Opportunity facts and the hint come after the first rock, not before the choice.

## Phase 11: see the data

- **Radiation chart:** the storm's RadLab card now draws a line chart of the real hourly peak readings from Curiosity's RAD, 19–22 May 2024
  (`RADLAB_SERIES` in `src/storm/radlab.ts`, `RadChart.tsx`). It sits near 4 µGy/h, jumps to 304 when the storm arrives, then falls back.
- **Real eruption photo:** a NASA photo of a flare and CME (PIA21836) appears beside the forecast until the shield is picked. Its caption says it is a different storm.
  Hidden on short screens (phone held sideways); also listed on the Data Sources screen.
- **Egypt card:** a new "Back on Earth" card on desert farming in Egypt, sourced to NASA Earth Observatory.
- Two long notes were shortened (the "no forecast in time" radio call and the lettuce fact). The storm notes were narrowed so they do not touch the new photo card.
