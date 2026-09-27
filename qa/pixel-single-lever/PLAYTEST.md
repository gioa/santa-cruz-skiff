# Combined gear and throttle lever — pixel v13

Tested the final build in the in-app browser at `localhost:4177/?edition=pixel`, using an isolated local save and actual pointer/UI actions. No simulation state or clock was injected.

- Pushing the single right-hand lever selects forward and progressively increases throttle. Pulling selects reverse; the centre detent is neutral. The old three gear buttons are absent.
- A stationary tap does not jump the lever or take manual control. A deliberate relative drag does. Releasing retains the position and power.
- Forward at 52% produced actual movement (boat z changed from −993.7 to −1026.6 during an 8-second observation).
- Pulling through neutral while cruising cut power to zero and held neutral until the boat slowed. A fresh pull then engaged reverse at 60%; model throttle was −0.18 and the boat subsequently moved astern (z −1633.1 to −1630.9).
- Opening Settings during reverse reset the lever to neutral, cancelled manual input and paused with zero throttle.
- Reloaded the final touch-jitter fix before the remaining checks. On 568×320 landscape, an actual full upward drag engaged forward at 100%; the knob remained inside the track.
- 390×844, 320×568 and 568×320 viewport checks showed no horizontal document overflow and usable controls. Screenshots record portrait, small-phone and landscape layouts.
- Lowered a bottom rig, placed the rod in the port holder and started the engine through ordinary UI actions. Full forward drag was capped at 28%; the displayed lever, accessible slider and model throttle agreed. Pulling into reverse returned neutral with zero power and a trolling explanation.
- Browser console: no warning/error entries during these checks.

Automated validation: `npm run check` passed; `npm test` passed **336/336**. Coverage includes the actual pointer bindings, touch jitter, second-finger ownership, release retention, independent steering, cancellation/lost capture, pause/engine/fishing guards, hidden controls, frame-boundary trolling limits, keyboard detent crossing and no queued reversal. Existing fishing, first-person, navigation and inventory tests remain passing.

Screenshots: `01-forward-phone.png`, `02-reverse-phone.png`, `03-small-phone.png`, `04-landscape-phone.png`, `05-trolling-cap.png`.
