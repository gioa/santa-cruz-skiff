# Mode picture buttons

Replaced the visible helm/rod text with original inline SVG illustrations of an
outboard tiller and rod/reel. Accessible names, pressed state, disabled state,
left-hand vertical placement and 56×48px touch targets are preserved. SVGs do
not intercept pointer events. Only HTML and CSS changed; simulation is unchanged.

Checked the production interface at 390×844 with the local boat fixture from
pixel-compact-console: stow rod, press helm image, inspect helm controls, press
rod image, inspect rod controls. Both pressed states updated correctly; button
text is empty while accessibility names remain present. No console errors.
Screenshots record each selected mode. Temporary fixture entry points were
removed from dist before publishing. No new implementation-mirroring tests added.
