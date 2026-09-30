// Terminal tackle in metres/seconds. Sink rates and holding capacities are
// authored approximations, not performance measurements of commercial rigs.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
export const SHORE_RIG_PHYSICS=Object.freeze({
  salmon_spoon:Object.freeze({mode:'lure',sinkerGrams:28,sinkSpeed:.48,holdingSpeed:.35}),
  salmon_spinner:Object.freeze({mode:'lure',sinkerGrams:21,sinkSpeed:.33,holdingSpeed:.3}),
  grub_jig:Object.freeze({mode:'lure',sinkerGrams:14,sinkSpeed:.28,holdingSpeed:.25}),
  carolina_rig:Object.freeze({mode:'bottom',sinkerGrams:28,sinkSpeed:.42,holdingSpeed:.65}),
  fishfinder_rig:Object.freeze({mode:'bottom',sinkerGrams:85,sinkSpeed:.72,holdingSpeed:1.1}),
  // A single #6 hook under a weighted float. These are authored approximations;
  // extraDragArea is the float's effective Cd*A in square metres, not its mass.
  float_rig:Object.freeze({mode:'float',sinkerGrams:12,floatGrams:2,extraDragArea:.0006,hookDepthM:1,sinkSpeed:.22,holdingSpeed:.75}),
});
const BAIT_LOAD=Object.freeze({
  sandcrab:Object.freeze({grams:4,dragArea:.00014}),
  squid:Object.freeze({grams:7,dragArea:.00024}),
  anchovy:Object.freeze({grams:10,dragArea:.00035}),
  sandworm:Object.freeze({grams:3,dragArea:.00012}),
  mussel:Object.freeze({grams:6,dragArea:.0002}),
});
// Floating small hooks receive a trimmed 2.5 g piece. One stocked bait portion
// still pays for one baiting action; trimming never creates extra inventory.
export function shoreBaitLoad(rigId='carolina_rig',baitKind='sandcrab'){
  if(SHORE_RIG_PHYSICS[rigId]?.mode==='lure')return{grams:0,dragArea:.00015,portion:0};
  const bait=BAIT_LOAD[baitKind]||BAIT_LOAD.sandcrab;
  const portion=rigId==='float_rig'&&['squid','anchovy','mussel'].includes(baitKind)?2.5/bait.grams:1;
  return{grams:bait.grams*portion,dragArea:bait.dragArea*portion**(2/3),portion};
}
export function shorePresentation(sample={},rigId='carolina_rig',depth=0){
  const rig=SHORE_RIG_PHYSICS[rigId]||SHORE_RIG_PHYSICS.carolina_rig;
  const bottom=Math.max(.05,finite(sample.depth,.05));
  const current=Math.hypot(finite(sample.currentX),finite(sample.currentY));
  if(rig.mode==='lure')return{mode:'lure',depth:clamp(finite(depth),0,bottom),targetDepth:bottom,bottomContact:depth>=bottom-.1?1:0,stability:.9,sinkSpeed:rig.sinkSpeed,sinkerGrams:rig.sinkerGrams,driftX:finite(sample.currentX)*.9+finite(sample.waveVelocityX)*.35,driftY:finite(sample.currentY)*.9+finite(sample.waveVelocityY)*.35,status:'拟饵下沉中'};
  if(rig.mode==='float'){
    const targetDepth=Math.min(rig.hookDepthM,bottom*.75);
    const baitDepth=clamp(finite(depth),0,targetDepth);
    // A drifting float is less sensitive to steady flow than to wave motion.
    const forcing=current*.3+Math.max(0,finite(sample.orbitalVelocity))*.9;
    const stability=1/(1+(forcing/rig.holdingSpeed)**2);
    return{mode:'float',depth:baitDepth,targetDepth,bottomContact:0,stability,
      sinkerGrams:rig.sinkerGrams,floatGrams:rig.floatGrams,sinkSpeed:rig.sinkSpeed/(1+forcing*.5),
      driftX:finite(sample.currentX)+finite(sample.waveVelocityX)*.45,
      driftY:finite(sample.currentY)+finite(sample.waveVelocityY)*.45,
      status:baitDepth<targetDepth*.8?'浮钓钩饵下沉中':stability<.35?'浪冲浮漂，钩饵不稳':'钩饵悬浮，随流漂动'};
  }
  const forcing=current+Math.max(0,finite(sample.orbitalVelocity))*.55;
  const excess=Math.max(0,forcing-rig.holdingSpeed);
  const stability=1/(1+(forcing/rig.holdingSpeed)**3);
  const settled=clamp(1-Math.max(0,bottom-finite(depth))/(Math.min(.5,bottom*.4)),0,1);
  const bottomContact=settled/(1+excess*1.8);
  const mobility=.06+.68*(1-stability);
  return {mode:'bottom',depth:clamp(finite(depth),0,bottom),targetDepth:bottom,bottomContact,stability,sinkerGrams:rig.sinkerGrams,
    sinkSpeed:rig.sinkSpeed/(1+forcing*.32),
    driftX:(finite(sample.currentX)+finite(sample.waveVelocityX)*.25)*mobility,
    driftY:(finite(sample.currentY)+finite(sample.waveVelocityY)*.25)*mobility,
    status:settled<.8?'钓组下沉中':stability<.35?'浪流推着钓组滚动':stability<.7?'钓组随浪缓移':'钓组贴底较稳'};
}
export function stepShorePresentation(previous,sample,rigId,dt,controls={}){
  dt=Math.max(0,finite(dt));
  const before=shorePresentation(sample,rigId,previous?.depth||0);
  const lift=clamp(finite(controls.rodLift,.35),0,1),sweep=clamp(finite(controls.rodSweep),-1,1);
  const retrieve=Math.max(0,finite(controls.retrieveSpeed));
  const leverage=before.mode==='bottom'?(rigId==='fishfinder_rig'?.36:.7):1;
  const speed=retrieve*(before.mode==='bottom'?(rigId==='fishfinder_rig'?.7:.88):1);
  const twitch=controls.twitch?1:Math.max(0,finite(previous?.twitch)*Math.exp(-dt/.38));
  const raise=Math.max(0,lift-finite(previous?.rodLift,lift));
  const hop=(controls.twitch?(.18+.3*lift):0)+raise*.5;
  const rise=speed*(before.mode==='float'?.16:.3+.45*lift)*leverage;
  const depth=clamp(before.depth+before.sinkSpeed*dt-rise*dt-hop*leverage,0,before.targetDepth);
  const p=shorePresentation(sample,rigId,depth);
  const dx=finite(controls.directionX),dy=finite(controls.directionY);
  const sweepSpeed=sweep*(.1+.18*lift)*leverage;
  p.driftX+=dx*speed-dy*sweepSpeed;p.driftY+=dy*speed+dx*sweepSpeed;
  // Winding a taut line recovers length even in a cross-current; the flow can
  // sweep the tackle sideways and slow pickup, but cannot hold an empty rig
  // permanently offshore while the spool keeps winding.
  if(speed>0){const pickup=p.driftX*dx+p.driftY*dy,correction=Math.max(0,speed*.5-pickup);p.driftX+=dx*correction;p.driftY+=dy*correction;}
  const relativeSpeed=Math.hypot(p.driftX-finite(sample.currentX),p.driftY-finite(sample.currentY));
  Object.assign(p,{retrieveSpeed:speed,relativeSpeed,motion:relativeSpeed+twitch*.65,rodLift:lift,rodSweep:sweep,twitch});
  if(p.mode==='lure')p.status=twitch>.25?'拟饵跳动后下落':speed>.08?'拟饵随收线游动':p.bottomContact?'拟饵触底，提竿可跳底':'停收，拟饵下沉中';
  else if(speed>.08||twitch>.25)p.status=p.mode==='float'?'浮漂缓缓收近，钩饵随之抬起':rigId==='fishfinder_rig'?'重铅沿底收近':'轻组拖底、提竿跳动';
  return p;
}
