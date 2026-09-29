# Shore fishing verification

Verified locally on 2026-09-28 against the unbundled source (`node scripts/serve.mjs dist 4198`). Not published.

- `npm run check` and `npm test` pass, including:
  - the fish-population engine;
  - shore technique statistics;
  - shore rules and the warden;
  - the pier patrol;
  - the build.
- `node qa/shore-ecology/playtest.mjs` passed both beaches with no page errors:
  - ordinary pointer and keyboard casting (short tap, held charge, no duplicate casts, blur cancel, dry-land misses);
  - discovery without shortcut buttons or arrival dialogs;
  - four viewports (320×568, 390×844, 844×390, 1440×1000);
  - menus pausing the beach and its fish;
  - calm versus rough tackle stability;
  - a real surfperch school finding, inspecting and taking the bait, then the UI strike and first-person fight.
- **Pier (Pacifica):** walking up to the closed gate opens nothing, and a brief push does nothing. Leaning on the gate for about 1.2 s slips the angler onto the pier with no warning or cue. The toast is only "你从围栏的缝隙挤上了旧栈桥。"
  - `pacifica-discovery-gate.png` shows the gate.
  - `pacifica-discovery-pier.png` shows the angler on the deck.
- The script's test-only response route can empty the beach of fish (so the 30-second UI checks are not about luck) or place a school beside the bait. It never forces a bite phase, species or size.

Strategy calibration for the population model is in `reports/shore-population-calibration.json` and summarised in `docs/fish-population-model.md`. The older hazard-budget calibration and its script were retired with that model.
