# v40 — Neutral-only propulsion and left mode rail

Verified 2026-09-27 against the production app on isolated localhost:4190 storage.

- No ignition action, handle tap toggle, startup sound trigger, ignition lamp or startup help text. Forward/reverse controls work immediately, including resumed legacy saves with engine=false. Neutral retains hull momentum but sends zero propulsion.
- Fishing readiness follows neutral throttle and hull speed; ignition state no longer blocks handheld fishing. Mounted trolling, bite/fight guards, docking and inspection restrictions remain.
- Separate 56×48 px minimum mode buttons, labelled 掌舵 / 拿竿, stacked at bottom left. Mobile instrument panel leaves space for them. Unavailable switching disappears during hand-deployed fishing, and the rail hides during bite/fight focus, menus and walking.
- 390×844: resumed offshore, selected helm, dragged lever directly from N to F (58%); boat moved from z=-317.5 to z=-393.3. Returned to N; public state confirmed throttle=0. No ignition step.
- 320×740: verified both modes fit with no overlap or page overflow; lowered rig in neutral, modes hid; placed rod in port holder, modes returned with reel controls intact.
- 844×390: verified vertical rail separate from helm. A natural bite during the test entered first-person view and hid the rail.
- No browser console errors. Syntax check and 567 simulation/UI tests passed. Tests cover direct propulsion, neutral coasting, save migration, fishing readiness, input cancellation, reverse and trolling constraints.

Screenshots: 01-forward-phone.png, 02-neutral-phone.png, 03-rod-narrow.png, 04-helm-landscape.png, 05-bite-landscape.png.
