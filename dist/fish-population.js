/** Agent-based fish population shared by every destination.
 *
 * Fish exist as schools (or single fish for solitary species) that spawn from
 * the local habitat carrying capacity, move through the water, find a bait by
 * scent plume or sight, inspect it and then either bite or lose interest.
 * There is no fixed bite chance: how often a bite happens emerges from where
 * the angler fishes, which bait and rig they use, how the bait sits in the
 * water, how long it soaks, how much they splash, and what the fish are doing.
 *
 * Units: metres, seconds, cm for fish length. The plane uses (x, y) with a
 * caller-supplied environment; depth is metres below the surface. The engine
 * is deterministic for a given saved state (its xorshift RNG lives in the
 * state), so saves cannot be reloaded to reroll the fish around a bait.
 *
 * All densities, speeds, sensory ranges and bite rates are authored game
 * parameters informed by general fish behaviour, not measured values.
 */
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
export const POPULATION_STEP=.5;
const MAINTAIN_EVERY=4,STEER_EVERY=2,CACHE_BUCKET=20,SAMPLE_POINTS=36;

export function createPopulation(seed=1){
 return{version:1,rng:(Math.floor(finite(seed,1))>>>0)||1,groups:[],nextId:1,clock:0,accumulator:0,
  maintainAt:0,center:null,pendingBite:null,stimulusId:0,lastStimulus:null};
}
function random(pop){let x=pop.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;pop.rng=x>>>0||1;return pop.rng/4294967296;}
function gaussian(pop){const u=Math.max(1e-9,random(pop)),v=random(pop);return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);}
function poisson(pop,mean){if(!(mean>0))return 0;if(mean>30)return Math.max(0,Math.round(mean+Math.sqrt(mean)*gaussian(pop)));let k=0,p=1;const l=Math.exp(-mean);do{k++;p*=random(pop);}while(p>l);return k-1;}

// Restore a saved population, dropping anything malformed.
export function restorePopulation(saved,seed=1,speciesIds=null){
 const pop=createPopulation(seed);
 if(!saved||typeof saved!=='object'||saved.version!==1)return pop;
 pop.rng=(Math.floor(finite(saved.rng,seed))>>>0)||1;pop.nextId=Math.max(1,Math.floor(finite(saved.nextId,1)));
 pop.clock=Math.max(0,finite(saved.clock));pop.maintainAt=pop.clock;
 pop.center=saved.center&&Number.isFinite(saved.center.x)&&Number.isFinite(saved.center.y)?{x:saved.center.x,y:saved.center.y}:null;
 const valid=g=>g&&typeof g==='object'&&(!speciesIds||speciesIds.includes(g.species))&&['x','y','depth','heading','count','lengthCm','hunger'].every(k=>Number.isFinite(g[k]))&&g.count>=1;
 pop.groups=(Array.isArray(saved.groups)?saved.groups:[]).filter(valid).slice(0,400).map(g=>({
  id:Math.floor(finite(g.id,pop.nextId++)),species:g.species,x:g.x,y:g.y,depth:Math.max(0,g.depth),heading:g.heading,
  count:Math.min(500,Math.floor(g.count)),lengthCm:Math.max(1,g.lengthCm),hunger:clamp(g.hunger,0,1),alarm:clamp(finite(g.alarm),0,1),
  // Interrupted approaches resume as ordinary roaming; the bait was retrieved on load.
  mode:'roam',speed:0,steerAt:0,fleeUntil:0,ignoreUntil:clamp(finite(g.ignoreUntil),0,pop.clock+600),interest:0,fleeX:0,fleeY:0}));
 for(const g of pop.groups)pop.nextId=Math.max(pop.nextId,g.id+1);
 return pop;
}
export function serializePopulation(pop){
 return{version:1,rng:pop.rng,nextId:pop.nextId,clock:Math.round(pop.clock*100)/100,center:pop.center,
  groups:pop.groups.map(g=>({id:g.id,species:g.species,x:+g.x.toFixed(2),y:+g.y.toFixed(2),depth:+g.depth.toFixed(2),heading:+g.heading.toFixed(3),
   count:g.count,lengthCm:+g.lengthCm.toFixed(1),hunger:+g.hunger.toFixed(3),alarm:+g.alarm.toFixed(3),ignoreUntil:+g.ignoreUntil.toFixed(1)}))};
}

