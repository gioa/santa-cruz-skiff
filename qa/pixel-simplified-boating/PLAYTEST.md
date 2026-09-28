# Simplified boat controls — pixel v26

Verified 2026-09-27 using the actual game in the Codex in-app browser on isolated local origins. Mobile viewports: 390×844 and 320×568. No state injection or time acceleration used for browser checks.

- Resumed a previous voyage: only its owned general-purpose rod appears in the rod rack. Picker shows spare bottom rigs and its installed 4/0 feather rig (zero spares); unowned rigs/rods are absent.
- Fresh voyage: initial 100 credits and starter supplies remain. Rental deducts 15 credits; the stored boat completes the normal davit lowering before boarding.
- Boarding immediately offers steering/fishing and `靠泊上岸`; no unmooring or anchoring controls. Fuel is absent from the UI.
- Steering: world motor cowl, shaft and tiller swivel around the transom mount; driver's hand follows the same grip. Touch control motor head also rotates with its handle. Neutral retains the selected steering angle.
- Docking via the visible button completes the landing inspection. Observed `lastInspection.reason=landing`, `id=landing-1`, `mode=walk`, `tripComplete=true`.
- Counter has rental, shop and catch exchange only. Shop has no anchor or drift sock.
- Final paid supply flow: bottom rig purchase changes credits 85→73 and spares 2→3; squid purchase changes credits 73→61 and portions 12→24. Installed bait/rig are unchanged by purchase. Phone UI remains usable at 320×568.
- Browser error log empty.

Validation: `npm run check`; `npm test` — 492/492 pass. Includes forward/reverse outboard orientation against actual vessel thrust, rigid grip attachment, old-save normalization, disabled anchor/free-restock behavior, finite paid consumables and preserved landing-inspection guards.

Screenshots:
- `01-owned-tackle-phone.jpg`: owned rod/rig picker.
- `02-rental-phone.jpg`: rental hut without free supplies.
- `03-steering-phone.jpg`: connected motor/tiller and simplified console.
- `04-boarding-small-phone.jpg`: boarding with landing option at 320×568.
- `05-paid-supplies-small-phone.jpg`: successful paid squid replenishment.
