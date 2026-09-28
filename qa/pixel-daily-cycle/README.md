# Daily weather and closure cycle — v63

- Game clock 5×; input, fishing and ten-second transition stay in real active seconds. Offshore map compression remains 1:2.
- Daily season-aware seeded weather: morning marine fog, cloud/sun or seasonal rain, afternoon sea breeze, smooth gusts, independent swell direction/period and local wind chop. Weather is a game approximation, explicitly not a live forecast. Current observations retain their existing separate source/availability rules.
- Wind feeds hull forces; combined swell/chop feed four-point hull sampling for heave/pitch/roll. Physical heave also moves the rod tip. Wave height affects existing line/slack/snags. Ocean, rain/fog/cloud overlays, first-person view and surf mix use the same conditions.
- 17:00 / 17:30 return notices. 18:00 closure. Still aboard/offshore costs 50 virtual credits once; insufficient balance becomes tow debt. Returning ashore avoids fee. Forced landing still performs the normal eight-second fish inspection, with no illegal-fish sales loophole.
- 10 active seconds: covered cut to harbor → reverse hoist → night → dawn. Boat ends on its assigned rack; next local calendar day begins 06:00 with new weather and unpaid rental. Equipment and catches persist. DST handled by local-date arithmetic.
- Modern saves keep day/time/weather and fees across reload and both start buttons. Interrupted transition restarts its presentation without charging again. Legacy saves migrate at 06:00. Menus/background pause simulation as before.

References for qualitative behavior, not exact random probabilities or calibrated wave spectra:
- https://forecast.weather.gov/MapClick.php?FcstType=text&lat=36.8&lg=english&lon=-121.82 (Monterey Bay wind, fog, independent swell/wind waves)
- https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp7/CPB7_C06_WEB.pdf (Monterey Bay fog and shelter)

Validation: npm run check; npm test — 679 passing tests. Tests cover 5× timestamps, pause, daily weather bounds/smoothness, physical drift and wave response, all closure phases, no fee ashore, debt repayment, reload idempotence, rental reset, illegal cargo inspection and spring/fall DST transitions. Legacy rental tests now explicitly remove the new day-cycle marker.

Screenshots are local synthetic QA fixtures, not an earned user save. QA controls are visibly labeled and never shipped. fixture.js records test setup; local QA HTML/JS removed before release. Actual full transition was run unpaused and inspected through WebMCP: day 1 at 18:00 / 100 → 50 credits; day 2 at 06:00, stored boat, rentalPaid false, newly generated weather. Selected hoist/night frames were frozen through local QA controls for review. 390×844 phone viewport; landscape also inspected. Console errors: none in normal cycle/weather scenes.
