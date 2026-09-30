# Shore wave and tackle visuals

The overhead and first-person views now share water-contact sampling. Carolina and fish-finder rigs have no bobber: the line enters the water before reaching the submerged tackle, bows with flow and tightens with tension, while the waiting rod responds to the simulation's load. Only equipped float rigs show a bobber following wave height and flow. Horizontal drift remains owned by the simulation.

Browser verification used the actual game pages with a test-only module route. Both beaches passed explicit no-bobber and submerged-tackle checks for Carolina and fish-finder rigs, plus crest/trough, float/bottom, calm-water, reduced-motion and state-immutability checks at 390×844, 320×568, 844×390 and 1440×1000. Pacifica's pier was checked separately. No browser errors were recorded. Results are in `results.json`; `*-bottom-overhead.png` and `*-bottom-fight.png` show normal shore rigs, alongside float-specific and desktop examples.

Reproduce from the repository root:

```sh
node scripts/serve.mjs . 4213
PLAYWRIGHT_MODULE=/path/to/playwright node qa/shore-wave-tackle/playtest.mjs
```

Set `SHORE_QA_URL` to another server's `/dist/` URL if needed. The test fixture is never imported by the production game.
