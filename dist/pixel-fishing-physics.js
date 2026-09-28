/**
 * Small, bounded rod / reel / line approximation. Metres, seconds and newtons.
 * Numerical rates are game tuning, not measured tackle performance. Paid line
 * is conserved independently of lure geometry: free spool and slipping drag
 * pay line out, while turning the handle takes it in. Rod movement never
 * manufactures more line. This module has no inventory, UI or random events.
 */
import {getRigProfile,stepRigLure} from './fishing-rigs.js?v=20260927-pixel-v44';
import {rigHydrodynamics} from './pixel-rig-hydrodynamics.js?v=20260927-pixel-v44';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
export const MAX_PAID_LINE_METERS=120;
export const ROD_LENGTH_METERS=2.1;
export const MAX_TROLL_SPEED_MPS=1.55;
export const MAX_TROLL_THROTTLE=.28;
export const reelTurnsPerSecond=value=>value===true?1.2:clamp(finite(value),0,2);

/** Positive azimuth points toward the starboard gunwale, relative to the bow. */
export function rodTipPosition(s){
 const heading=finite(s.heading),mount=s.rodMount||'hand',side=mount==='port'?-.79:mount==='starboard'?.79:.24;
 const fore=mount==='hand'?.32:.62,baseHeight=mount==='hand'?.92:.69;
 const elevation=clamp(finite(s.rodElevation,45),5,85)*Math.PI/180,azimuth=clamp(finite(s.rodAzimuth,70),-180,180)*Math.PI/180;
 const angle=heading-azimuth,horizontal=ROD_LENGTH_METERS*Math.cos(elevation);
 return{x:finite(s.boatX)+side*Math.cos(heading)+fore*Math.sin(heading)-Math.sin(angle)*horizontal,
  z:finite(s.boatZ)-side*Math.sin(heading)+fore*Math.cos(heading)-Math.cos(angle)*horizontal,
  height:baseHeight+ROD_LENGTH_METERS*Math.sin(elevation)+clamp(finite(s.pumpHeight),0,.8)};
}

/** Conditions use a world-space vector when supplied; otherwise no inferred current. */
export function fishingCurrent(conditions={}){
 return{x:finite(conditions.currentX,finite(conditions.currentMps)),z:finite(conditions.currentZ)};
}
export function relativeFishingFlow(current,velocity={}){
 return Math.hypot(finite(current?.x)-finite(velocity.vx),finite(current?.z)-finite(velocity.vz));
}
const separation=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,a.height-b.height);
export function lineWaterEntry(tip,lure){
 const t=tip.height/Math.max(.001,tip.height-lure.height);
 return{x:tip.x+(lure.x-tip.x)*clamp(t,0,1),z:tip.z+(lure.z-tip.z)*clamp(t,0,1),height:0};
}
function constrainLure(lure,tip,length){
 const d=separation(tip,lure);if(d<=length||d<1e-9)return lure;
 const ratio=length/d;
 return{x:tip.x+(lure.x-tip.x)*ratio,z:tip.z+(lure.z-tip.z)*ratio,height:tip.height+(lure.height-tip.height)*ratio};
}
function smoothRod(s,load,dt,strength=1,sensitivity=1){
 const force=clamp(finite(load),0,150),response=1-Math.exp(-dt*7);
 const loadN=finite(s.rodLoadN)+(force-finite(s.rodLoadN))*response;
 const lever=.45+.55*Math.cos(clamp(finite(s.rodElevation,45),5,85)*Math.PI/180);
 const tipResponse=1+(clamp(finite(sensitivity,1),.5,1.5)-1)*Math.exp(-loadN/6);
 const target=clamp(Math.pow(loadN*tipResponse*lever/(11*Math.max(.4,strength)),.68),0,1);
 return{rodLoadN:loadN,rodBend:clamp(finite(s.rodBend)+(target-finite(s.rodBend))*response,0,1)};
}