// Suitability is cached on a coarse grid per species. Tide/light/season change
// slowly, so each cell is refreshed after CACHE_BUCKET seconds.
function suitability(pop,world,def,x,y){
 const cell=world.cellSize||4,key=`${def.id}:${Math.round(x/cell)}:${Math.round(y/cell)}`,bucket=Math.floor(pop.clock/CACHE_BUCKET);
 pop._cache??=new Map();if(pop._bucket!==bucket||pop._cache.size>20000){pop._cache.clear();pop._bucket=bucket;}
 let value=pop._cache.get(key);
 if(value===undefined){value=Math.max(0,finite(world.suitability(def,Math.round(x/cell)*cell,Math.round(y/cell)*cell)));pop._cache.set(key,value);}
 return value;
}
const schoolMean=def=>(def.school[0]+def.school[1])/2;
function spawnGroup(pop,world,def,x,y){
 const count=def.school[0]+Math.floor(random(pop)*(def.school[1]-def.school[0]+1));
 // Cohorts: fish in a school are of similar size; smaller fish are commoner.
 const [low,high]=def.lengthCm,lengthCm=low+(high-low)*Math.pow(random(pop),1.6);
 const bottom=Math.max(.2,finite(world.env(x,y)?.depth,1));
 const group={id:pop.nextId++,species:def.id,x,y,depth:clamp(def.preferredDepth(bottom,world),.1,bottom),heading:random(pop)*TAU,count,lengthCm,
  hunger:clamp(finite(world.feeding?.(def),.7)*(.55+.45*random(pop)),0,1),alarm:0,mode:'roam',speed:0,steerAt:pop.clock+random(pop)*STEER_EVERY,
  fleeUntil:0,ignoreUntil:0,interest:0,fleeX:0,fleeY:0};
 pop.groups.push(group);return group;
}
function samplePoints(pop,world){
 const points=[],c=world.center,r=world.radius;
 for(let i=0;i<SAMPLE_POINTS;i++){const a=random(pop)*TAU,d=r*Math.sqrt(random(pop));points.push({x:c.x+Math.cos(a)*d,y:c.y+Math.sin(a)*d});}
 return points;
}
// Keep the number of schools near the habitat's carrying capacity. Newcomers
// arrive away from the bait; they never materialise on top of it.
function maintain(pop,world,initial){
 const c=world.center,r=world.radius,area=Math.PI*r*r/10000,points=samplePoints(pop,world),stim=world.stimulus;
 for(const def of world.species){
  const suits=points.map(p=>suitability(pop,world,def,p.x,p.y)),mean=suits.reduce((a,b)=>a+b,0)/suits.length;
  const expected=def.density*area*mean/schoolMean(def);
  const present=pop.groups.filter(g=>g.species===def.id&&Math.hypot(g.x-c.x,g.y-c.y)<=r);
  const minBaitDistance=initial?Math.min(12,r*.3):r*.45;
  const pick=()=>{let total=0;const choices=points.map((p,i)=>{const far=!stim||Math.hypot(p.x-stim.x,p.y-stim.y)>=minBaitDistance;const w=far?suits[i]:0;total+=w;return w;});
   if(!(total>0))return null;let roll=random(pop)*total;for(let i=0;i<choices.length;i++){roll-=choices[i];if(roll<0)return points[i];}return points.at(-1);};
  if(initial){const n=poisson(pop,expected);for(let i=0;i<n;i++){const p=pick();if(p)spawnGroup(pop,world,def,p.x,p.y);}continue;}
  const deficit=expected-present.length;
  if(deficit>0&&random(pop)<1-Math.exp(-deficit*MAINTAIN_EVERY/(def.arrivalSeconds||90))){const p=pick();if(p)spawnGroup(pop,world,def,p.x,p.y);}
  else if(present.length>expected*1.6+1&&random(pop)<.15){
   // Surplus schools drift away when conditions deteriorate (tide, light, season).
   const leaving=present.filter(g=>g.mode==='roam').sort((a,b)=>Math.hypot(b.x-c.x,b.y-c.y)-Math.hypot(a.x-c.x,a.y-c.y))[0];
   if(leaving)leaving.mode='leave';
  }
 }
}

