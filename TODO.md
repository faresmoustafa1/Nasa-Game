# TODO: things not verified yet

Nothing here is shown to players as fact until it is checked.

## Fact cards (src/data/facts.json, all `checked: false`)
Each needs its official NASA page opened, the wording checked, and
`source_url` + `source_date` filled in:
- [ ] sol-length: 24 h 39 min (science.nasa.gov/mars/facts/)
- [ ] trip-length: "about 6 to 9 months" (needs a NASA page)
- [ ] insight-dust: InSight stopped because of dust on its panels (2022)
- [ ] flare-classes: C, M, X, each 10 times stronger
- [ ] donki-flare: filled from a real DONKI record in Step 5
- [ ] veggie-lettuce: astronauts ate space-grown lettuce (2015)
- [ ] moxie-oxygen: MOXIE made oxygen from Mars air
- [ ] signal-delay: 3 to 22 minutes one way
- [ ] opportunity-storm: 2018 storm, Opportunity went silent

## NASA endpoints (src/data/sources.json, all "not checked")
Read the official docs before writing any fetch code (Step 5):
- [ ] DONKI FLR / CME on api.nasa.gov: exact path, params, CORS
- [ ] APOD on api.nasa.gov: exact path, params, CORS
- [ ] OSDR: which public API, if any, works from a browser
- [ ] Earth–Mars distance: JPL Horizons API (likely no CORS → compute from orbits instead?)
- [ ] NASA Image and Video Library search API
- [ ] Mars Rover Photos API: still running?
- [ ] Mars weather: confirm there is no live public API (InSight ended 2022)
- [ ] DEMO_KEY rate limits

## Game rules
- [ ] Ask Earth wait is GAME-SIZED (10 s). Step 5: show today's real
      Earth–Mars delay next to it.
- [ ] Days 4-7 play with the generic loop. Step 7 adds the late-message
      choice (trust old advice or decide) and the storm finale polish.
- [ ] "Mars nights are very cold" in the Day Report: add a real temperature
      value with a source in Step 5.

## Game text
- [ ] Reading-level pass on days.json (grade 2–4, ≤ 12 words a sentence)
