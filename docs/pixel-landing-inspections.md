# Landing inspections and fish exchange

Verified against the CDFW snapshot on 2026-09-27. The simulator's inspection schedule and credit penalties are game rules, not statements about real enforcement frequency or California fine amounts.

## Behavior

- Every completed docking starts an eight-second shore inspection, including an empty cooler. Sea patrols still appear independently during voyages.
- Keeping a fish remains the player's choice. No legality prompt is shown on the catch card.
- The counter exchanges only cargo cleared by the current landing inspection. Pending checks block exchange. Old dockside saves, rescue returns, or fish added after clearance require a check before exchange.
- A violation confiscates the affected fish without a reward and charges **100 virtual credits per fish**, even if that fish has several violations. Legal fish remain exchangeable.
- Available credits pay the fine immediately; the remainder persists as `profile.fineDebt`. Later trade and release-record earnings pay that debt before the displayed net reward. Credits never become negative.
- Clearance IDs, cargo flags, debt, and inspection results persist. Reloading a completed inspection cannot pay out confiscated fish or charge the same fish again. Daily retained-fish history remains after confiscation or trade.
- Missing historical evidence is unsupported rather than automatically illegal. This preserves the existing rules module's handling of old saves and unmodeled information.

## Verified species additions

White croaker (`Genyonemus lineatus`) has a ten-fish daily/possession limit within the general twenty-fish total. Pacific sanddab (`Citharichthys sordidus`) has no bag or minimum-size limit and is excluded from that general total. Neither has an invented minimum size. See [CDFW general rules, §§27.56–27.60](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Sport-Fishing/General-Ocean-Fishing-Regs) and the [CDFW white-croaker identification answer](https://wildlife.ca.gov/Fishing/Ocean/Fish-ID/Quiz).

Pacific sanddab is open year-round at all depths in the [Central Region summary](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Fishing-Map/Central). It remains a federal groundfish for the [descending-device requirement](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Groundfish-Summary), but is not in the one-line/two-hook species list in §28.65(d). Separate season/gear exemption fields avoid applying rockfish restrictions to sanddabs. Other restricted fish aboard can still impose gear limits; marine-protected-area and landing-net rules remain applicable.

## Verification

`tests/pixel-landing-inspection.test.js` covers mandatory checks, illegal and legal mixed cargo, route failure independence, rescue/legacy-save recovery, reload idempotence, debt repayment, and paused inspection timing. Regulation tests cover each new species, sanddab exceptions, independent species/RCG/general bags, and unlimited-species exclusion.
