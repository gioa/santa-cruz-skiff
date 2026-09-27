# Pixel edition validation

Gameplay build: `20260927-pixel-v2`, commit `c6a898b`. Short-landscape CSS revision: `20260927-pixel-css-v3`, commit `7b936b6` (no simulation changes).

## Automated checks

`npm run check` passed. All **76 tests passed**, including 13 new pixel-model tests. They cover the complete walking/hoist/board/sail/fish/return/trade/equip journey, bait persistence and cancellation, overboard swimming/reboarding, interrupted save recovery, momentary mobile input, carried gear and safe destinations. These model tests advance synthetic time; they are separate from the browser run below.

The initial browser pass revealed assisted walking cutting across a tiny notch at the stair connector. The fix uses exact route vertices, closer clearance sampling, and stops assistance at an unexpected unsafe step. Regression sweeps covered 32 frame-rate and counter-approach combinations, with formal tests also leaving the player still at the landing for 60 seconds.

## Actual browser run

The final gameplay run used normal visible controls and equivalent validated page-scoped player tools. **No time skips, teleports, forced bites, injected catches, or recovery shortcuts** were used for the trip. The world runs at 1:1 active time; menus pause it. The browser run exceeded 10 minutes before landing its first fish.

Observed milestones:

- Began at 06:00, near the hut. Walked to the counter, packed the free gear, requested the 24-second davit lowering, and reached the left-side landing safely (46 active seconds).
- Boarded and unmoored. Used the chart to navigate around the actual wharf outline to the nearshore destination. Normal speed was around 5.4–5.6 knots.
- Dragged the visible joystick while underway. Manual input cleared the assisted route; releasing returned throttle to zero while the hull retained momentum. Re-selected the destination normally.
- Arrived and stopped the engine; anchored at the nearshore destination. Travel covered roughly 1.07 km because the route passes around the wharf, even though straight-line distance is shorter.
- Began a cast, rotated the viewport, and verified cancellation with all 12 squid baits still present. Cast normally afterward; stock decreased to 11.
- Waited for a natural bite, struck it, and reeled a **60 cm / 3.41 kg California halibut**. The fight lasted **134 seconds**. It landed at **687 active seconds (11:27)**. The catch modal paused the simulation.
- Kept the fish; credits remained 100 until a later counter trade. Entered the water through the boat action menu, observed PFD buoyancy at approximately y=0.24 m, swam to the stern ladder, and reboarded with gear/catch intact. Selected normal return navigation at 704 seconds.

- Returned and docked normally, walked back to the counter, and exchanged the halibut for 74 credits. Final state was 06:22:50, 1,370 active seconds, 2,208 geographic metres sailed and 174 credits. The complete state and wall timestamps are recorded in `browser-run.json`.

## Responsive and visual verification

Browser viewport sizes checked: **390×844**, **320×568**, **844×390**, **568×320**, and **1280×720**. This is desktop browser viewport testing, not a claim of physical iOS/Android hardware testing.

- All visible action buttons in the measured 320px and 568px gameplay layouts had at least 44×44 CSS-pixel targets and remained inside the viewport.
- Portrait has independent thumb areas; native equipment selectors use 16px text to avoid iOS focus zoom. Modals scroll within the viewport.
- Actual gameplay screenshots show holding the tiller, the articulated pixel rod/line, float, wake and fishing UI.
- The first short-landscape fight panel obscured the boat. CSS revision v3 moves it into the bottom center. An **explicit static visual fixture** using the same HTML/CSS/renderer verified a visible boat and no clipped buttons at 568×320. Screenshot `08-short-landscape-layout-fixture.png` is a layout fixture, **not evidence of actual gameplay progression**. The temporary fixture was removed before deployment.
- Browser frame readings during the actual run were approximately 60 fps on this host. No physical-phone frame-rate claim is made.

Screenshots `01`–`07` are captured from the actual game. Deployment/public smoke evidence and final results follow in the saved run record.
