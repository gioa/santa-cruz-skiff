# v44 audio recovery verification

The old setPaused(false) returned immediately when its logical pause flag was already false. A rejected or deferred resume after returning from another app could therefore leave the AudioContext suspended indefinitely. OS interruptions also had no recovery from the animation loop.

- Resume is retried on visible focus, pageshow, visibility change, and ordinary pointer/touch/key/click gestures.
- Suspended/interrupted contexts retry at most once per second on the foreground animation loop; gestures bypass that throttle and pending promises.
- State changes clear stale notes and reel loops; the score resumes from a fresh audio-clock scheduling window without replaying a backlog.
- Delayed resume completion respects current background and mute state.
- No initialization before the player's start/settings gesture. Explicit master/music mute and volume are preserved.

Validation: 594 Node tests passed, including six new regression cases. The local browser loaded the full v44 game, initialized an actual running AudioContext and scheduled notes. The non-shipping QA page forced one resume rejection: status became suspended with zero voices, then recovered to running with advancing music notes. A muted background/return cycle stayed suspended and disabled. Browser diagnostics had no unexpected errors. Tests simulate lifecycle/interruption cases; physical iPhone app-switch/lock-screen behavior was not directly tested. Page navigation in the desktop browser reloaded instead of using BFCache, so pageshow/BFCache coverage is through the lifecycle test.

The QA page lives outside dist and is excluded from GitHub Pages deployment. Serve the repository root locally to use it.

Browser behavior reference: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#resuming_interrupted_play_states_in_ios_safari
