import * as THREE from './vendor/three.module.js';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const shortest = a => Math.atan2(Math.sin(a), Math.cos(a));

// One physical character and one tackle assembly in boat space. Cameras never
// relocate a prop: wrists follow the actual rod/reel/outboard contact frames.
export function createAnglerInteraction({boat, fisher, rod}) {
  const rodFrame = new THREE.Group();
  rodFrame.name = 'Angler tackle action frame';
  boat.add(rodFrame);
  rodFrame.add(rod);
  let bodyYaw = 0, releaseAge = 10, wasCasting = false;
  let action = 'rest', targetLeft = null, targetRight = null;
  const seat = new THREE.Vector3(-.35, .055, 1.47);
  const seatOffset = new THREE.Vector3(0, 0, .25);
  const pointA = new THREE.Vector3(), pointB = new THREE.Vector3();

  function update({state: s, dt, casting, reeling, pumping, hasRod}) {
    const active = s.mode === 'boat';
    const fishing = active && hasRod && !s.moored && !s.engine;
    action = !active ? 'absent' : s.engine ? 'helm' : fishing ?
      (casting ? 'backswing' : s.fishState === 'fight' ? 'fight' : reeling ? 'reel' : 'fish') : 'rest';
    fisher.visible = active;
    rod.visible = active && hasRod;
    if (wasCasting && !casting && s.fishState === 'sinking') releaseAge = 0;
    wasCasting = casting;
    releaseAge += dt;
    const aim = shortest(s.yaw);
    const wantedYaw = s.engine ? -.42 : fishing || s.standing ? aim : 0;
    bodyYaw += shortest(wantedYaw - bodyYaw) * (1 - Math.exp(-dt * 9));
    fisher.rotation.set(0, bodyYaw, 0);
    if (s.standing) {
      fisher.position.set(s.deckX, .055, s.deckZ);
    } else {
      fisher.position.copy(seat).add(pointA.copy(seatOffset).applyAxisAngle(UP, bodyYaw));
    }
    targetLeft = targetRight = null;
    if (fishing) {
      rodFrame.position.copy(fisher.position);
      rodFrame.rotation.set(0, bodyYaw, 0);
      const follow = Math.max(0, 1 - releaseAge / .55);
      const raised = THREE.MathUtils.lerp(fisher.userData.standingBlend || 0, s.standing ? 1 : 0, 1 - Math.exp(-dt * 12)) * .395;
      const pull = pumping ? .27 : s.fishState === 'fight' ? s.tension * .0016 : 0;
      const charge = casting ? clamp(s.castPower, 0, 1) : 0;
      rod.position.set(.07, .84 + raised + charge * .09 + pull * .2, -.53 + charge * .08);
      rod.rotation.set(-1.02 + charge * .77 + pull - follow * .26, 0, -.08, 'YXZ');
      const bend = s.fishState === 'fight' ? s.tension * .0016 :
        s.fishState === 'bite' ? .065 + Math.sin(s.time * 17) * .025 : .014;
      rod.userData.update?.({dt, reeling, bend});
      targetLeft = rod.userData.gripSocket;
      targetRight = rod.userData.reelGripSocket;
    } else {
      // The unused rod remains aboard in its actual holder.
      rodFrame.position.copy(boat.userData.rodHolder.position);
      rodFrame.quaternion.copy(boat.userData.rodHolder.quaternion);
      rod.position.set(0, 0, 0);
      rod.rotation.set(0, 0, 0);
      rod.userData.update?.({dt, reeling:false, bend:0});
      if (active && !s.standing && Math.abs(shortest(wantedYaw-bodyYaw)) < .35) targetRight = boat.userData.tillerGripSocket;
    }
    boat.userData.setThrottle?.(s.engine ? s.throttle : 0);
    boat.updateMatrixWorld(true);
    fisher.userData.pose?.({time:s.time, dt, leftGrip:targetLeft, rightGrip:targetRight,
      standing:s.standing, lookYaw:shortest(aim-bodyYaw), headPitch:clamp(s.pitch,-.45,.35), firstPerson:s.view==='first'});
    fisher.userData.lifeVest.visible = s.pfd;
    boat.updateMatrixWorld(true);
    return fishing;
  }

  function diagnostics() {
    const error = (hand, target) => !target || !hand ? null :
      +hand.userData.gripSocket.getWorldPosition(pointA).distanceTo(target.getWorldPosition(pointB)).toFixed(5);
    return {action, leftContactMeters:error(fisher.userData.hands?.left,targetLeft),
      rightContactMeters:error(fisher.userData.hands?.right,targetRight),
      armReach:fisher.userData.gripError || null};
  }
  return {update, diagnostics};
}
