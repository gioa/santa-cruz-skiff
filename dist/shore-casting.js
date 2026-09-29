// SI projectile model for ordinary baited shore casts, not tournament casts.
// Rod energy, effective inertia and drag are authored calibration; see
// docs/shore-casting-model.md for manufacturer guidance and model limits.
import {getShoreScene,onPier} from './shore-data.js';
import {SHORE_RIG_PHYSICS,shoreBaitLoad} from './shore-presentation.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
export const SHORE_CAST_CHARGE_MS=1800;
export const SHORE_ROD_CASTING=Object.freeze({
  starter_rod:Object.freeze({lengthM:2.13,minPayloadGrams:14,maxPayloadGrams:42}),
  surf_rod:Object.freeze({lengthM:3.05,minPayloadGrams:28,maxPayloadGrams:113}),
});
export function shoreCastPower(heldMilliseconds=0){return clamp(finite(heldMilliseconds)/SHORE_CAST_CHARGE_MS,0,1);}

export function createShoreCast(sceneId,state={},options={}){
  const scene=getShoreScene(sceneId),player=state.player||scene.spawn;
  const rod=SHORE_ROD_CASTING[state.activeRod]||SHORE_ROD_CASTING.starter_rod;
  const supply=state.rodSupplies?.[state.activeRod],rig=SHORE_RIG_PHYSICS[supply?.id]||SHORE_RIG_PHYSICS.carolina_rig;
  const bait=shoreBaitLoad(supply?.id,supply?.bait?.kind);
  const condition=clamp(finite(supply?.bait?.condition,1),0,1);
  const power=clamp(finite(options.power),0,1),aim=clamp(finite(options.aim),-1,1);
  const payloadGrams=rig.sinkerGrams+(rig.floatGrams||0)+3+bait.grams*condition;
  const mass=payloadGrams/1000,inertia=mass+.075;
  const overload=Math.max(0,payloadGrams/rod.maxPayloadGrams-1);
  const optimalPayload=(rod.minPayloadGrams+rod.maxPayloadGrams)/2;
  const loading=(.75+.25*Math.sqrt(Math.min(1,payloadGrams/optimalPayload)))/(1+1.8*overload*overload);
  // A brief tap is a small lob. Additional swing energy scales with charge;
  // rod length raises available work, but a too-heavy rig cannot exploit it.
  const lobEnergy=.5*inertia*6.2**2;
  const swingEnergy=34*(rod.lengthM/2.13)**1.8;
  const energy=lobEnergy+Math.max(0,swingEnergy-lobEnergy)*power**1.65*loading;
  const launchSpeed=Math.sqrt(2*energy/inertia),elevation=38*Math.PI/180;
  const releaseHeight=state.onPier?5.5:1.8+(rod.lengthM-2.13)*.2;
  // Aiming rotates a unit vector: diagonal casts never gain free range.
  const heading=aim*Math.PI/3,dx=Math.sin(heading),dy=-Math.cos(heading);
  const origin={x:finite(player.x,scene.spawn.x),y:finite(player.y,scene.spawn.y)-18};
  const dragArea=.0002+.00007*(rig.sinkerGrams/28)**(2/3)+bait.dragArea*(.35+.65*condition)+(rig.extraDragArea||0);
  const drag=.5*1.225*dragArea/mass,step=1/120;
  let horizontal=0,height=releaseHeight,vx=launchSpeed*Math.cos(elevation),vz=launchSpeed*Math.sin(elevation),t=0,apexHeight=height;
  const trajectory=[{t:0,x:origin.x,y:origin.y,height}];
  for(let n=1;n<=1200;n++){
    const speed=Math.hypot(vx,vz),ax=-drag*speed*vx-.055*vx,az=-9.81-drag*speed*vz;
    const nextX=horizontal+vx*step+.5*ax*step*step,nextZ=height+vz*step+.5*az*step*step;
    if(nextZ<=0){
      const fraction=height/(height-nextZ);horizontal+=(nextX-horizontal)*fraction;t+=step*fraction;height=0;
      trajectory.push({t,x:origin.x+dx*horizontal*3.2,y:origin.y+dy*horizontal*3.2,height});break;
    }
    horizontal=nextX;height=nextZ;t+=step;vx+=ax*step;vz+=az*step;apexHeight=Math.max(apexHeight,height);
    if(n%4===0)trajectory.push({t,x:origin.x+dx*horizontal*3.2,y:origin.y+dy*horizontal*3.2,height});
  }
  const end=trajectory.at(-1),target={x:end.x,y:end.y};
  const landing=target.x<24||target.x>scene.world.width-24||target.y<scene.world.minY+20?'boundary':
    onPier(scene,target.x,target.y)?'pier':target.y>=scene.shoreY(target.x)?'sand':'water';
  return{origin,target,power,aim,distance:Math.hypot(target.x-origin.x,target.y-origin.y)/3.2,
    offshoreDistance:Math.max(0,(scene.shoreY(target.x)-target.y)/3.2),landing,
    flight:0,flightDuration:end.t,trajectory,apexHeight,launchSpeed,payloadGrams,
    rodLengthM:rod.lengthM,loadRatio:payloadGrams/rod.maxPayloadGrams,
    loadLabel:overload>0?'钓组超过竿的抛重范围':payloadGrams<rod.minPayloadGrams?'钓组偏轻，竿身加载不足':'抛重适配'};
}

// One trajectory supplies both the landing calculation and the visible arc.
export function shoreCastPosition(cast={},elapsed=0){
  const duration=Math.max(.01,finite(cast.flightDuration,1)),t=clamp(finite(elapsed),0,duration);
  const points=cast.trajectory;
  if(!Array.isArray(points)||points.length<2){
    const a=cast.origin||{x:0,y:0},b=cast.target||a,f=t/duration;
    return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,height:Math.sin(Math.PI*f)*Math.min(5,finite(cast.distance)/8)};
  }
  let lo=0,hi=points.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid].t<t)lo=mid;else hi=mid;}
  const a=points[lo],b=points[hi],f=clamp((t-a.t)/Math.max(1e-9,b.t-a.t),0,1);
  return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,height:a.height+(b.height-a.height)*f};
}
