# Shore controls browser checks

Run a static server at the repository root (`node scripts/serve.mjs . 4213`) and then:

```sh
node qa/shore-controls/playtest.mjs
node qa/shore-controls/fight-playtest.mjs
node qa/shore-controls/camera-playtest.mjs
```

Set `PLAYWRIGHT_MODULE` to an installed Playwright module path if it is not on the normal module search path. Set `SHORE_QA_URL` to change the served `dist/` URL. The scripts use headless Chrome and write their results beside the script.

- `results.json`: real keyboard/pointer controls at Pacifica, Half Moon Bay and Benicia, cast preview/release, winding, twitch, gradual retrieve toggle, one-canvas fight transition, control contrast and hook labels, phone/landscape/desktop bounds and pause behavior.
- `fight-results.json`: actual simulated jacksmelt ascent, ballistic surface jump, splash and landing at both beaches; Chinook raised and landed beside Benicia's deep pier; attached line and no float for a Carolina rig.
- `camera-results.json`: 36 scene/viewport/direction/phase combinations keep the angler, rod tip, line entry and visible fish clear of controls and HUD, including a phone safe-area offset.
- PNGs record the corresponding UI and physical events. Small jacksmelt jumps remain subtle at the world's scale; the model does not inflate their airborne height for screenshots.

Test-only route instrumentation exposes the real simulator and world renderer to the browser fixture. It positions the angler, equips a mounted rig, supplies a known bite and selects a vigorous individual. Motion, cast flight, retrieval, jumps and landing then run through the production simulation. The fixture and accelerated stepping are never added to the shipped controller. These are deterministic mechanics checks, not measurements of natural bite or jump frequency.
