# Rental and dry skiffs — September 27, 2026

Build: `20260927-pixel-v8`; pixel save schema 5, equipment profile schema unchanged at 2.

## Actual browser checks

Used a separate localhost:4175 origin with a new 100-credit profile, preserving existing localhost:4173 progress. Normal UI actions only; no state injection, clock skipping or teleport.

- On a 390×844 viewport, all three boats began on wharf cradles, with no hull at the water berth. All three reported identical 61.639×112.977 CSS-pixel hull dimensions, rotated horizontally on shore. Screenshot `01-boats-ashore-390.png` shows their matching size and clear gaps.
- Tapping the assigned boat sent the character to the rental counter. The counter showed **付款租船 · ✦ 15**, the current 100-credit balance and the unpaid shore state (`02-pay-before-launch.png`). The same payment button measured 124.1×45.5 CSS px at 320×568 with no horizontal overflow.
- Clicking that button deducted exactly 15 credits: balance became 85, rentalPaid became true, launchStage became lowering, and the hull began its deck-transfer phase from the actual shore rack. The ordinary 24-active-second animation proceeded through the crane and descent. At 92% the hull was still lowering and boarding was unavailable.
- After the launch completed the normal **登船** action appeared. Boarding, unmooring and starting the engine succeeded. The occupied hull dimensions stayed exactly equal to both parked hulls (`03-launched-empty-390.png`).
- Reloading and selecting **继续上次航程** preserved the afloat boat and paid rental with the same 85 credits. No extra payment was requested or charged (`04-resumed-paid-boat.png`). Browser console had no warnings or errors.

`npm run check` and all **236 automated tests** passed.

## Model and geometry coverage

Rental regressions cover insufficient/exact funds, one transaction across repeated requests, retaining paid launch progress on recovery/reload, legacy afloat voyages without retroactive debits, unpaid corrupted floating flags returning ashore, no unpaid boarding/engine/navigation/casting/recovery bypass, reserving the rental budget while shopping, and protecting an already-paid low-balance save from being overwritten by a new unpaid trip.

Geometry regressions cover all three dry hulls inside both the real and rendered pier, separation and spawn clearance, common hull scale across dry/afloat/occupied modes, no dry-water bob, no stale water-berth click target, 1,001 dry-transfer poses on the deck, continuous motion across launch phase boundaries, and actual renderer anchors/hits/metadata at 390×844, 320×568, 568×320 and 1280×720. The camera uses the same hull-scale formula for bottom-console clearance.

Independent read-only review also checked actual renderer click/anchor geometry over several viewport/zoom combinations. These automated/offline checks are distinct from the browser observations above.
