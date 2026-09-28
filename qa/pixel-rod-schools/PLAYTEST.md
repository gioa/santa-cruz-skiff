# v30 validation — 2026-09-27

- `npm run check`: passed.
- `npm test`: 543 passed, zero failed (15 new behavioural/integration tests).
- Real 390 × 844 browser viewport; local QA page uses production simulation and renderers with explicit seeded fish and schools, no production-save changes.
- Small rockfish, salmon, fast light rod and moderate boat rod exercised; the running simulator emitted changing tip coordinates/elastic deflection. Pause freezes the same tip state exactly (`browser-checks.json`).
- Random group pair observed: radius 7.6/5.3 m, density .55/.77, neither accompanied; next pair 16.1/6.7 m, density .49/.46, the smaller group accompanied by two white seabass. Screenshots capture genuine renderer output.
- Normal app entered the dock from intro; no browser warnings/errors.
- Automated checks cover species/size differences, rod action/power, slack/free-spool/fatigue attenuation, timestep stability, reset/pause, attached line geometry, variable groups, seasonal attendance, depth/distance falloff, presentation penalties, actual simulation wiring and defensive snapshots.

Screenshots: `01-salmon-fast-rod.jpg`, `02-mixed-schools.jpg`, `03-moderate-rod.jpg`. These are labelled QA scenes, not claims of naturally waiting for a rare salmon encounter.