// Scent concentration from a soaking bait. The plume is carried downstream at
// the current speed, widens with distance and decays; with little current the
// scent only diffuses a short way around the bait. A longer soak extends the
// plume (until the bait washes out); recasting starts a new, short plume.
export function scentAt(stimulus,x,y,mixing=0){
 if(!stimulus||!(stimulus.scent>0))return 0;
 const dx=x-stimulus.x,dy=y-stimulus.y,dist=Math.hypot(dx,dy),soak=Math.max(0,finite(stimulus.soakSeconds));
 const cx=finite(stimulus.currentX),cy=finite(stimulus.currentY),cs=Math.hypot(cx,cy);
 // Wave mixing in the surf spreads scent around the bait; a steady current
 // instead carries it away, so the halo around the bait shrinks as flow rises.
 const halo=(1.2+Math.min(6,soak*.05))*(1+1.5*clamp(mixing,0,1))/(1+4*cs);
 const near=Math.exp(-dist/halo)*Math.min(1,.25+soak/12);
 let plume=0;
 if(cs>.02){
  const along=(dx*cx+dy*cy)/cs,cross=Math.sqrt(Math.max(0,dist*dist-along*along)),reach=Math.min(60,1.5+cs*soak);
  if(along>0&&along<reach){const sigma=.6+.28*along+2*clamp(mixing,0,1);plume=Math.exp(-along/(10+25*cs))*Math.exp(-cross*cross/(2*sigma*sigma))/(1+.2*sigma);}
 }
 return stimulus.scent*Math.max(near,plume);
}
function visualAt(stimulus,def,world,g){
 if(!stimulus||!(stimulus.flash>0)||!(def.sight>0))return 0;
 const range=def.sight*clamp(finite(world.light,1),.08,1)*(1-.8*clamp(finite(world.turbidity?.(g.x,g.y),0),0,1));
 const d=Math.hypot(g.x-stimulus.x,g.y-stimulus.y,g.depth-finite(stimulus.depth));
 return range>0?stimulus.flash*clamp(1-d/range,0,1):0;
}
// Can this fish comfortably reach the bait's depth from its preferred layer?
function reachable(def,g,stimulus,world){
 const bottom=Math.max(.2,finite(world.env(stimulus.x,stimulus.y)?.depth,1)),pref=def.preferredDepth(bottom,world);
 return Math.abs(finite(stimulus.depth)-pref)<=def.verticalReach(bottom);
}

function steer(pop,world,def,g){
 const probe=def.probeMeters||6,angles=[-.8,0,.8];
 const scores=angles.map(a=>{const h=g.heading+a;return Math.pow(suitability(pop,world,def,g.x+Math.cos(h)*probe,g.y+Math.sin(h)*probe),2)+.02;});
 const here=suitability(pop,world,def,g.x,g.y);
 let total=scores.reduce((a,b)=>a+b,0),roll=random(pop)*total,choice=1;
 for(let i=0;i<3;i++){roll-=scores[i];if(roll<0){choice=i;break;}}
 // In poor water, turn decisively; in good water, meander.
 g.heading+=angles[choice]*(here<.08?1.6:.6)+gaussian(pop)*(def.turnNoise??.35);
 // Kinesis: fish linger (swim slowly) where habitat is good, travel where it is poor.
 g.speed=def.cruise*(.55+.45*clamp(1-here,0,1))*(.7+.3*random(pop));
}

function moveGroup(pop,world,def,g,dt,stimulus){
 const env=world.env(g.x,g.y)||{},bottom=Math.max(.2,finite(env.depth,1));
 let vx=0,vy=0,targetDepth=def.preferredDepth(bottom,world);
 if(g.mode==='flee'&&pop.clock<g.fleeUntil){vx=g.fleeX*def.burst;vy=g.fleeY*def.burst;}
 else if((g.mode==='track'||g.mode==='inspect')&&stimulus){
  const dx=stimulus.x-g.x,dy=stimulus.y-g.y,d=Math.hypot(dx,dy);
  if(g.mode==='track'){const sp=Math.min(def.burst*.7,def.cruise*2.2);vx=dx/Math.max(d,.01)*Math.min(sp,d/dt);vy=dy/Math.max(d,.01)*Math.min(sp,d/dt);}
  else{vx=dx*.8;vy=dy*.8;}
  targetDepth=finite(stimulus.depth,targetDepth);
 }else{
  if(g.mode==='flee')g.mode='roam';
  if(pop.clock>=g.steerAt){steer(pop,world,def,g);g.steerAt=pop.clock+STEER_EVERY*(.6+.8*random(pop));}
  if(g.mode==='leave'){const c=world.center,dx=g.x-c.x,dy=g.y-c.y,d=Math.hypot(dx,dy)||1;g.heading=Math.atan2(dy,dx);g.speed=def.cruise*1.5;vx=dx/d*g.speed;vy=dy/d*g.speed;}
  else{vx=Math.cos(g.heading)*g.speed;vy=Math.sin(g.heading)*g.speed;}
 }
 // Fish hold station against most of the current; a little still carries them.
 vx+=finite(env.currentX)*.15;vy+=finite(env.currentY)*.15;
 const nx=g.x+vx*dt,ny=g.y+vy*dt,next=world.env(nx,ny);
 if(next&&next.water!==false&&finite(next.depth)>.15){g.x=nx;g.y=ny;}else{g.heading+=Math.PI*(.6+.8*random(pop));}
 const floor=Math.max(.1,finite((next&&next.water!==false?next:env).depth,bottom)-.05);
 g.depth=clamp(g.depth+clamp(targetDepth-g.depth,-.35*dt,.35*dt),.05,floor);
}

