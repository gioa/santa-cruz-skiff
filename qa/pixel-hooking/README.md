# Species-aware hooking and drag visibility — v17

Validated 2026-09-27 at `http://localhost:4177/?edition=pixel`, 390 × 844 viewport, using the actual game UI and its player-action WebMCP tools. No fish spawning, time jumps, state injection, or teleporting was used for this browser run.

- Resumed the test profile, boarded, unmoored, and lowered the starter bottom rig beside the boat.
- During sinking/waiting the reel and spool controls were available, with no drag control (`01`).
- A natural bite entered first person while drag remained absent (`02`).
- Started ordinary reeling, without invoking the hook/strike action. The line tightened and automatically seated the hook. Drag appeared only in the fight (`03`).
- Landed a 51 cm, 2.2 kg California halibut after 58 active seconds of retrieval (`04`), then used the normal release action. Drag disappeared and ordinary boat/tackle actions returned.
- Opened the rod workbench: independent assembly slots remained available, with no drag slider or offshore shop tab (`05`).
- No browser console errors were reported during the run. `local-state.json` records the post-release menu state and catch record.

Automated validation: JavaScript syntax checks and all 389 tests passed. New coverage includes reel-only small-rockfish landing without exhaustion, no universal nine-second failure, no hookup from elapsed time/free spool, physical slack take-up even for the optional seating button, species-dependent bait rejection, holder hookups, sustained slack/overload retention, frame-rate invariance, and cancellation of hidden drag gestures.

Evidence and calibrated-model boundaries are recorded in `docs/pixel-hooking-evidence.md`. None of the game's loss-rate coefficients are presented as measured Santa Cruz species percentages.
