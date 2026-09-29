/** Santa Cruz encounter model. Sources and limitations are documented in
 * docs/pixel-fishing-ecology-evidence.md. Coefficients are game tuning, NOT
 * measured bite percentages. Seasons describe availability, never legality.
 * Every species uses the same unnormalised weight for both encounter timing
 * and conditional selection; poor presentations therefore mean fewer bites. */
import {getRigProfile,rigSpeciesKey} from './fishing-rigs.js';
import {USABLE_CONDITION} from './pixel-consumables.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const bell=(v,centre,width)=>Math.exp(-.5*((v-centre)/width)**2);
const months=a=>Object.freeze(a);
const resident=months(Array(12).fill(1));
export const MONTHLY_AVAILABILITY=Object.freeze({
 blue:resident,copper:resident,vermilion:resident,lingcod:resident,sanddab:resident,
 croaker:resident,
 halibut:months([.2,.23,.4,.7,.85,.9,1,1,.9,.7,.4,.25]),
 mackerel:months([.35,.3,.35,.45,.55,.75,1,1,1,1,.85,.5]),
 salmon:months([.12,.15,.4,.85,1,.95,.85,.65,.4,.25,.15,.12]),
 seabass:months([.12,.12,.18,.28,.45,.7,.95,1,1,.8,.35,.18]),
 bonito:months([.12,.12,.18,.3,.45,.65,.85,1,1,.85,.5,.2]),
});

// Preferred depth bands are smooth game envelopes inside broad real ranges;
// neither their edges nor the nonzero tails claim biological exclusion limits.
const SPECIES=Object.freeze({
 croaker:{density:1.25,depth:[3,30,18],layer:'sand',habitat:{sand:1.1,mud:1.1,mixed:.4,kelp:.09,reef:.015,unknown:.35}},
 sanddab:{density:1,depth:[30,95,35],layer:'sand',habitat:{sand:1.1,mud:1,mixed:.3,kelp:.08,reef:.015,unknown:.3}},
 blue:{density:1,depth:[3,65,12],layer:'school',habitat:{reef:1,kelp:1.15,mixed:.6,sand:.035,mud:.02,unknown:.18}},
 copper:{density:.85,depth:[4,85,15],layer:'structure',habitat:{reef:1,kelp:.9,mixed:.55,sand:.012,mud:.008,unknown:.12}},
 vermilion:{density:1,rarity:.36,depth:[18,150,16],layer:'structure',habitat:{reef:1.1,kelp:.5,mixed:.48,sand:.008,mud:.005,unknown:.1}},
 lingcod:{density:.65,depth:[6,100,16],layer:'structure',habitat:{reef:1.1,kelp:.85,mixed:.45,sand:.009,mud:.005,unknown:.1}},
 halibut:{density:.6,depth:[5,38,18],layer:'sand',habitat:{sand:1.1,mud:.7,mixed:.8,kelp:.28,reef:.04,unknown:.3}},
 mackerel:{density:1.15,depth:[2,150,35],layer:'pelagic',habitat:{sand:1,mud:.9,mixed:1,kelp:1,reef:.9,unknown:.8}},
 salmon:{density:1,rarity:.09,depth:[18,200,14],layer:'salmon',habitat:{sand:1,mud:1,mixed:.9,kelp:.6,reef:.8,unknown:.6}},
 seabass:{density:1,rarity:.025,depth:[4,55,16],layer:'seabass',habitat:{sand:.6,mud:.4,mixed:.85,kelp:1.2,reef:.6,unknown:.35}},
 bonito:{density:1,rarity:.12,depth:[5,150,20],layer:'pelagic',habitat:{sand:1,mud:.9,mixed:1,kelp:.8,reef:.85,unknown:.65}},
});

function speciesKey(fish){return SPECIES[typeof fish==='string'?fish:fish?.id]?typeof fish==='string'?fish:fish.id:rigSpeciesKey(fish);}
export function monthlyAvailability(fish,month=9){
 return MONTHLY_AVAILABILITY[speciesKey(fish)]?.[clamp(Math.floor(finite(month,9)),1,12)-1]??1;
}

