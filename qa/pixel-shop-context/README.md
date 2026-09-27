# Shop location visibility — 2026-09-27

Build `20260927-pixel-v16` hides the shop tab outside the existing physical counter interaction range. Direct shop requests fall back to the player's inventory before constructing a catalogue. The missing-chart shortcut opens the personal backpack away from the counter and retains shop access at the counter.

Verified in the browser at 390×844 using ordinary gameplay, without injected state:

- Aboard the boat, both rod assembly and backpack show only the backpack and rod tabs.
- With no chart, the chart panel offers “打开背包” and opens owned inventory without a shop tab.
- Docked and walked to the small hut; the staff's “兑换装备” opens the shop tab and equipment shelves normally.
- No browser errors observed.

`npm run check`, `git diff --check`, and 20 existing equipment/rental tests passed. Screenshots capture rod assembly aboard and the shop at the counter.
