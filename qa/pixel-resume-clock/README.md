# Continue preserves the voyage clock (v67)

- Restores saved simulation time, date and day number independent of the day-cycle version marker. Legacy clock-only saves use their displayed clock; older elapsed-only saves use their recorded rate (1x when absent). No wall-clock catch-up while away.
- Both introduction buttons continue pixel saves; the header and introduction footer preview their saved clock.
- Blur, page freeze and opening a menu persist immediately in addition to existing periodic/visibility/pagehide saves.
- A fresh voyage starts at 06:00. The normal 18:00 closing transition still advances to the next day at 06:00.

Validation: `npm run check` and all 701 `npm test` cases pass. Added coverage for repeated reloads on different real dates, legacy/no-marker saves, clock and elapsed fallbacks, invalid fields, fresh voyages and day closure.

Browser QA: isolated localStorage fixture (not the player's save), mobile 390×844. A legacy day-4 save opened at 12:34, continued at 12:34, advanced at 5x to 12:35, was saved by opening settings, then reloaded and continued via the alternate resume button at 12:35. Settings still showed day 4. No browser console errors.

- `intro.png`: legacy saved clock shown before starting.
- `resumed.png`: day 4, 12:35 after play, settings paused.
- `reloaded-resume.png`: after refresh and continuing again, still 12:35.
- `fixture.js`: source for the isolated seed. QA HTML/module copies were removed before publication.
