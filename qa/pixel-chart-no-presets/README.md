# Chart without preset destinations (v71)

Removed the four numbered chart markers and their four inspect/navigate shortcut rows. Removed their WebMCP destination enum as well. Player-selected markers, underlying geography/depth/substrate, GPS position, route planning and the dock-return control remain available under the same equipment rules.

Validation: npm run check and 702 tests. Browser QA at 390×844: no preset marker circles or shortcut rows; current-position arrow and return-dock control visible; tapping the chart produced a custom marker and a sand / 62 ft readout. Ashore navigation correctly required renting/launching the boat. No console errors. chart.png captures the result; fixture.js seeds isolated local equipment for QA. Temporary dist fixtures removed before publication.