/** Advance the population. `world` supplies:
 *  species[]: engine species definitions (see docs/fish-population-model.md)
 *  center/radius: the active area around the angler (metres)
 *  env(x,y): {water, depth, currentX, currentY}
 *  suitability(def,x,y): relative carrying capacity (1 = good habitat now)
 *  feeding(def): 0..1 current appetite level (time of day, season, sea state)
 *  light: 0..1 ambient light for sight; turbidity(x,y): 0..1; mixing: 0..1
 *  stimulus: null or the bait {id,x,y,depth,scent,flash,motion,soakSeconds,currentX,currentY,appeal(def,group)}
 * Returns events: {type:'bite'|'nibble'|'arrive'|'leave', group, species, lengthCm}. */
export function stepPopulation(pop,dt,world){
 const events=[];pop.accumulator+=Math.max(0,finite(dt));
 while(pop.accumulator>=POPULATION_STEP){pop.accumulator-=POPULATION_STEP;tick(pop,POPULATION_STEP,world,events);}
 return events;
}
function tick(pop,dt,world,events){
 pop.clock+=dt;
 const c=world.center,r=world.radius,defs=Object.fromEntries(world.species.map(d=>[d.id,d]));
 // A large jump (teleport, new destination, fast boat run) refills the area.
 const jumped=!pop.center||Math.hypot(pop.center.x-c.x,pop.center.y-c.y)>r*.75;
 if(jumped){pop.groups=pop.groups.filter(g=>Math.hypot(g.x-c.x,g.y-c.y)<=r*1.3&&defs[g.species]);pop.center={x:c.x,y:c.y};maintain(pop,world,true);pop.maintainAt=pop.clock+MAINTAIN_EVERY;}
 else if(pop.clock>=pop.maintainAt){pop.maintainAt=pop.clock+MAINTAIN_EVERY;pop.center={x:c.x,y:c.y};maintain(pop,world,false);}
 let stimulus=world.stimulus&&Number.isFinite(world.stimulus.x)?world.stimulus:null;
 if((stimulus?.id??null)!==pop.lastStimulus){
  // A new cast or retrieved bait: fish following the old bait go back to roaming.
  for(const g of pop.groups)if(g.mode==='track'||g.mode==='inspect'){g.mode='roam';g.interest=0;}
  pop.lastStimulus=stimulus?.id??null;pop.pendingBite=null;
 }
 for(const g of pop.groups){
  const def=defs[g.species];if(!def)continue;
  g.hunger=clamp(g.hunger+(finite(world.feeding?.(def),.7)-g.hunger)*dt/900,0,1);
  g.alarm=Math.max(0,g.alarm-dt/(def.calmSeconds||40));
  if(stimulus&&!pop.pendingBite)senseAndDecide(pop,world,def,g,dt,stimulus,events);
  moveGroup(pop,world,def,g,dt,stimulus);
 }
 const before=pop.groups.length;
 pop.groups=pop.groups.filter(g=>g.count>0&&Math.hypot(g.x-c.x,g.y-c.y)<=r*1.4);
 if(pop.groups.length<before)events.push({type:'leave',count:before-pop.groups.length});
}

