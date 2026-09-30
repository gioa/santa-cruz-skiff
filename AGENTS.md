# Shore fishing rigs

The user emphasized on 2026-09-29 that most fishing rigs have no bobber. Treat bottom rigs (including Carolina and fish-finder) as the normal shore-fishing case. Only an equipped float rig should show a bobber or float-specific dipping and leaning. Determine this from the mounted rig, not stale presentation state.

For rigs without a float, show wave interaction through rod load, line sag/tension, the line's water entry and simulated underwater drift/holding. Do not depict the submerged sinker or bait as a floating object. Keep documentation and demos representative of these rigs rather than centering every interaction on a bobber.

# Physical controls and scale

The user emphasized on 2026-09-29 that controls should feel realistic, with feedback from physical motion instead of excessive numbers. In shore and bank gameplay, communicate load through rod bend and line behavior, winding through the reel handle, and actual drag payout through the spool and sound. Avoid live percentages, tension gauges, exact distance/depth counters and predicted landing markers. Keep meaningful equipment markings such as hook numbers and weights, and catch measurements in their appropriate views.

The user explicitly rejected the metric visual proportions on 2026-09-29 and requested the previous proportions. Restore and preserve the authored pixel-art character, prop and fish sizes plus the broad walking camera from before commit 8fde17f. The physics model may keep metre-based calculations, but do not force its physical sizes onto the artwork or reintroduce the metric close-up. Keep casting, retrieving and fighting in the same continuous shore scene.

The user's latest control instruction on 2026-09-29 replaces both tap-cadence and separate reel/twitch controls: use one right-side button. Pressing raises the rod; a short press is a lift, holding starts sustained winding, and release stops winding and lowers the rod. At a bite the same press sets the hook. F and focused Space/Enter use the same gesture. Do not show a separate twitch action, posture panel or reel-speed slider. Drag appears only after casting, on the left. Cancellation, focus loss, menus and page changes must clear the gesture. Preserve simultaneous left-thumb drag adjustment while the right pointer stays held.

The user reported on 2026-09-29 that the metric correction ruined the scene. Preserve the requested original coastal composition: do not fill a desktop with a twelve-metre close-up, or magnify low-resolution cached terrain into giant blocks. Render close scenery with enough detail, keep nearby shoreline context, and inspect actual arrival/cast/fight screenshots on phone and desktop before publishing visual changes. Automated geometry checks alone do not establish visual quality.

# Shared daily fishing conditions

The user requested on 2026-09-30 that daily randomness be a deterministic function of date and time, so players have similar daily opportunities. Shore gameplay uses the real California date/time for the public environment. School availability must also be spatially deterministic: do not seed a player-specific sequential RNG and call that a shared world. Keep individual bait attraction, disturbance, landed fish and equipment effects local. Preserve personal progress when migrating old saves, and do not fast-forward active casts or fights on resume. Accelerated catch-rate reports must run the actual natural encounter and landing model, distinguish bites from landed catches, disclose date/time/gear/locations/session duration, and never inject fish or reset bait condition to manufacture success.
