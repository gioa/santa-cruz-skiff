# Neutral tiller ignition, wake and hull shadow — v35

Validated 2026-09-27 using production modules and the complete local game.

- Removed the separate engine button. The unpowered helm remains accessible through 操船.
- A short neutral tiller tap starts/stops the motor; dragging steers without toggling. Forward/reverse or route throttle blocks ignition until neutral.
- Cancellation, long press, outward-and-back drags, foreign pointer releases, hidden controls and fishing interlocks have regression coverage.
- Complete game: normal new trip → walk to counter → pay rental → wait for crane → walk to boarding → board → 操船 → tap start → tap stop → 钓鱼. Vertical lowering remained available after switching back.
- 390×844: actual pointer tap and relative lever drag. At 21% power the hull settled near 2.8 kn; at 100% near 6.1 kn. Screenshot pairs capture the smaller and larger wake. Neutral followed by tapping stops the motor while residual hull motion slows naturally.
- 844×390: both controls fit without clipping. The complete game screenshot includes context actions and no engine button.
- Shadows now use the rental sprite's pointed hull outline, with one opacity pass. Patrol shadow also follows its hull. Hoisted hull shadows stay on the surface.
- Wake crests start at the rendered stern (bow when reversing), retain the speed at emission, and fade independently. Width, spread, foam and lifetime grow with actual hull speed, including neutral coasting.
- `npm run check` and `npm test`: 560 / 560 passing. Browser console: no warnings/errors in complete game.

The standalone fixture seeds a paid, afloat boat offshore and then runs the real simulation, controls and renderer. It does not change production save data. Screenshot captions show this QA context.
