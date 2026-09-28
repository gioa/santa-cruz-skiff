# Boarding labels clear the launch animation — v38

Validated 2026-09-27.

- World-action placement reserves the complete rack-to-water boat path, lifted hull, crane and rigging area with a 12 CSS-pixel margin, rather than chasing only the current boat frame.
- The same exclusion applies to 登船平台, 等候吊艇 and 登船. Boat/platform clicks remain available. In an exceptionally cramped viewport with no clear location, an obstructing label is hidden rather than painted over the animation.
- The layout search now considers obstacle/viewport edges as well as nearby offsets, allowing it to use clear space farther than 100 px away.
- Actual 390×844 complete game: start → walk to counter → pay → walk to boarding → watch the 24-second launch. Captured 等候吊艇 at 60% with the boat and crane unobstructed, then the afloat 登船 state.
- Actual 568×320: boarding button sits to the left of the boat. Clicking it successfully boards and opens the rod console. Browser console had no errors.
- Numerical coverage: 320×568, 390×844, 568×320 and 844×390; player at counter and landing; all 241 sampled animation phases clear the placed label. Existing UI placement tests remain green.
- `npm run check` and all 564 tests passed.
