# Clear nearby boat — v66

Root cause: daily fog, cloud and dawn color fills were composited over the whole finished frame, washing out the nearby boat/angler/rod. Split weather rendering into atmosphere and rain passes. Overhead atmosphere draws before the player boat, davit foreground, patrol and player; first-person atmosphere draws before the skiff and tackle. Rain remains last. Existing default all-layer overlay behavior remains compatible. No weather probability, physics, capsize or inventory changes.

QA: npm run check; npm test — 696 passing. Phone 390×844 before/after screenshots use identical static morning fog=.7, cloud=.7, dawn=.3, boat pose, and zero bilge water, ruling out flooding as the cause. Baseline world renderer from v65 vs v66. First-person render also inspected; console errors none. Paused synthetic fixture hides interactive console by design. Local-only QA files removed from dist before release; fixture.js documents setup.
