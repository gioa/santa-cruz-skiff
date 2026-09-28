# Navigation gear / electric motor — v62

Three separate purchasable items: paper chart 35, GPS chartplotter 120, bow motor with battery 320 credits. Paper supplies chart layers only. GPS includes chart and position, but no motor propulsion. Equipped GPS + motor permits map-pin navigation; arrival switches to hold. Manual helm takeover cancels navigation. Removing GPS cancels route and stored-position hold; removing motor disables propulsion. Resume clears old motor commands. Existing combined chart ownership migrates to GPS without charging or gifting a motor. New paper saves remain paper.

Physics uses capped 245 N thrust through the existing hull/current/wind solver, including bow yaw moment. With no GPS, zero-ground-speed assistance has no stored-position target; GPS adds position feedback. Strong flow/wind may overwhelm finite thrust. Not a commercial autopilot accuracy claim. GPS speed is ground speed. No new battery consumption system.

Reference: [Minn Kota 55 lb Terrova](https://minnkota.johnsonoutdoors.com/us/shop/freshwater-trolling-motors/terrova/1358350), [manufacturer GPS navigation explanation](https://minnkota-help.johnsonoutdoors.com/hc/en-us/articles/23607178243991-Using-Advanced-GPS-Navigation-Features-and-Manual-2023-present). Controller gains are game tuning, not manufacturer performance data.

Validation: `npm run check`; `npm test` (674 tests). Added independent equipment combinations, legacy/new save migration, finite-force drift vs holding, overload drift, physical arrival and station holding, pause, manual override and equipment removal. Existing full trip and map compression tests use electric propulsion with realistic longer voyage duration.

Browser QA through CUA, local port 4196; 390×844 portrait and 844×390 landscape. Screenshots use synthetic QA profiles, not an earned player inventory. Local-only fixture copied production pixel-game.js, changed constructor to omit saved state, prepended syncVessel import, and appended fixture.js. Temporary QA HTML/JS removed before release.

- shop.png: actual UI purchases paper (35), GPS (120), motor (320); 1000 → 525.
- paper-chart.png: chart, seabed, depths; no own-position control or navigation.
- gps-chart.png: position marker/control; no navigation without motor.
- gps-motor-pin.png: actual touchscreen-selected ocean pin and enabled route button.
- motor-navigation.png: actual route started, neutral outboard; later observed 21 m of physics movement with electric motor 82.7 N, engine false, throttle 0.
- motor-hold.png: stop navigation, enable GPS station holding with propeller button.
- motor-landscape.png: all three icon controls visible without overlap.
- motor-without-gps.png: independent drift assistance enabled, no GPS/speed readout.

Browser console: no errors during combined-device navigation/holding QA. Screenshots are local fixture evidence, not a screenshot claim about a user's production save.
