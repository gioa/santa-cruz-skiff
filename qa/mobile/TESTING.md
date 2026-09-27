# Mobile control validation — 2026-09-27

This is browser viewport testing on the development computer, not a physical iOS/Android device test. Real multitouch pointer sequences are additionally modeled with Node EventTarget tests; the browser interaction tool offers single-pointer dragging.

- Viewports: 390×844, 320×568, 667×375, 568×320.
- Played using visible touch buttons and pointer drags: automatic walk, eight individual gear selections, board, unmoor, start engine, drag throttle to 70%, steer, look, neutral, map, kelp navigation, anchor, cast, strike, drag adjustment, reel, land fish, keep fish.
- Cast finger dragged outside its button: exactly one cast, with capture correctly releasing.
- Camera drag while continuous reel enabled preserved reeling; view changed independently.
- Screen rotation cleared reeling and centered analog input. Opening bag paused the fish and cleared reel/pump/charge. Resuming did not leave any action stuck.
- Gear selections kept scroll position and selected all eight items (11.7 kg).
- 320×568 fight controls checked against viewport bounds: every sampled action remained in bounds; primary fight buttons 72×86, drag buttons 44×48, header buttons 44×44.
- Successful fish: 32 cm / 0.8 kg blue rockfish, 154 seconds fight, zero missed bites and broken lines in this control pass. Active game time at recorded catch: 331 seconds. The earlier full 18-minute trip is documented separately in ../PLAYTEST.md.
- Zero captured warning/error logs in the sampled browser run; renderErrors empty. Observed 60 fps is a desktop measurement, not a mobile hardware guarantee.
- Twelve deterministic Node tests cover one-pointer ownership, independent movement/look, cast release outside, cancellation/lost capture/reset, rejected actions, secondary mouse buttons, capture failure, action-source isolation, reset and radial deadzone.

Screenshots show actual rendered gameplay: short landscape fight, portrait fight, small portrait fight and catch modal. This checkpoint precedes the user's requested geography/economy/overboard expansion.
