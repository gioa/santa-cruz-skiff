# v51 controlled short pitching

Diagnosis: the underwater cast and vertical-drop paths already use the same
line/sinker solver. In still water the 85 g bottom rig sinks at 0.78 m/s in
both cases. Diagonal line needs LESS additional payout per second than a vertical
line. The large rate was airborne: the v47 60-degree lob to 22 m reached roughly
10.58 m above water and 13.98 m/s peak line payout. Lengthening that lob's duration
raised its apex/launch speed; it did not fix the excessively strong cast.

Use a 30-degree short underhand pitch. Default center-to-landing ranges are
bottom 7 m, slider/jig 8 m, float/dropper/sabiki/feather40 5 m; rod/weight adjust
within 4–8 m. This intentionally replaces the old long-cast reach. Far taps use
the reachable point on the requested bearing; actual line length and landing
position follow that physical trajectory. Boat size and geographic mapping are
unchanged. Both flight and line remain gravity-consistent; neither a slowed line
counter nor artificial hovering is used. Airborne payout is still faster than
underwater sinking, which is appropriate for two different phases.

Controlled comparison: bottom rig, boat at origin heading north, tap 22 m east,
1/120 s steps. New landing 7 m (22.97 ft) from boat, flight 1.050 s, apex 2.731 m
(8.96 ft above water), peak payout 7.736 m/s (25.38 ft/s), paid at splash 6.061 m
(19.88 ft) measured from the rod tip, not boat center. These are simulation
calibration values, not measured tackle specifications.

Validation: npm run check passed; 613 tests passed. Coverage includes all rig
profiles with default/heavy sinkers, close/far target limits, peak payout/apex,
real gravity, exact geometric line length, frame-rate independence, obstacles,
bait consumption, retrieval and airborne-to-water transition. New comparison
runs cast and vertical drop for 10 seconds with still water and uniform current
for bottom, jig and 4/0 feather rigs; underwater depth tracks within 0.04 m and
cast payout never exceeds the vertical-drop peak beyond the test tolerance.
The existing geographic scale check now uses an in-range 20 ft pitch. No
physical-phone playtest in this update; this change is numerical physics/range.