function senseAndDecide(pop,world,def,g,dt,stimulus,events){
 if(g.mode==='flee'||g.mode==='leave'||pop.clock<g.ignoreUntil)return;
 const d3=Math.hypot(g.x-stimulus.x,g.y-stimulus.y,g.depth-finite(stimulus.depth));
 if(g.mode==='roam'){
  if(!reachable(def,g,stimulus,world))return;
  const scent=scentAt(stimulus,g.x,g.y,world.mixing),seen=visualAt(stimulus,def,world,g);
  // Lateral line: a working lure or struggling bait is felt nearby, day or night.
  const felt=finite(stimulus.motion)*clamp(1-d3/(def.lateralMeters||4),0,1);
  const appetite=Math.pow(g.hunger,1.5)*(1-g.alarm);
  const rate=(def.smell*8*scent+def.sightDrive*3*seen+2*felt)*appetite;
  if(random(pop)<1-Math.exp(-rate*dt)){g.mode='track';g.interest=1;}
  return;
 }
 if(g.mode==='track'){
  if(d3<1.1){g.mode='inspect';g.interest=1;}
  else if(d3>(def.giveUpMeters||35)){g.mode='roam';g.ignoreUntil=pop.clock+30;}
  return;
 }
 // Inspecting: each fish in the school may take the bait. Competition in a
 // larger school makes individuals bolder; alarm and a poor bait make them shy.
 const appeal=Math.max(0,finite(stimulus.appeal(def,g),0));
 const competition=1+.12*Math.min(g.count-1,12);
 // Appeal matters twice: a poor bait or rig is taken less often and the fish
 // also give up on it sooner.
 const rate=def.biteRate*appeal*appeal*Math.pow(g.hunger,1.2)*(1-g.alarm)*competition;
 if(random(pop)<1-Math.exp(-rate*dt)){
  const lengthCm=clamp(g.lengthCm*(1+(def.cohortSd??.07)*gaussian(pop)),def.lengthCm[0]*.9,def.lengthCm[1]*1.05);
  pop.pendingBite={group:g.id,species:g.species,lengthCm};
  events.push({type:'bite',group:g.id,species:g.species,lengthCm});return;
 }
 if(appeal>.05&&random(pop)<.08*dt)events.push({type:'nibble',group:g.id,species:g.species});
 g.interest-=dt/(def.patience||20)*(1+2*(1-Math.min(1,appeal)));
 if(g.interest<=0){g.mode='roam';g.ignoreUntil=pop.clock+90+random(pop)*150;}
}

/** Outcome of the most recent bite. `hooked` removes that fish from its school;
 * `missed` means the fish felt the hook and left; `refused` frees the bite. */
export function resolveBite(pop,outcome,defs=[]){
 const bite=pop.pendingBite;pop.pendingBite=null;if(!bite)return null;
 const g=pop.groups.find(x=>x.id===bite.group);if(!g)return bite;
 const def=defs.find(d=>d.id===g.species)||{};
 if(outcome==='hooked'){
  g.count--;g.hunger=Math.max(0,g.hunger-.05);
  // A struggling schoolmate alarms wary species; bold schools stay nearby.
  g.alarm=clamp(g.alarm+.15+.55*finite(def.wariness,.5),0,1);
  if(finite(def.wariness,.5)>.55){g.mode='roam';g.ignoreUntil=Math.max(g.ignoreUntil,pop.clock+20+60*def.wariness);}
 }else if(outcome==='missed'){
  g.alarm=clamp(g.alarm+.3+.5*finite(def.wariness,.5),0,1);g.mode='roam';g.ignoreUntil=pop.clock+40+120*finite(def.wariness,.5);
 }
 return bite;
}
/** A sinker splash, footsteps on a pier or an outboard spooks nearby fish. */
export function disturb(pop,{x,y,radius=3,strength=.5},defs=[]){
 for(const g of pop.groups){
  const def=defs.find(d=>d.id===g.species);if(!def)continue;
  const d=Math.hypot(g.x-x,g.y-y);if(d>radius)continue;
  const fright=strength*(1-d/radius)*finite(def.wariness,.5);
  g.alarm=clamp(g.alarm+fright,0,1);
  if(fright>.25&&g.mode!=='inspect'){const len=d||1;g.mode='flee';g.fleeX=(g.x-x)/len;g.fleeY=(g.y-y)/len;g.fleeUntil=pop.clock+2+4*fright;}
 }
}
/** Test/QA fixture: place a school at a position (it still has to find the
 * bait, inspect it and decide to bite through the normal model). */
export function placeSchool(pop,world,speciesId,x,y,overrides={}){
 const def=world.species.find(d=>d.id===speciesId);if(!def)throw new Error('Unknown species '+speciesId);
 const g=spawnGroup(pop,world,def,x,y);Object.assign(g,overrides);if(!pop.center)pop.center={...world.center};return g;
}
/** Read-only summary for status text and fish-finders. */
export function populationNear(pop,{x,y},radius){
 return pop.groups.filter(g=>Math.hypot(g.x-x,g.y-y)<=radius).map(g=>({species:g.species,count:g.count,depth:g.depth,distance:Math.hypot(g.x-x,g.y-y),mode:g.mode}));
}
