# Direct rod access — 2026-09-27

Build: `20260927-pixel-v15`.

The boat's old nested “船上” menu is replaced with one “换竿装配” button. It opens the existing per-rod assembly grid directly, including while moored. Standing, sitting, and deck walking have no UI entry or simulation action. Legacy deck posture is normalized without disturbing active tackle. Purchased GPS and sounder views remain available through the corresponding enabled backpack item.

## Validation

- `npm run check` and all 372 automated tests passed. Updated tests cover old standing saves, seated crew, uninterrupted helm/tackle, contextual assembly visibility, and existing full voyage gameplay.
- Used normal browser UI in a separate localhost QA profile at 390×844 and 320×568. No state injection or time acceleration.
- Bought a light rod, slider rig, and GPS with existing earned credits; opened GPS from its backpack item.
- Opened the rod grid in one tap while moored and after unmooring. Equipped the light rod with slider rig / 57 g while the starter rod kept bottom rig / 85 g. Switched both ways and verified separate configurations.
- Lowered a rig: the assembly entry disappeared, and the backpack editor rejected rod/component changes. Retrieved the rig normally: the entry returned.
- No browser warning/error logs observed.

Screenshots: `01-phone-assembly.png` (390×844), `02-phone-controls.png` (390×844), `03-small-phone.png` (320×568, scrollable editor).
