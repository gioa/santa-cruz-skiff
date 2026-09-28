# Shore first-person fights — coast-7

Pacifica and Half Moon Bay switch to the shared close-hand/rod presentation on a successful strike, keep the camera through the catch decision, and restore overhead walking after release, keep, break, escape, or a pier inspection. Settings and loss of focus pause the fight without exiting the view.

The new renderer reads existing simulation state. Its authored perspective samples the same coastal depth and breaking-wave field as the overhead scene. Pacifica retains grey/black sand, Half Moon Bay lighter sand, and Pacifica's pier uses concrete and railing. The shared tackle drawing accepts an optional spinning reel for the shore kits; Santa Cruz keeps its existing conventional reel. Fish are not rendered through opaque water; the existing catch panel shows the landed fish.

Validation:

- Full clean release suite: 786/786 passed before the final rotor continuity fix; the 28 focused shore/shared renderer tests passed after it (one added regression).
- Both scenes at 390×844, 320×568, 844×390, and 1440×1000: controls within screen, no horizontal overflow, canvas/world switching, pause, keyboard reel, menu, catch release, and break exit.
- Pacifica pier: concrete/rail view and immediate inspection ejection to overhead.
- Natural Half Moon Bay play: real walk, cast, wait for bite, strike, pointer-controlled tension fight, keep catch, return overhead. No fixture invocation; fight took about 42 seconds.
- Browser console errors: none.

`fixture.js` is appended by the local Playwright route only; production never imports it. Screenshots suppress transient toast text and the pause dimmer for visual inspection.

Reproduce with a local server serving `dist` on port 4197 and Playwright installed:

```sh
node qa/shore-first-person/playtest.mjs
node qa/shore-first-person/playtest.mjs --natural
```

Set `PLAYWRIGHT_MODULE` to a Playwright installation if it is not available in the local package resolution path. Chrome is used for the run. `--natural --public` runs the natural flow against the deployed site without intercepting the game module.
