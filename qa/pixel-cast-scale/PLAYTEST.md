# 15-foot hull and casting scale — v36

Validated 2026-09-27.

## Calibration

The old hull occupied 77 sprite pixels × 0.18 metres = 13.86 m (45.47 ft) in the world, while casts and paid line used actual metres. The hull is now exactly 15 ft (4.572 m), bow to transom, excluding the outboard. Stored, launching and afloat rentals share the calibration, as do hull shadows and wake origins. The vessel physics length uses the same constant. Rod artwork uses the model's 2.1 m rod length.

The offshore camera can now zoom to 18 logical pixels/metre so phone boats remain legible. A long cast zooms out with both hull and water targets at one scale. Geographic coordinates, target conversion, range limits, seabed lookup and paid-line accounting are not rescaled.

## Verification

- `npm run check`: passed.
- `npm test`: 562 / 562 passed.
- Added screen→world→screen ratio tests at 3, 6, 12 and 18 zoom, three headings, phone portrait and landscape. One, two and four hull lengths resolve to 15, 30 and 60 feet within pixel-rounding tolerance.
- A 30 ft cast keeps its 2:1 cast-distance/hull-length ratio through projection and zoom. Paid line equals rod-tip-to-lure 3D separation plus the existing small payout allowance at splashdown.
- 390×844 local fixture, actual renderer and simulation: 30 ft landed two hull lengths away (26.4 ft paid at splashdown); 60 ft landed four hull lengths away (55.7 ft paid). The difference is due to the rod tip extending out from the boat, including its height above the water.
- Complete game from isolated offshore save: clicked approximately two hull lengths left of the boat; flight, sinking, subsequent payout and reel controls remained functional. Observed hull length 4.572 m / 97.83 CSS pixels. The line then extended as the sinker sank, reaching 33.1 ft in the captured frame.
- Existing short-screen camera-clearance, stable framing, casting constraints, consumables, reeling, wake and boat-control regressions passed.

`index.html` is an explicitly labelled local fixture that freezes at splashdown for ruler comparison. `start.html` seeds only localhost:4186 storage for the full game test. Neither fixture is in the public game build.
