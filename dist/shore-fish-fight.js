import {fishSpecies} from './fish-species.js';

/** Hooked shore/bank fish, in metres and active seconds. These coefficients are
 * game tuning, not measured species forces/jump frequencies. Habitat evidence
 * and the limits of the behavioural inference: docs/shore-fight-behavior.md.
 * No rig creates a float here: the moving object is the hooked fish itself.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
const unit=n=>clamp(finite(n),0,1);
const profile=values=>Object.freeze({base:.13,burst:.55,speed:.95,runSeconds:1.7,restSeconds:2.8,shakeHz:4.2,lateral:.6,dive:.14,depthRatio:.64,depthCap:8,endurance:1,jump:false,...values});
export const SHORE_FIGHT_PROFILES=Object.freeze({
 barred_surfperch:profile({burst:.65,lateral:.72,depthRatio:.66}),
 redtail_surfperch:profile({burst:.7,speed:1.05,runSeconds:1.9,lateral:.8,depthRatio:.68,endurance:1.1}),
 calico_surfperch:profile({burst:.57,runSeconds:1.5,lateral:.67,depthRatio:.72}),
 silver_surfperch:profile({base:.1,burst:.47,speed:.8,runSeconds:1.2,restSeconds:2.2,shakeHz:5.5,lateral:.75,depthRatio:.42,endurance:.8}),
 walleye_surfperch:profile({base:.1,burst:.5,speed:.88,runSeconds:1.3,restSeconds:2.5,shakeHz:5,lateral:.8,depthRatio:.4,endurance:.85}),
 shiner_perch:profile({base:.08,burst:.35,speed:.62,runSeconds:.8,restSeconds:2,shakeHz:6.5,lateral:.42,depthRatio:.55,endurance:.65}),
 pile_perch:profile({base:.2,burst:.75,speed:1.02,runSeconds:2.2,restSeconds:3.3,shakeHz:3.4,lateral:.55,dive:.34,depthRatio:.85,endurance:1.3}),
 striped_seaperch:profile({base:.18,burst:.69,speed:1,runSeconds:2,restSeconds:3,shakeHz:3.7,lateral:.65,dive:.29,depthRatio:.81,endurance:1.2}),
 jacksmelt:profile({base:.19,burst:.9,speed:1.25,runSeconds:1.4,restSeconds:1.6,shakeHz:7.2,lateral:1.05,dive:.08,depthRatio:.2,depthCap:.55,endurance:1.15,jump:true,jumpFraction:.82,jumpSpeed:2.35,jumpRest:7}),
 white_croaker:profile({base:.1,burst:.36,speed:.63,runSeconds:.9,restSeconds:3.6,shakeHz:4.3,lateral:.34,dive:.12,depthRatio:.9,endurance:.75}),
 california_halibut:profile({base:.23,burst:.7,speed:1.2,runSeconds:2.3,restSeconds:5.8,shakeHz:2.7,lateral:.85,dive:.5,depthRatio:.96,endurance:1.45}),
 striped_bass:profile({base:.24,burst:.86,speed:1.65,runSeconds:3.8,restSeconds:3.5,shakeHz:3.7,lateral:.85,dive:.25,depthRatio:.62,endurance:1.75}),
 chinook_salmon:profile({base:.25,burst:1.05,speed:2,runSeconds:5.2,restSeconds:4.4,shakeHz:3.2,lateral:1,dive:.4,depthRatio:.65,endurance:2.3,jump:true,jumpFraction:.32,jumpSpeed:3.05,jumpRest:18}),
});
const FALLBACK=profile({});
export function shoreFightProfile(fish={}) { return SHORE_FIGHT_PROFILES[fishSpecies(fish)?.id]||FALLBACK; }
function seedNumber(seed){
 if(Number.isFinite(seed))return Math.abs(Math.trunc(seed*1009))>>>0;
 let n=2166136261;for(const c of String(seed??''))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;
}
function noise(seed,index=0){let n=(seed+Math.imul(index+1,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return((n^(n>>>15))>>>0)/4294967296;}

/** seed fixes individual variation; depth is positive below the local surface. */
export function createShoreFightMotion(fish={}, {depth=1,seed=1,energy=1}={}) {
 const p=shoreFightProfile(fish),n=seedNumber(seed),variation=noise(n);
 return {speciesId:fishSpecies(fish)?.id||'unknown',seed:n,variation,elapsed:0,
  depth:Math.max(0,finite(depth,1)),airHeight:0,jumpActive:false,jumpVelocity:0,
  jumpCooldown:(p.jumpRest||8)*(.35+variation*.6),jumpCount:0,
  splash:0,run:0,headShake:0,lateral:0,lateralVelocity:0,diveVelocity:0,
  energy:unit(energy),phase:'glide',pull:0,verticalPickup:0,surfaceStartleUsed:false,surfaceBurstSeconds:0};
}

