# Rod configuration shortcut (v69)

Added a 44×44 icon button in the active rod header. It opens the existing workbench with the current rod selected. It is enabled only when the existing assembly capability is available (idle/retrieved rig on a ready boat). It remains visible but disabled during casting, flight, sinking, waiting, bite, fight and catch handling. Both click handler and open-workbench callback recheck readiness to prevent stale clicks.

Validation: npm run check and all 702 tests pass. The added control test checks every deployed phase, stale clicks before the UI refreshes, and re-enabling for a retrieved rod in the side holder.

Mobile browser 390×844: ready.png shows enabled configuration; clicking opened the current rod workbench. After actual vertical lowering it was disabled (deployed.png). Braking the spool and winding with the existing player action returned the rig to idle and re-enabled configuration (retrieved.png). No console errors. QA used an isolated synthetic save; the fixture HTML/module were removed before publication.
