# v41 — Directional wake and explicit rod handling

Verified 2026-09-27 against the production application at localhost:4191, isolated from production saves.

## Rod UI / handling
- 390×844 mobile: resumed with two purchased/owned rods. Selector listed only those two rods. Default showed the active rod name and 手持, and the overhead angler visibly held the rod.
- Selected 轻型敏感船竿 (its new assembly had no bait), put it in the port holder, saw 左舷竿架. Selected 掌舵 then 拿竿: rod returned to hand, selected name unchanged.
- Tapped open water with empty bait: operation showed the missing-bait message. Holding, switching, mounting and the cast/down controls remained available before that attempt. Actual cast did not consume stock or deploy an unbaited rig.
- Switching from driving to a holder rod returns to neutral and queues pickup until the boat is below the existing safe handover speed. Returning to helm cancels that pending handover. Casting/fighting cannot switch assemblies.

## Wake
- Accelerated the actual game vessel to full forward power: progressively stronger hull crests and separate central propeller wash.
- Applied 0.3 tiller at speed: existing crests remained in world space, leaving the curved trail shown in 05-turning-wake.png.
- Returned to neutral: no new powered propeller foam; speed-driven hull crests continued while coasting and faded with age.
- Pure simulation checks additionally cover reverse bow-trailing displacement, reverse stern prop wash, motor steering angle, frame-rate consistency, paused particles, resets/teleports and bounded history.

Syntax check passed; 574 tests passed. No browser console errors.

Evidence: 01-hand-rod.png, 02-port-holder.png, 03-empty-bait-cast.png, 04-fast-wake.png, 05-turning-wake.png.
