# Santa Cruz asset upgrade

Runtime geometry: `boat.js`, `harbor-assets.js`, `harbor-shapes.js`, `angler-model.js`, `fishing-rod.js` and `deck-instruments.js`. All geometry is authored native Three.js. Local photographic PBR maps ship in `dist/assets/env-*`; no runtime CDN or installation is required. Attribution: `dist/assets/env-sources.json`.

## Method and limits

Blender 5.0.1 is installed, but its background process crashed before the model script executed inside the sandbox. An escalated invocation did not complete. No Blender/GLB export is claimed. `build_harbor.py` preserves the authored Blender construction script; the delivered runtime reproduces its metric shape definitions in Three.js. The worker is a detailed stylized game character with plausible anatomy, not a photoreal scan and not a depiction of real staff.

## Davit

```js
import {createDavit, createDockWorker} from './harbor-assets.js';
const crane = createDavit({outreach: 7.8, cableLength: 5.2});
crane.position.set(13, 2.73, -77);
scene.add(crane);
crane.userData.setCableLength(lengthInMetres);
crane.userData.setYaw(radians);
const hookContact = crane.userData.getHookWorldPosition();
```

Origin is the foundation at deck level. Local +X is outreach. Mast top is approximately 4.47 m above origin; cable upper anchor is 4.04 m above origin. `outreach` supports 2.5–9 m and stretches the structural beam layout while preserving tube diameters. `setCableLength()` clamps to 0.35–9 m and updates both steel cables and the lifting block. The bottom of the load hook is another 0.43 m below the block pivot. At the example position and length, the load contact is world `(20.8, 1.14, -77)`. Public object references: `hook`, `cables`, `slew`. `hook` is suitable as the parent for a lifting sling. `getCableLength()` reads current length.

The crane includes anchor bolts, socket/rotating collars, fabricated truss jib, stay wire, sheave/axle, winding drum with individual cable wraps, handbrake wheel, control enclosure, stop/lower buttons, forged hook with safety latch and warning plate.

## Worker

```js
const crew = createDockWorker('Dock crew');
crew.position.set(12, 2.73, -75);
scene.add(crew);
crew.userData.setPose('operate');
// In the animation loop:
crew.userData.update(elapsedSeconds);
```

Feet are at y=0, approximate height is 1.82 m, front is -Z. Poses: `idle`, `wave`, `operate`, `point`. Public references: `body`, `head`, `leftArm`, `rightArm`. Use a generic displayed role, since this is not any verified actual staff member.

## Boat

`createSkiff()` and all existing references are preserved. Upgrades include aligned albedo/bump/roughness wood maps, worn bevelled seat planks, sculpted Yamaha powerhead, ventilation louvers, latch, starter, rounded shaft/gearcase, molded cooler and fuel tank. Added `boat.userData.boardingLadder`: a stainless ladder on the port aft side, centered near local `(-1.075, 0, 1.42)` with treads descending to y=-0.57. Bow remains -Z; floor top remains y=0.0975.

## Validation

- JavaScript syntax checks passed.
- Crane: 9,926 triangles, 19 meshes.
- Worker: 12,286 triangles, 23 meshes. Boat: 53,352 triangles, 41 meshes (was 83 before batching). First-person hands and seated angler use separate clothing/skin geometry.
- Crane/worker vertex scan found no nonfinite geometry values.
- Browser rendering checked the whole crane and a close worker view. Corrected bib/waist/sleeve intersections found during that inspection.
- `proof.html` is a temporary visual proof, not a production dependency.
