# Helm / rod categories — v37

Verified 2026-09-27 in the complete game using an isolated localhost:4187 offshore save.

- Bottom console presents two stable buttons: 掌舵 and 鱼竿, with selected state and linked panel IDs. Choosing the active category is a no-op.
- Removed the redundant bottom 换竿装配 button and its event handler.
- Tapping top backpack → 鱼竿 opens the existing rod/consumable workbench, including the active rod, premade rigs and bait replacement.
- 390×844: switched both directions; rod tools and helm/tiller appeared in their selected category. Captured both states and backpack assembly.
- 844×390: categories form a compact vertical stack beside the controls; no clipping. Switched back to rod, lowered the rig, and verified unavailable helm switching disappeared while holding deployed tackle.
- Browser console: no errors. `npm run check` and all 562 existing tests passed.

The local start fixture seeds only localhost:4187 storage; it is outside the public dist build.