function depthAffinity(bottom,[low,high,tail]){
 const outside=Math.max(low-bottom,0,bottom-high);
 const width=bottom<low?Math.max(1.5,low*.25):tail;
 return .003+.997*Math.exp(-.5*(outside/width)**2);
}

function environment(options){
 const rig=getRigProfile(options.rig),bottom=Math.max(.1,finite(options.bottomDepth??options.depth,12));
 const depth=clamp(finite(options.lureDepth,bottom-rig.baitAboveBottom),0,bottom);
 // Current past a held/anchored boat is not a drift across new seabed.
 const speed=options.anchored?0:Math.abs(finite(options.driftSpeedMps,finite(options.boatSpeedMps)));
 const retrieve=clamp(finite(options.retrieveSpeedMps),0,3);
 const slowDrift=clamp(speed/.12,0,1)*bell(speed,.3,.5);
 const troll=clamp(speed/.35,0,1)*bell(speed,1.05,.75);
 // A held button/rod angle is not continuing jig motion after the finite
 // physical stroke. The simulation supplies measured bait movement instead.
 const action=clamp(Math.max(Math.abs(finite(options.lureVerticalSpeedMps))/.65,retrieve/.45),0,1);
 // Bait identity and rig geometry are independent: a soft plastic on a
 // plain 2/0 hook is still a lure. Only built-in lures can receive a tip bonus.
 const lureRig=['jig','sabiki','feather40'].includes(rig.id);
 const softPlastic=!lureRig&&options.bait==='jig',artificial=lureRig||softPlastic;
 return{rig,bottom,depth,above:bottom-depth,speed,slowDrift,troll,action,artificial,softPlastic,
  tip:lureRig&&options.baitTipped?options.bait:null,tipFreshness:clamp(finite(options.tipFreshness),0,1),
  live:options.baitForm==='live'||options.liveBait===true,
  bait:artificial?'artificial':options.bait||'squid',month:clamp(Math.floor(finite(options.month,9)),1,12)};
}

function tipAffinity(key,e){
 if(!e.tip||e.tipFreshness<=USABLE_CONDITION)return 1;
 const fishBait=['anchovy','sardine'].includes(e.tip);
 const boost=['blue','copper','vermilion'].includes(key)?(e.tip==='jig'?.08+.16*e.action:e.tip==='squid'?.18:fishBait?.12:.08):
  key==='lingcod'?(e.tip==='jig'?.06+.18*e.action:fishBait?.16:e.tip==='squid'?.1:.03):
  key==='halibut'?(fishBait?.18:e.tip==='squid'?.08:.03):
  ['croaker','sanddab'].includes(key)?(['squid','shrimp'].includes(e.tip)?.3:fishBait?.25:.06):
  key==='mackerel'?(fishBait?.16:e.tip==='squid'?.12:.08):fishBait?.12:e.tip==='squid'?.06:.02;
 return 1+boost*e.tipFreshness;
}

function layerAffinity(key,e){
 const kind=SPECIES[key].layer;
 if(kind==='sand')return .004+.996*Math.exp(-e.above/1.25);
 if(kind==='structure')return .009+.991*bell(e.above,1.1,2.3);
 if(kind==='school')return .07+.93*Math.max(bell(e.depth,Math.min(9,e.bottom*.65),Math.max(3,e.bottom*.28)),.5*bell(e.above,2,3));
 if(kind==='salmon')return .02+.98*bell(e.depth,Math.min(24,e.bottom*.7),Math.max(6,e.bottom*.3));
 if(kind==='seabass')return .03+.97*Math.max(.8*bell(e.above,2,5),bell(e.depth,Math.min(8,e.bottom*.5),6));
 // Pelagic schools may cross the bottom in shallow water, but deep-bottom bait
 // is a poor way to intercept them. There is no flat bottom-depth gate.
 return .02+.98*bell(e.depth,Math.min(5,e.bottom*.4),Math.max(3,Math.min(12,e.bottom*.25)));
}

