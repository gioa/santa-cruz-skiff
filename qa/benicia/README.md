# Benicia verification — 2026-09-29

Local browser playtest used the actual uninstrumented `benicia.html` controller via UI. The new journey advanced from 06:00 past 07:56 at the 10× game clock (>11 active minutes), including walking, waiting with a lure, menus that pause, and save/resume. Phone layout was checked at 390×844 and desktop at 1280×800. No browser warnings or errors were observed.

Verified through UI:
- Location picker lists Benicia / First Street and identifies the current scene.
- Public pier entry, walking to the end, casting, speed adjustment, gradual reel-home, and exit to the bank.
- Tapping/walking between crowded bank positions; different NPC clothes and casting rhythms.
- Conversation with Jo adds a clue to the same shore notebook; it survives reload.
- Leaving a spoon on riprap and retrieving it loses the mounted rig; fitting the only spare decrements its stock and hides the depleted spare option.
- Tackle exchange opens on approach; a spinner purchase subtracts 28 game credits and adds one spare.
- Handbook purchase subtracts 12 game credits, reveals its equipment entry, and opens Benicia's inland rules.
- Resuming retains elapsed game time, purchased items and notes.

`simulation-sessions.json` is a separate set of **accelerated deterministic simulations**, three 600-second sessions with no fish or catch injection. After the final eastward-flood correction all three runs completed with finite state and 14 casts apiece; no bites occurred. These are stability checks, not claimed human sessions or guaranteed catch rates.

`tests/benicia.test.js` supplies a known hungry salmon school only for its encounter integration test, then runs normal detection, strike, species fight, landing and save/restore. Remaining cases cover the public pier, currents, depth/habitat, crowds/lore, rig replacement, seasons, daily/possession limits and pre-sale confiscation.

Screenshots here are uninstrumented UI captures. Additional known-fish renderer/control fixtures are explicitly documented in `../shore-controls/README.md`.
