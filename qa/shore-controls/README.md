# Shore controls browser checks

Run a static server at the repository root (`node scripts/serve.mjs . 4213`) and then:

```sh
node qa/shore-controls/hold-controls-playtest.mjs
node qa/shore-controls/fight-playtest.mjs
node qa/shore-controls/camera-playtest.mjs
node qa/shore-controls/scale-playtest.mjs
node qa/shore-controls/interaction-playtest.mjs
```

Set `PLAYWRIGHT_MODULE` to an installed Playwright module path if it is not on the normal module search path. Set `SHORE_QA_URL` to change the served `dist/` URL. The scripts use headless Chrome and write their results beside the script.

- Historical tap-control `results.json`: real keyboard/pointer controls at Pacifica, Half Moon Bay and Benicia, physical cast windup/release, bounded reel clicks and F presses, slow/fast click cadence, stopped holds/autorepeat, twitch, one-canvas fight transition, mechanical reel movement and removed posture/speed controls, absence of numeric gauges, control contrast and hook labels, phone/landscape/desktop bounds and pause behavior.
- `fight-results.json`: actual simulated jacksmelt ascent, ballistic surface jump, splash and landing at both beaches; Chinook raised and landed beside Benicia's deep pier; attached line and no float for a Carolina rig.
- `camera-results.json`: 36 scene/viewport/direction/phase combinations keep the angler, rod tip, line entry and visible fish clear of controls and HUD, including a phone safe-area offset.
- `scale-results.json`: consistent human/rod/cast scale at all three destinations, with close walking and near/far Carolina-rig views.
- `interaction-results.json`: physical conversation reach and rendered torso clicks on the bank and elevated pier, plus fresh-arrival shop access at both beaches.
- `hold-controls-review.json`: current single-button press/lift, hold/wind, release/lower controls and post-cast left/right drag/action layout, including pointer and keyboard cancellation plus phone/landscape/desktop visual inspection.
- `classic-proportions-review.json` and `classic-proportions-*.png`: visual gate for the restored pre-scale artwork, recorded before the later switch to held reeling. Covers original-sized actors and props, actual arrivals and successful short/full casts, fish, safe action framing, retained tap controls and real controller reel clicks across all three scenes at phone/desktop sizes. Short casts use modest effort to clear the original shore setback; a zero-effort five-metre lob can correctly land on dry sand.
- Historical `visual-repair-review.json` and `visual-repair-*.png`: 24 conditions across all three destinations at 390×844 and 1440×900, saved as 18 full-resolution images. Arrival images use the actual fresh game position; short/full casts and near-fish images use explicit fishing fixtures. Cast pairs are saved side by side. The gate records eight production-source hashes, rejects source changes during capture, and checks the angler, rod, line entry and visible fish against the safe area between controls. This records the superseded metric presentation. Review current images themselves for composition, prop scale, release alignment, shadow placement and occlusion; geometric checks alone do not establish visual quality.
- PNGs record the corresponding UI and physical events. Small jacksmelt jumps remain subtle at the world's scale; the model does not inflate their airborne height for screenshots.

Test-only route instrumentation exposes the real simulator and world renderer to the browser fixture. It positions the angler, equips a mounted rig, supplies a known bite and selects a vigorous individual. Motion, cast flight, retrieval, jumps and landing then run through the production simulation. The fixture and accelerated stepping are never added to the shipped controller. These are deterministic mechanics checks, not measurements of natural bite or jump frequency.
