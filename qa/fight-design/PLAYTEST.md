# Approved reel design integration — pixel v49

Cause: the earlier reel-touch implementation remained uncommitted in the shared
working copy, so none of its UI appeared on the public release. Its generic arm
renderer and smaller tackle geometry also diverged from the approved concept.
`concept.html` preserves that original interactive drawing for comparison.

Implemented:
- The concept's close sleeve/palm silhouettes follow the real rear-grip and
  rotating handle endpoints. Rod pose, load, spool motion and line entry still
  come from the simulation; the design's fake fish-load animation is not used.
- Match portrait horizon, low gunwale, reel scale and rear-grip composition;
  shorten the composition in landscape. Keep surface fish at physical scale.
- Left thumb uses the vertical drag slider: up tightens, down loosens. Taps and
  drags follow the actual track bounds, with qualitative feedback, not tension
  numbers. Right thumb holds or circles the visible reel to wind; release stops.
- The old duplicate reel panel is absent during focus. Free spool is unavailable
  during a fight through both UI and simulation; ordinary lowering is unchanged.
- Import and CSS versions are updated together to avoid stale public controls.

Validation:
- `npm run check` passed. `npm test`: 611 passed, 0 failed.
- Includes simultaneous independent reel/drag pointers, cancellation and phase
  resets, full slider travel/taps, reel hit area, rear-grip geometry, line/rod
  linkage, unchanged fish physics and species surface scale.
- Browser checks at 390x844, 320x568, 844x390; no errors/warnings.
- Actual drag changed .48 to .790545734; a clockwise gesture reduced paid line
  from 24 m to 23.866685686 m and advanced crank 1.310771619 radians. After release
  crank rate was zero.
- Normal game entry loads and starts at the wharf without errors.
- Screenshots 01-phone.png, 02-narrow.png and 03-landscape.png show the real shipped
  rendering/control modules in an explicitly labelled local fish fixture, not a
  naturally caught fish or a full fishing trip. The QA fixture and concept are
  outside dist and are not included in the public site. Physical iPhone Safari
  multitouch was not directly tested; independent touch pointers are unit tested.
