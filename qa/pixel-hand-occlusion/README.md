# First-person hand occlusion — v79

The rod, reel and fishing line are painted before the complete foreground grasp (palms, wrists, sleeves and fingers). This fixes both line-over-skin during two-handed lifting and crank shafts piercing the winding hand. Mounted rods retain the visible line and reel with no hands added.

Validation:
- Phone 390 × 844 and landscape 844 × 390 screenshots use the production fight renderer and controls with the isolated `qa/pixel-landing-motion/fixture.js` fish setup. The four small buttons at the top are local QA controls only, never shipped.
- Pixel coverage regression checks compare line-on/line-off images across lifting, recovery, a partial support-hand transition, eight crank angles and both orientations. Skin and sleeve pixels must be unchanged while exposed line remains visible.
- A separate coverage test checks the actual knob centre is occluded by the right palm at 16 crank angles. Both new tests fail against the previous renderer (see before-regression.txt).
- Full syntax and test suite are run after removal of the local fixture. No fishing physics or hand position geometry changed.