function presentationAffinity(key,e){
 const r=e.rig.id,bait=e.bait,fishBait=['anchovy','sardine'].includes(bait);
 const moving=.12+.88*e.slowDrift;
 if(key==='croaker'||key==='sanddab'){
  const baitFactor=e.artificial?.08:bait==='squid'?.95:fishBait?1:bait==='shrimp'?1.05:.15;
  const rigFactor={bottom:1,dropper:1.1,slider:.8,sabiki:.3,float:.1,jig:.12,feather40:.12}[r]??.2;
  return baitFactor*rigFactor*(.8+.15*e.slowDrift)*(.1+.9*bell(e.speed,0,.7));
 }
 if(key==='halibut'){
  let baitFactor=e.artificial?((r==='jig'||e.softPlastic)?.85:r==='feather40'?.14:.045):e.live?1.3:fishBait?.88:bait==='squid'?.24:bait==='shrimp'?.11:.08;
  // Whole/dead squid can work, especially in autumn; a stationary strip is
  // still a markedly less productive search method than a moving baitfish.
  if(bait==='squid'&&[9,10,11].includes(e.month))baitFactor*=1.3;
  const rigFactor={slider:1.05,bottom:.72,dropper:.42,jig:.9,feather40:.3,sabiki:.08,float:.15}[r]??.25;
  const motion=e.artificial?.07+.65*e.slowDrift+.35*e.action:e.live?.7+.5*e.slowDrift:moving;
  return baitFactor*rigFactor*motion*(.12+.88*bell(e.speed,.25,.8));
 }
 if(['blue','copper','vermilion','lingcod'].includes(key)){
  const ling=key==='lingcod',baitFactor=e.artificial?1:fishBait?(ling?1.05:.9):bait==='squid'?(ling?.65:1.1):bait==='shrimp'?(ling?.2:.8):.15;
  const rigFactor=(ling?{bottom:.65,dropper:.65,slider:.55,jig:1.15,feather40:1.05,sabiki:.12,float:.08}:{bottom:.85,dropper:1.15,slider:.55,jig:.95,feather40:1.1,sabiki:.35,float:.15})[r]??.3;
  const action=e.artificial?(ling?.2:.3)+(ling?.8:.7)*e.action+.2*e.slowDrift:.8+.2*e.action;
  return baitFactor*rigFactor*action*(.1+.9*bell(e.speed,0,.8));
 }
 if(key==='mackerel'){
  const baitFactor=e.artificial?1:fishBait?1:bait==='squid'?.8:bait==='shrimp'?.65:.2;
  const rigFactor={sabiki:1.35,float:1.1,jig:.7,feather40:.25,bottom:.28,dropper:.38,slider:.2}[r]??.3;
  return baitFactor*rigFactor*(e.artificial?.55+.6*e.action:.85)*(.25+.75*bell(e.speed,.2,1.25));
 }
 if(key==='salmon'){
  const baitFactor=e.artificial?((r==='jig'||e.softPlastic)?.8:.14):fishBait?1:bait==='squid'?.13:.025;
  const rigFactor={bottom:.6,dropper:.25,slider:.85,jig:.8,float:.3,sabiki:.06,feather40:.18}[r]??.2;
  // Mooching/retrieving an anchovy in the right water column remains viable
  // without the engine; static squid on bottom remains an incidental chance.
  return baitFactor*rigFactor*(.025+.85*e.troll+.7*e.action+(e.live?.35:0));
 }
 if(key==='seabass'){
  const baitFactor=e.artificial?((r==='jig'||e.softPlastic)?.55:.12):bait==='squid'?.75:fishBait?.9:.03;
  const rigFactor={slider:1,bottom:.65,float:.7,dropper:.35,jig:.7,sabiki:.04,feather40:.2}[r]??.2;
  return baitFactor*rigFactor*(e.live?1.2:.55+.35*e.slowDrift+.2*e.action)*(.2+.8*bell(e.speed,.2,.8));
 }
 if(key==='bonito'){
  const baitFactor=e.artificial?((r==='jig'||e.softPlastic)?1.15:r==='sabiki'?.35:.55):fishBait?.9:bait==='squid'?.13:.03;
  const rigFactor={jig:1.1,float:.6,feather40:.5,sabiki:.35,bottom:.15,dropper:.12,slider:.18}[r]??.15;
  return baitFactor*rigFactor*(.035+.8*e.troll+.95*e.action+(e.live?.6:0));
 }
 return .03;
}