/** Returns an update; the caller owns fish-state transitions and bait. */
export function stepFishingLine(s,{dt,environment={},current={x:0,z:0},velocity={},retrieve=1,strength=1,sensitivity=1,smooth=1,fishPullN=null,fishMotion=null}={}){
 dt=clamp(finite(dt),0,.25);const rig=getRigProfile(s.rig),crankRate=reelTurnsPerSecond(s.crankRate),reelMode=crankRate>0?'brake':s.reelMode==='free'?'free':'brake';
 environment={...environment,rig:s.rig,weightGrams:finite(s.rigWeightGrams,rig.defaultWeightGrams)};
 const oldTip=rodTipPosition(s),oldPump=clamp(finite(s.pumpHeight),0,.8),pumpHeight=s.pumping?Math.min(.8,oldPump+dt*.95):Math.max(0,oldPump-dt*.6);
 const tip=rodTipPosition({...s,pumpHeight}),lure={...(s.bobber||{x:tip.x,z:tip.z,height:0})};
 let paid=clamp(finite(s.paidLineMeters),0,MAX_PAID_LINE_METERS),payoutRate=0,retrieveRate=crankRate*.65*Math.max(.2,retrieve),load=0,snagStretchMeters=0;
 let rigVelocity={vx:finite(s.rigVelocity?.vx,finite(velocity.vx)),vz:finite(s.rigVelocity?.vz,finite(velocity.vz))};
 const flow=relativeFishingFlow(current,rigVelocity),bottom=Math.max(.1,finite(environment.bottomDepth,12));
 const dragThresholdN=(3+clamp(finite(s.drag,.48),.2,.85)*22)*Math.max(.4,strength);
 const fullDepth=Math.min(Math.max(0,bottom-rig.baitAboveBottom),rig.layer==='suspended'?finite(s.fishingDepthMeters,rig.defaultFishingDepth):bottom);
 let lineDrag=.5*1025*(finite(environment.lineDiameterMm,.36)*.001*Math.min(paid,35)*.45+rig.dragArea)*flow*flow;
 const startLure={...lure};
 if(s.snagged){
  // A caught hook cannot be reeled through the seabed. First take up the
  // loose loop, then stretch the line / bend the rod against a fixed point.
  // Drag limits the force; abrasion and any eventual break belong to the sim.
  if(s.snagPoint)Object.assign(lure,s.snagPoint);rigVelocity={vx:0,vz:0};
  const distance=separation(tip,lure),springNPerMeter=36/(1+Math.max(0,paid)*.02);
  const desiredPaid=clamp(paid-retrieveRate*dt,.08,MAX_PAID_LINE_METERS);
  const threshold=reelMode==='free'?.18:dragThresholdN;
  const equilibriumPaid=Math.max(.08,distance-threshold/springNPerMeter);
  if(desiredPaid<equilibriumPaid){
   // The handle can turn against slipping drag without taking in more line.
   // A moving boat can still draw actual line from the spool at a finite rate.
   retrieveRate=dt?Math.max(0,paid-Math.max(desiredPaid,equilibriumPaid))/dt:0;
   payoutRate=dt?clamp((equilibriumPaid-paid)/dt,0,reelMode==='free'?3:2.4):0;
  }
  paid=clamp(paid+(payoutRate-retrieveRate)*dt,.08,MAX_PAID_LINE_METERS);
  snagStretchMeters=Math.max(0,distance-paid);
  load=snagStretchMeters*springNPerMeter;
  const depth=Math.max(0,-lure.height),contact=bottom-depth-rig.baitAboveBottom<=.18;
  const presentation={...s.rigPresentation,depth,targetDepth:depth,bottomContact:contact,nearBottom:true,sinkRate:0,verticalSpeed:0,pumpHeight,liftVelocity:dt?(tip.height-oldTip.height)/dt:0,snagRiskPerSecond:0};
  return finish({presentation,depth});
 }
 if(fishPullN==null){
  const resting=finite(s.lureDepth)>=fullDepth-.12;
  const seabedResting=bottom-finite(s.lureDepth)-rig.baitAboveBottom<=.12;
  const water=rigHydrodynamics({dt,current:lure.height>0?{x:0,z:0}:current,velocity:lure.height>0?{vx:rigVelocity.vx*Math.exp(-6*dt),vz:rigVelocity.vz*Math.exp(-6*dt)}:rigVelocity,boatVelocity:velocity,weightGrams:environment.weightGrams,dragArea:rig.dragArea,lineDiameterMm:finite(environment.lineDiameterMm,.36),lineMeters:paid,contact:seabedResting,habitat:environment.habitat});
  rigVelocity={vx:water.vx,vz:water.vz};lineDrag=water.lineForce+water.rigForce;
  const gravity=stepRigLure({...environment,dt:0,depth:finite(s.lureDepth),currentMps:flow,boatSpeedMps:0});
  const terminal=lure.height>0?1.47:gravity.sinkRate,weight=environment.weightGrams*.001*9.81*.91,mass=Math.max(.04,environment.weightGrams*.002+paid*.003);
  const response=1-Math.exp(-dt*weight/(mass*Math.max(.05,terminal)));
  const fallSpeed=finite(s.rigFallSpeed,terminal)+(terminal-finite(s.rigFallSpeed,terminal))*response;
  // Feed the line the descending weight actually draws, rather than alternating
  // full-speed bursts and a large loose loop. Light spool resistance remains
  // visible in the rod until the sinker transfers its weight to the bottom.
  const proposed={x:lure.x+water.x,z:lure.z+water.z,height:Math.max(-fullDepth,lure.height-fallSpeed*dt)};
  if(reelMode==='free'&&dt>0){
   payoutRate=clamp((separation(tip,proposed)+.025-paid)/dt,0,resting?2.4:1.65);
   if(seabedResting){
    // The settled sinker no longer pulls the spool. Residual spool motion,
    // current and boat heave only spill a slow, bounded loose loop.
    // Preserve the existing loose loop while the boat moves away. Feeding
    // only max(drift demand, residual feed) would spend that residual on boat
    // movement and silently keep a drifting bottom rig almost taut forever.
    const loopLimit=.9+Math.min(.8,flow*.6),slack=Math.max(0,paid-separation(s.rodTip||oldTip,lure));
    const slowFeed=.03+Math.min(.06,flow*.025+Math.max(0,finite(environment.waveHeight))*.008);
    const looseLoop=Math.min(loopLimit,slack+slowFeed*dt);
    payoutRate=clamp((separation(tip,proposed)+looseLoop-paid)/dt,0,2.4);
   }
  }
  paid=clamp(paid+(payoutRate-retrieveRate)*dt,.08,MAX_PAID_LINE_METERS);
  lure.x+=water.x;lure.z+=water.z;
  const horizontal=Math.hypot(lure.x-tip.x,lure.z-tip.z),verticalBudget=Math.max(0,Math.sqrt(Math.max(0,paid*paid-horizontal*horizontal))-tip.height);
  const presentation=stepRigLure({...environment,fishingDepthMeters:rig.layer==='midwater'?bottom:s.fishingDepthMeters??environment.fishingDepthMeters,dt,depth:finite(s.lureDepth),currentMps:flow,boatSpeedMps:0,lineOutMeters:verticalBudget+rig.baitAboveBottom,retrieveSpeedMps:0,pumping:false,pumpHeight:0});
  // Integrate gravity BEFORE enforcing the fixed rope length. Capping the
  // proposed depth to today's horizontal budget first pins a towed sinker at
  // the surface: it never gets a downward step to swing beneath the rod.
  // The following 3D projection is the sole geometric line-length constraint;
  // the integration cannot pay out a single centimetre from a braked spool.
  lure.height=Math.max(-fullDepth,lure.height-fallSpeed*dt);
  // Moving the actual tip upward takes slack first, then raises the rig.
  const constrained=constrainLure(lure,tip,paid);Object.assign(lure,constrained);
  if(dt>0)rigVelocity={vx:water.vx+(lure.x-proposed.x)/dt,vz:water.vz+(lure.z-proposed.z)/dt};
  const depth=Math.max(0,-lure.height),taut=separation(tip,lure)>paid-.45;
  const contact=bottom-depth-rig.baitAboveBottom<=.18;
  load=(finite(s.rigWeightGrams,rig.defaultWeightGrams)*.001*9.81*.91+lineDrag)*(taut?.95:.15)*(reelMode==='free'?.68:1);
  if(contact&&retrieveRate===0)load=lineDrag*(taut?.18:.035);
  presentation.depth=depth;presentation.targetDepth=Math.min(fullDepth,Math.max(0,verticalBudget));presentation.bottomContact=contact;presentation.nearBottom=bottom-depth<=Math.max(1.1,rig.baitAboveBottom+.35);presentation.pumpHeight=pumpHeight;presentation.liftVelocity=dt?(tip.height-oldTip.height)/dt:0;
  // Activity and snag factors still receive the real relative flow and actual
  // crank action rather than an unrelated boat-speed scalar.
  const activity=stepRigLure({...environment,dt:0,depth,currentMps:flow,boatSpeedMps:0,lineOutMeters:paid,retrieveSpeedMps:retrieveRate,pumping:s.pumping});
  presentation.attraction=activity.attraction;presentation.snagRiskPerSecond=activity.snagRiskPerSecond;
  return finish({presentation,depth});
 }
 const pull=Math.max(0,finite(fishPullN)),initialSlack=Math.max(0,paid-separation(tip,lure));
 if(reelMode==='free'){
  // A fish first consumes the loose loop; only its remaining displacement
  // pulls fresh line from an open spool. Full spool is a hard end only taut.
  payoutRate=dt?clamp(.4+pull*.07-initialSlack/dt,0,3):0;
  load=paid>=MAX_PAID_LINE_METERS-.01&&initialSlack<.06?pull:initialSlack>.3?0:.25;
 }
 else{
  payoutRate=initialSlack>.3?0:clamp((pull-dragThresholdN)*.16,0,2.4);
  retrieveRate*=pull>dragThresholdN?.08:clamp(1-pull/(dragThresholdN*1.8),.25,1);
  // A smoother purchased drag reduces the breakaway shock, not the chosen
  // steady drag setting. Merely carrying that reel gives no benefit.
  const startingSlip=finite(s.payoutRate)<=.01&&payoutRate>.01,shock=startingSlip?.08*clamp(finite(smooth,1),.3,1):.08;
  const stopAtSpoolEnd=paid>=MAX_PAID_LINE_METERS-.01&&initialSlack<.06;
  load=Math.min(pull+retrieveRate*3+Math.max(0,pumpHeight-oldPump)*18/Math.max(.01,dt),stopAtSpoolEnd?150:dragThresholdN*(1+shock));
 }
 paid=clamp(paid+(payoutRate-retrieveRate)*dt,.08,MAX_PAID_LINE_METERS);
 // Fish movement is continuous from the actual hooked rig. There is no
 // invented 20 m run at the hook transition. Fish pull makes slack taut.
 const d=Math.max(.001,separation(tip,lure)),outward=Math.min(Math.max(0,paid-d),dt*(.4+pull*.07));
 lure.x+=(lure.x-tip.x)/d*outward+finite(current.x)*dt;
 lure.z+=(lure.z-tip.z)/d*outward+finite(current.z)*dt;
 if(!fishMotion?.jumpActive)lure.height+=(lure.height-tip.height)/d*outward;
 if(fishMotion){
  const horizontal=Math.hypot(lure.x-tip.x,lure.z-tip.z),angle=finite(s.heading)-finite(s.rodAzimuth,70)*Math.PI/180;
  const dx=horizontal>.001?(lure.x-tip.x)/horizontal:-Math.sin(angle),dz=horizontal>.001?(lure.z-tip.z)/horizontal:-Math.cos(angle);
  const lateral=finite(fishMotion.lateralMps)*dt,run=Math.min(finite(fishMotion.runSpeedMps)*dt,Math.max(0,paid-d)+payoutRate*dt);
  lure.x+=dx*run-dz*lateral;lure.z+=dz*run+dx*lateral;
  lure.height=fishMotion.jumpActive?lure.height-finite(fishMotion.diveMps)*dt:Math.min(0,lure.height-finite(fishMotion.diveMps)*dt);
 }
 if(lure.height< -bottom+.08){
  lure.height=-Math.max(0,bottom-.08);const vertical=tip.height-lure.height,radial=Math.sqrt(Math.max(0,(d+outward)**2-vertical**2)),horizontal=Math.hypot(lure.x-tip.x,lure.z-tip.z);
  const angle=finite(s.heading)-finite(s.rodAzimuth,70)*Math.PI/180,dx=horizontal>.001?(lure.x-tip.x)/horizontal:-Math.sin(angle),dz=horizontal>.001?(lure.z-tip.z)/horizontal:-Math.cos(angle);
  lure.x=tip.x+dx*Math.max(horizontal,radial);lure.z=tip.z+dz*Math.max(horizontal,radial);
 }
 Object.assign(lure,constrainLure(lure,tip,paid));
 if(paid-separation(tip,lure)>.3)load=0;
 return finish({presentation:s.rigPresentation,depth:Math.max(0,-lure.height)});

 function finish({presentation,depth}){
  // Report actual spool travel at end stops, not requested rates: the audio and
  // spool drawing must be silent/stationary when no line can move.
  if(dt>0){const previous=clamp(finite(s.paidLineMeters),0,MAX_PAID_LINE_METERS),delta=(paid-previous)/dt;
   if(delta<payoutRate-retrieveRate)payoutRate=Math.max(0,delta+retrieveRate);
   else if(delta>payoutRate-retrieveRate)retrieveRate=Math.max(0,payoutRate-delta);
  }
  if(dt>0&&!s.snagged&&fishPullN!=null)rigVelocity={vx:(lure.x-startLure.x)/dt,vz:(lure.z-startLure.z)/dt};
  const entry=lineWaterEntry(tip,lure),slack=Math.max(0,paid-separation(tip,lure));
  return{rigFallSpeed:dt>0?(startLure.height-lure.height)/dt:finite(s.rigFallSpeed),rigVelocity,paidLineMeters:paid,bobber:lure,lureDepth:depth,lineDistance:Math.hypot(lure.x-finite(s.boatX),lure.z-finite(s.boatZ)),pumpHeight,reelMode,crankRate,rodTip:tip,lineEntry:entry,floatPosition:rig.id==='float'?{x:lure.x,z:lure.z,height:0}:null,rigPresentation:presentation,lineSlackMeters:slack,snagStretchMeters,payoutRate,retrieveRate,dragThresholdN,relativeFlowMps:flow,...smoothRod(s,load,dt,strength,sensitivity)};
 }
}
