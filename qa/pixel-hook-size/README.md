# Premade hook-size verification — 2026-09-27

Release: `20260927-pixel-v20`.

- 415 automated tests pass. Twelve new cases cover US hook metadata, species/size-dependent mouth fit, small-hook large-fish exceptions, a single seating roll, stable-frame overload integration, wire failure before landing, finite terminal replacement and persistent partial hook damage.
- Independent audit reproduced 30 ordinary small-rockfish steady-retrieval probes without introducing spontaneous hook loss, and ran 28 hook/consumable cases.
- JavaScript syntax checks and whitespace checks pass. Final cache-version import checks and 39 focused tests pass.
- Browser checks at 390×844 and 320×568: all six preset cards expose size, pattern and count. Inventory/shop cells have compact hook-size labels; item detail repeats the full specification. No horizontal overflow at 320 px (`scrollWidth === clientWidth`).
- Purchased #6 feather rig through the counter shop: credits 119 → 89, spare count 0 → 1. Mounted it through the rod panel: #6 spare 1 → 0; usable original 2/0 rig and attached bait were stowed intact. Reloading the final build preserved mounted #6, stock, wear, and default intact hook wire.
- Boarded the rented boat, released the mooring and lowered the #6 two-hook feather rig normally. The active fishing console shows `手持 · 羽毛组 · #6`, with line measured in feet. No extra bait is charged for an unbaited feather rig.
- Natural catch: a 34 cm / 0.74 kg Pacific mackerel took the #6 feather rig and was landed by steady reeling; the catch display shows 13.4 in / 1.63 lb. Its record preserves #6 / J / two hooks. After release the rig condition was 0.975, wire damage 0, squid stock remained 12, and the mounted rig remained present.
- No browser console errors. No arbitrary time advances, fish injections or browser state rewrites were used.

`calibration.json` records synthetic comparisons for engineering verification only. Its probabilities, mouth dimensions and load limits are game tuning, not measured field rates. Research sources and limitations are in `docs/pixel-hook-size-evidence.md`.

Screenshots: `01-phone-hook-cards.png`, `02-boat-hook-size.png`, `03-natural-mackerel.png`.