/** Per-species encounters per active second. Bait condition0 or no water
 * legitimately produces no bite; wrong species/rig combinations stay nonzero. */
export function fishEncounter(fishes,options={}){
 const e=environment(options),freshness=clamp(finite(options.freshness,1),0,1);
 const active=e.depth>.15&&e.bottom>.2&&freshness>0;
 const weights=fishes.map(fish=>{
  const key=speciesKey(fish),s=SPECIES[key];
  if(!active)return 0;
  if(fish.baitfish&&Number.isFinite(fish.encounterWeight))return Math.max(0,fish.encounterWeight)*freshness;
  if(!s)return .002*freshness;
  // Mapped artificial structure supplies shelter/edges, not a kelp claim.
  const substrate=options.habitat==='artificial'?'mixed':options.habitat;
  const habitat=s.habitat[substrate]??s.habitat.unknown;
  const seasonal=monthlyAvailability(key,e.month),waterTemp=finite(options.waterTemp,14);
  const temperature=key==='bonito'?.06+.94*clamp((waterTemp-11)/6,0,1):key==='mackerel'?.2+.8*clamp((waterTemp-9)/5,0,1):1;
  const rarity=Math.max(0,finite(fish?.rarity,s.rarity??1));
  const weight=s.density*rarity*habitat*depthAffinity(e.bottom,s.depth)*layerAffinity(key,e)*presentationAffinity(key,e)*tipAffinity(key,e)*seasonal*temperature*freshness*clamp(finite(options.schoolInfluence?.[key],1),1,8);
  return Math.max(0,weight);
 });
 const totalWeight=weights.reduce((a,b)=>a+b,0);
 return{weights,totalWeight,ratePerSecond:totalWeight*.018};
}

/** Select only AFTER an encounter. Shares alone are not an encounter rate. */
export function weightedEncounterFish(fishes,options={},rng=Math.random){
 const {weights,totalWeight}=fishEncounter(fishes,options);
 if(totalWeight<=0||!fishes.length)return undefined;
 let roll=clamp(finite(rng(),.5),0,1-Number.EPSILON)*totalWeight;
 for(let i=0;i<fishes.length;i++){roll-=weights[i];if(roll<0)return fishes[i];}
 return fishes.at(-1);
}

