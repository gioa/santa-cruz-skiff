# California regulations handbook verification

Local changes, 2026-09-28. Not published.

- `npm run check` and `npm test` (872 tests, including 9 in `tests/regulations-book.test.js`) pass.
- In-app browser, desktop and 375×812: after the handbook was added to each save, the lower-left **规定** button appeared in Santa Cruz (on the wharf and aboard, above the helm/tackle tab column) and at Pacifica (on the sand and above the casting panel near the surf). Without the book the button stays hidden.
- Opening it pauses the game (`paused: true`, `menu: "rules"`), defaults to the current area (Santa Cruz → `santa_cruz`, Pacifica → `pacifica`), and keeps focus in the search field while typing. Game shortcut keys (I/J/M/E) do not fire while typing. Escape closes it.
- Area switching changes the area page and area-dependent rules (Pigeon Point shore hook limit, salmon seasons). The bag's **打开手册** action opens the same book.
- `qa/shore-smallfish/playtest.mjs` and `qa/shore-ecology/playtest.mjs` were rerun after the change with no page errors.
