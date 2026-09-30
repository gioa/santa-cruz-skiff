# NPC wardrobe verification — 2026-09-29

Ships the two existing local commits (1737573 surf/species and fbbcd7e Sharp Park
regular) together with distinct NPC clothing. The beach renderer now assigns
stable identity-specific silhouettes: shop apron/work cap, warden uniform/radio,
weathered bucket hat/pocket vest, knit cap/canvas satchel, hooded raincoat, and
blue cap/scarf/bib waders for 空军大队长. Player clothing remains coral and olive.
Santa Cruz already has separate player, counter-staff and warden sprites.

941 tests passed. JavaScript checks and the fingerprinted production build passed.
The preview renders the actual character functions in front/back/moving poses;
it and its staged scene are QA-only and are not copied into the production site.
Mobile production-build checks cover Pacifica and Half Moon Bay, inventory,
touch walking and natural NPC appearance. No console errors observed.

- wardrobe.png: renderer contact sheet and explicitly staged scene.
- pacifica-phone.png / half-moon-bay-phone.png: actual mobile starting scenes.
- pacifica-anglers-phone.png: naturally spawned regular and visiting angler beside
  the player, after touch walking from the shop; no fixture injection.
