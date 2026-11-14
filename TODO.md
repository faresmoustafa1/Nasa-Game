# TODO: things not verified yet

Nothing here is shown to players as fact until it is checked.

## Real NASA data
- [x] All 15 fact cards checked against NASA pages (facts.json: source_url,
      source_date, evidence, checked_on 2026-11-14).
- [x] Saved: InSight weather, RadLab MSL-RAD, OSDR studies.
- [ ] **Saved DONKI flares + APOD: blocked.** DEMO_KEY hit its limit
      (HTTP 429, 10 calls/day). Run `NASA_API_KEY=… npm run fetch-nasa` with a
      free key from https://api.nasa.gov/. Until then the flare is labelled
      GAME EXAMPLE and the "real flare" card is hidden.
- [ ] The direct CCMC DONKI service (kauai.ccmc.gsfc.nasa.gov) timed out from
      this network; the game uses api.nasa.gov instead.
- [ ] RadLab has Curiosity data from the Mars surface only (no cruise data).

## Game rules
- [ ] Ask Earth wait is GAME-SIZED (10 s). Step 5: show today's real
      Earth–Mars delay next to it.
- [ ] Days 4-7 play with the generic loop. Step 7 adds the late-message
      choice (trust old advice or decide) and the storm finale polish.
- [ ] "Mars nights are very cold" in the Day Report: add a real temperature
      value with a source in Step 5.

## Map + alert
- [ ] Movement was tested with keys, tap-to-walk, Space at a door and the
      joystick, but only with the browser pane mostly hidden: check that
      walking looks smooth on a real phone and tablet.
- [ ] The balance checker plays alert fixes but not normal room actions
      during the alert (they only help, so the check is on the safe side).
- [ ] Alert texts (alerts.json) need the same reading-level pass as days.json.

## Game text
- [ ] Reading-level pass on days.json (grade 2–4, ≤ 12 words a sentence)
