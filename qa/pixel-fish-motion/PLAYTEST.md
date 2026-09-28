# Fish mass and motion verification — v32

- `npm run check`: pass.
- `npm test`: 554/554 pass.
- Six new regressions cover empirical mass correction, species articulation,
  fatigue, reduced motion, ballistic breach/re-entry at 60 fps and 10 fps,
  line-length conservation, non-jumping bottom fish, connected airborne mouth,
  and fixed ruler/head coordinates during live-catch movement.
- Existing small-rockfish immediate retrieval, long-fight, rod, focus, cast,
  tackle and landing tests remain green.
- CUA browser at 390×844: actual production game starts at 06:00 and reaches
  the harbour. No browser error logs.
- Local QA fixture imports production sprites, catch renderer, first-person
  renderer, fight response, line physics and rod-tip spring. It seeds fish near
  the surface to inspect rare events without changing normal encounter odds.
- 01-lingcod-mass.png and 02-lingcod-tail.png: 53 cm / 20.9 in,
  1.34 kg / 2.95 lb, body pixels differ between active frames while scale stays.
- 03-salmon-breach.png: model-driven apex, fish roughly 0.44 m above water,
  line mouth about 36 CSS px above surface entry, with water shadow.
- Fixture is explicitly local-only and excluded from the deployed `dist` folder.
  Screenshots show deterministic QA encounters, not a naturally encountered
  salmon or a ten-minute continuous public-site playthrough.