function advance(previous,fish,input,dt){
 const p=shoreFightProfile(fish),s={...previous};
 const mass=clamp(finite(fish.weightKg,finite(fish.kg,.5)),.01,80);
 const massForce=Math.pow(mass,.42),massSpeed=Math.pow(mass,.1);
 const tension=unit(input.tension),lift=unit(input.rodLift),reel=unit(input.reelSpeed),drag=unit(input.drag);
 const waterDepth=Math.max(0,finite(input.waterDepth,Math.max(1,s.depth)));
 const distance=Math.max(0,finite(input.lineDistance,20));
 const energy=unit(s.energy),fatigue=.13+.87*Math.sqrt(energy),loaded=clamp((tension-.04)/.5,0,1);
 const age=finite(s.elapsed)+dt,variation=unit(s.variation),tempo=.87+variation*.26;
 const runSeconds=p.runSeconds*tempo,cycle=runSeconds+p.restSeconds*tempo;
 const cycleTime=(age+variation*cycle*.55)%cycle;
 let envelope=cycleTime<runSeconds?Math.sin(Math.PI*cycleTime/runSeconds)**.7:0;
 // A hurried flatfish can make one final submerged escape toward the bottom.
 // This is conservative angling inference, not an obligatory landing event.
 const startle=s.speciesId==='california_halibut'&&!s.surfaceStartleUsed&&s.depth<.75&&s.depth>.03&&energy>.25&&reel>.35&&tension>.18;
 s.surfaceStartleUsed=Boolean(s.surfaceStartleUsed||startle);
 s.surfaceBurstSeconds=startle?1.6:Math.max(0,finite(s.surfaceBurstSeconds)-dt);
 if(s.surfaceBurstSeconds>0)envelope=Math.max(envelope,.9);
 const headShake=(.5+.5*Math.sin(age*p.shakeHz*Math.PI*2+variation*5))*envelope*fatigue;
 let run=p.speed*massSpeed*envelope*fatigue;
 const pull=clamp((p.base+p.burst*envelope)*massForce*fatigue*(.91+.09*headShake)*.64,0,1);
 // Sustained work under line pressure tires fish. Slack allows modest recovery;
 // simply waiting with a slack line never empties a countdown health bar.
 const effort=loaded*(.18+pull*.45+envelope*.25+reel*.45+lift*.12+drag*.12);
 const capacity=38*p.endurance*Math.pow(mass,.23);
 s.energy=clamp(energy-effort*dt/capacity+(loaded<.02?.004*dt:0),0,1);
 s.splash=Math.max(0,finite(s.splash)-dt/ .7);
 s.jumpCooldown=Math.max(0,finite(s.jumpCooldown)-dt);
 let depth=clamp(finite(s.depth),0,waterDepth),airHeight=Math.max(0,finite(s.airHeight));
 const nearBank=1-clamp((distance-2.5)/22,0,1);
 const bankLift=nearBank*loaded*(lift*.65+reel*.35);
 // Close to a steep bank or pier, radial distance can stop decreasing while
 // winding still raises the submerged fish. Keep that vertical pickup rather
 // than trapping it forever at a fixed fraction of a deep seabed's depth.
 const pickupReach=1-clamp((distance-3)/5,0,1);
 s.verticalPickup=Math.max(0,finite(s.verticalPickup)+pickupReach*loaded*reel*(.45+.9*lift)*dt-(loaded<.08?.45*dt:0));
 const jumpIndividual=p.jump&&variation<p.jumpFraction;
 // Individuals may approach the surface on a loaded rising rod. A jump can
 // launch only after this continuous ascent actually reaches the surface.
 const surfaceAttempt=jumpIndividual&&energy>.4&&s.jumpCooldown===0&&envelope>.25&&loaded>.12&&(lift>.5||depth<.12);
 let targetDepth=Math.max(0,Math.min(p.depthCap,waterDepth*p.depthRatio)*(1-.91*bankLift)-s.verticalPickup);
 if(surfaceAttempt)targetDepth=0;
 const maxDive=(p.dive*envelope+(s.surfaceBurstSeconds>0?.55:0))*fatigue;
 let diveVelocity=clamp((targetDepth-depth)*1.15,-.4-.8*lift*loaded,.55)+maxDive*(1-bankLift);
 if(surfaceAttempt)diveVelocity=Math.min(diveVelocity,-(.22+.42*lift*loaded));
 if(!s.jumpActive){
  const minDepth=Math.min(waterDepth,surfaceAttempt?0:.025);
  depth=clamp(depth+diveVelocity*dt,minDepth,waterDepth);
  airHeight=0;
  if(jumpIndividual&&energy>.4&&s.jumpCooldown===0&&envelope>.25&&depth<=.025&&waterDepth>.16&&distance>2.7){
   s.jumpActive=true;s.jumpVelocity=p.jumpSpeed*(.88+.18*variation)*(.75+.25*energy);
   s.splash=Math.max(s.splash,.35);s.jumpCount=finite(s.jumpCount)+1;
  }
 }
 if(s.jumpActive){
  const height=airHeight>0?airHeight:-depth,v=finite(s.jumpVelocity);
  const nextHeight=height+v*dt-4.905*dt*dt;
  s.jumpVelocity=v-9.81*dt;
  if(nextHeight<=0&&s.jumpVelocity<0){
   s.jumpActive=false;s.jumpVelocity=0;s.splash=1;
   s.jumpCooldown=p.jumpRest*(.85+noise(s.seed,s.jumpCount)*.6);
   airHeight=0;depth=clamp(-nextHeight,0,waterDepth);
   s.energy=Math.max(0,s.energy-.018);
  }else{airHeight=Math.max(0,nextHeight);depth=nextHeight<0?Math.min(waterDepth,-nextHeight):0;}
  diveVelocity=-s.jumpVelocity;
  run*=.6;
 }
 // The finite side-to-side displacement drives the exact same fish endpoint
 // seen by the renderer and line geometry. Player sweep acts in the sim.
 const swim=Math.sin(age*(.7+variation*.25)+variation*7)*p.lateral*(.18+envelope)*fatigue;
 const surf=clamp(finite(input.surfLoad),0,1)*Math.sin(age*.8+variation*5)*.09;
 const lateralVelocity=(swim+surf)*(s.jumpActive?.5:1)-finite(s.lateral)*(.16+.22*loaded);
 const lateralLimit=Math.max(.15,Math.min(6,distance*.25));
 s.lateral=clamp(finite(s.lateral)+lateralVelocity*dt,-lateralLimit,lateralLimit);
 return {...s,elapsed:age,depth,airHeight,run,pull,headShake:s.jumpActive?Math.max(headShake,.65*fatigue):headShake,
  lateralVelocity,diveVelocity,phase:s.jumpActive?'jump':s.surfaceBurstSeconds>0?'dive':envelope>.22?(p.dive>.3?'dive':'run'):energy<.25?'tired':'glide'};
}

/** Pure deterministic step. run/lateralVelocity/diveVelocity are m/s; lateral,
 * depth and airHeight are m. pull/headShake/splash/energy are normalized 0..1.
 * jumpVelocity is upward m/s. time is accepted for callers but elapsed state
 * owns fight timing, so a scene-clock jump cannot teleport or skip the fish.
 */
export function stepShoreFightMotion(previous,fish={},input={}) {
 let s=previous?{...previous}:createShoreFightMotion(fish);
 const duration=clamp(finite(input.dt),0,1);
 // Substeps keep ballistic surface crossings and fatigue comparable on phones.
 const steps=Math.ceil(duration/(1/60));
 for(let i=0;i<steps;i++)s=advance(s,fish,input,duration/steps);
 return s;
}
