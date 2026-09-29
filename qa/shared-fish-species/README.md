# Shared fish identity QA

Run a local server for `dist` on port 4207, then run `node qa/shared-fish-species/playtest.mjs`. Set `PLAYWRIGHT_MODULE` if Playwright is installed outside the repository; `QA_BASE_URL` can override the local server URL. The script exposes game references by intercepting JavaScript only in its disposable browser context. It seeds old saves and forces deterministic catches; screenshots demonstrate rendering and save/settlement behavior, not natural encounter probabilities. No production test hooks are added.

Validated Pacifica, Half Moon Bay and Santa Cruz: shared names and portraits, old measurement preservation, unresolved landed fish recovery, release/sale history, no repeat payout, actual equipped rod title, and 320×568, 390×844, 844×390, 1440×1000 views.