// ---------------------------------------------------------------------------
// Population inputs for fish-population.js. Where fish are comes from habitat,
// depth, season and water temperature; whether a fish that found the bait takes
// it comes from the presentation (bait, rig, motion, tipping). Nothing here is
// a bite probability on its own.
export function pixelSuitability(key,{habitat='unknown',bottom=12,month=9,waterTemp=14,schoolInfluence=1}={}){
 const s=SPECIES[key];if(!s||!(bottom>.3))return 0;
 const substrate=habitat==='artificial'?'mixed':habitat;
 const temperature=key==='bonito'?.06+.94*clamp((waterTemp-11)/6,0,1):key==='mackerel'?.2+.8*clamp((waterTemp-9)/5,0,1):1;
 return (s.habitat[substrate]??s.habitat.unknown)*depthAffinity(bottom,s.depth)*monthlyAvailability(key,month)*temperature*clamp(finite(schoolInfluence,1),1,8);
}
export function pixelBaitAppeal(key,options={}){
 const e=environment(options),freshness=clamp(finite(options.freshness,1),0,1);
 if(!SPECIES[key]||freshness<=0)return 0;
 return presentationAffinity(key,e)*tipAffinity(key,e)*freshness**.75;
}
const BAIT_SCENT=Object.freeze({squid:.75,anchovy:1,sardine:1,shrimp:.8,live:1,jig:.05,feather:0});
export function pixelBaitScent(options={}){
 const e=environment(options),fresh=clamp(finite(options.freshness,1),0,1);
 if(e.artificial)return e.tip?(BAIT_SCENT[e.tip]??.5)*e.tipFreshness*.7:(e.softPlastic?.05:0);
 return (BAIT_SCENT[e.bait]??.6)*fresh;
}
export function pixelBaitMotion(options={}){const e=environment(options);return clamp(Math.max(e.action,e.troll*.8,e.live?.5:0),0,1);}
export function pixelBaitFlash(options={}){
 const e=environment(options);
 return e.artificial?clamp(.25+.6*e.action+.45*e.troll,0,1):clamp(.1+.3*e.slowDrift+.35*e.troll+(e.live?.4:0),0,1);
}
// Where in the water column each group swims, and how far it will leave it.
const LAYER=Object.freeze({
 sand:[b=>Math.max(.2,b-.4),()=>1.4],
 structure:[b=>Math.max(.2,b-1.1),()=>2.6],
 school:[b=>Math.min(9,b*.65),b=>Math.max(3,b*.3)],
 salmon:[b=>Math.min(24,b*.7),b=>Math.max(6,b*.3)],
 seabass:[b=>Math.max(.5,b-2),()=>5],
 pelagic:[b=>Math.min(5,b*.4),b=>Math.max(3,Math.min(12,b*.25))],
});
const behaviour={
 croaker:{school:[8,30],density:55,cruise:.3,burst:1.3,smell:1,sight:1.5,sightDrive:.2,wariness:.25,patience:30,biteRate:1},
 sanddab:{school:[5,20],density:60,cruise:.15,burst:1,smell:.9,sight:1.5,sightDrive:.3,wariness:.2,patience:30,biteRate:1},
 blue:{school:[15,60],density:320,cruise:.25,burst:1.5,smell:.6,sight:8,sightDrive:.8,wariness:.35,patience:20,biteRate:.9},
 copper:{school:[1,4],density:40,cruise:.12,burst:1.4,smell:.6,sight:5,sightDrive:.7,wariness:.45,patience:20,biteRate:.8},
 vermilion:{school:[2,8],density:20,cruise:.15,burst:1.5,smell:.6,sight:6,sightDrive:.7,wariness:.45,patience:20,biteRate:.8},
 lingcod:{school:[1,1],density:5,cruise:.1,burst:2.5,smell:.5,sight:8,sightDrive:1,wariness:.5,patience:25,biteRate:.8},
 halibut:{school:[1,1],density:4,cruise:.12,burst:2.6,smell:.45,sight:5,sightDrive:1,wariness:.5,patience:30,biteRate:.7},
 mackerel:{school:[15,60],density:180,cruise:.8,burst:3,smell:.6,sight:6,sightDrive:.9,wariness:.3,patience:15,biteRate:.9},
 salmon:{school:[1,6],density:3.5,cruise:.9,burst:4,smell:.5,sight:8,sightDrive:1,wariness:.6,patience:12,biteRate:.7},
 seabass:{school:[2,10],density:1.5,cruise:.5,burst:3,smell:.5,sight:6,sightDrive:.9,wariness:.7,patience:15,biteRate:.7},
 bonito:{school:[5,25],density:5,cruise:1.2,burst:5,smell:.3,sight:10,sightDrive:1,wariness:.5,patience:10,biteRate:.8},
};
/** Engine species for Santa Cruz. `lengths` maps key → [min,max] cm from the catalogue. */
export function pixelPopulationSpecies(lengths={}){
 return Object.entries(behaviour).map(([id,b])=>{
  const s=SPECIES[id],[preferredDepth,verticalReach]=LAYER[s.layer];
  return Object.freeze({id,...b,density:b.density*s.density*(s.rarity??1),calmSeconds:40,giveUpMeters:60,probeMeters:18,lateralMeters:6,
   lengthCm:lengths[id]||[20,40],cohortSd:.08,preferredDepth,verticalReach,arrivalSeconds:id==='salmon'||id==='seabass'||id==='bonito'?150:90});
 });
}
export const pixelSpeciesKey=speciesKey;
