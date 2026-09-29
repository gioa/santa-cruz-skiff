import {fishSpecies} from './fish-species.js';
/**
 * Lightweight presentation model for Santa Cruz's nearshore fishing.
 * Factual basis: bottom structure, species ecology, bait/lure technique and the
 * need to increase sinker weight with current (references below). ALL numerical
 * rates, affinity multipliers and hazard coefficients are game tuning, not
 * measured catch probabilities, calibrated hydrodynamics or fishing advice.
 * The caller owns inventory, regulations, fish retention and random events.
 */
import {SABIKI_RIG} from './pixel-sabiki-data.js';
export const RIG_SOURCES=Object.freeze([
  Object.freeze({id:'odfw-bottomfish',title:'ODFW — Oregon marine shore fishing',url:'https://myodfw.com/articles/oregon-marine-shore-fishing',basis:'Bottomfish take natural bait and leadhead soft plastics; sinker choice changes with current; lift, take in slack, and let the rig settle. Pacific-coast technique, not California regulations.'}),
  Object.freeze({id:'noaa-lingcod',title:'NOAA Fisheries — Lingcod',url:'https://www.fisheries.noaa.gov/species/lingcod',basis:'Adults associate with rocky and vegetated habitat and consume bottom fish, squid, octopus and crab.'}),
  Object.freeze({id:'noaa-mackerel',title:'NOAA Fisheries — Pacific mackerel',url:'https://www.fisheries.noaa.gov/species/pacific-mackerel',basis:'Schooling coastal pelagic fish; adults use a broad water column and feed on plankton and young fish.'}),
  Object.freeze({id:'seagrant-halibut',title:'California Sea Grant — California fisheries research final report',url:'https://caseagrant.ucsd.edu/sites/default/files/7MG_PomeroyEtAl_FinalReport.pdf',basis:'California halibut commonly occupy sandy bottom; availability varies in space and time.'}),
  Object.freeze({id:'cdfw-pier-archive',title:'Santa Cruz and Capitola wharves — CDFW training archive',url:'https://filelib.wildlife.ca.gov/FileLib/CRFS/CRFS%20Training%20Materials/Sites/Pier_Info/SCR_piers.pdf',basis:'Historical first-hand Ken Jones accounts archived by CDFW: bottom bait and high/low rigs, midwater bait leaders, and surface floats. Not a current rules source; game feather rigs use two hooks only.'}),
  Object.freeze({id:'pitbull-feather-bottomfish',title:'Pitbull Tackle — UV Feather Bottomfish Rig',url:'https://pitbulltackle.com/uv-feather-bottomfish-rig/',basis:'Manufacturer offers a two-hook bottomfish rig with 4/0 feather/mylar flies. The game lets players fit a separate sinker and adds tuned hook-wire, motion and catch parameters; these are not manufacturer-tested specifications.'}),
]);

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const number=(n,fallback=0)=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
const bounded=(n,fallback,min,max)=>clamp(number(n,fallback),min,max);
const bell=(x,centre,width)=>Math.exp(-.5*((x-centre)/width)**2);
const profile=p=>Object.freeze({...p,targetSpecies:Object.freeze(p.targetSpecies),speciesBias:Object.freeze(p.speciesBias)});

/** These virtual bait rigs are supplied with circle hooks; jig/feather rigs use J hooks.
 * This specifies the game tackle, not all real rigs of the same name.
 * Sizes use the US scale. Gap and wire loads describe these virtual products,
 * not a universal size conversion or manufacturer-tested breaking strength.
 * Barbs remain unspecified. Eligibility remains a separate rules concern. */
export const RIG_PROFILES=Object.freeze({
  sabiki6:profile(SABIKI_RIG),
  bottom:profile({id:'bottom',hookSize:'2/0',hookGapMm:13,hookWire:'standard',hookWireStrengthN:65,hookStyle:'circle',item:'tackle',name:'单钩沉底组',english:'Single-hook bottom rig',hooks:1,defaultWeightGrams:85,baitAboveBottom:.3,sinkFactor:1,dragArea:.00012,snagFactor:.8,layer:'bottom',technique:'圆形钩；放到底后略提竿，鱼讯时稳定收线。',targetSpecies:['rockfish','halibut'],speciesBias:{blue:1.12,copper:1.18,halibut:1.06,mackerel:.74,lingcod:1.02}}),
  dropper:profile({id:'dropper',hookSize:'1/0',hookGapMm:11,hookWire:'standard',hookWireStrengthN:48,hookStyle:'circle',item:'rig_dropper',name:'双支线沉底组',english:'Two-hook dropper-loop / paternoster',hooks:2,defaultWeightGrams:113,baitAboveBottom:.65,sinkFactor:.91,dragArea:.00022,snagFactor:.73,layer:'bottom',technique:'双圆形钩，短支线托饵离底；鱼讯时稳收。',targetSpecies:['rockfish'],speciesBias:{blue:1.62,copper:1.72,halibut:.79,mackerel:.92,lingcod:1.08}}),
  slider:profile({id:'slider',hookSize:'3/0',hookGapMm:14.5,hookWire:'standard',hookWireStrengthN:78,hookStyle:'circle',item:'rig_slider',name:'滑铅钓组',english:'Sliding-sinker fish-finder rig',hooks:1,defaultWeightGrams:57,baitAboveBottom:.12,sinkFactor:1.1,dragArea:.00014,snagFactor:1.16,layer:'bottom',technique:'圆形钩配长子线，沙底慢漂；稳收使鱼线拉紧。',targetSpecies:['halibut'],speciesBias:{blue:.94,copper:1,halibut:1.85,mackerel:.74,lingcod:1.1}}),
  jig:profile({id:'jig',hookSize:'4/0',hookGapMm:16,hookWire:'heavy',hookWireStrengthN:85,hookStyle:'j',item:'rig_jig',name:'铅头软饵钓组',english:'Single-hook leadhead swimbait',hooks:1,defaultWeightGrams:42,baitAboveBottom:.04,sinkFactor:.82,dragArea:.00026,snagFactor:1.05,layer:'bottom',technique:'沉到底层，轻提后放落，或缓慢收线搜索。',targetSpecies:['lingcod','rockfish'],speciesBias:{blue:1.14,copper:1.32,halibut:1.19,mackerel:1.02,lingcod:1.7}}),
  float:profile({id:'float',hookSize:'#2',hookGapMm:8,hookWire:'standard',hookWireStrengthN:30,hookStyle:'circle',item:'rig_float',name:'定层浮游钓组',english:'Single-hook slip-float rig',hooks:1,defaultWeightGrams:7,baitAboveBottom:0,sinkFactor:.6,dragArea:.00008,snagFactor:.28,layer:'suspended',defaultFishingDepth:2.5,technique:'圆形钩；挡豆限定饵层，鱼讯时稳定收线。',targetSpecies:['mackerel'],speciesBias:{blue:1.03,copper:.7,halibut:.6,mackerel:1.72,lingcod:.62}}),
  sabiki:profile({id:'sabiki',hookSize:'#6',hookGapMm:5.5,hookWire:'fine',hookWireStrengthN:17,hookStyle:'j',item:'rig_sabiki',name:'双钩羽毛钓组',english:'Two-hook feather bait rig',hooks:2,defaultWeightGrams:28,baitAboveBottom:.8,sinkFactor:.76,dragArea:.00018,snagFactor:.95,layer:'midwater',defaultFishingDepth:6,technique:'只有两枚小钩；停在中层，短促轻提寻找鱼群。',targetSpecies:['mackerel'],speciesBias:{blue:1.1,copper:.72,halibut:.49,mackerel:2.03,lingcod:.56}}),
  feather40:profile({id:'feather40',hookSize:'4/0',hookGapMm:16,hookWire:'heavy',hookWireStrengthN:85,hookStyle:'j',item:'rig_feather40',name:'双支线羽毛钓组',english:'Two-dropper 4/0 feather rig',hooks:2,defaultWeightGrams:113,baitAboveBottom:.7,sinkFactor:.85,dragArea:.00028,snagFactor:.84,layer:'bottom',technique:'两条短支线各一枚 4/0 羽毛 J 型钩；底坠按水深与走流另配，垂直下放后离底轻提；可挂鱿鱼条、鳀鱼或软饵。',targetSpecies:['rockfish','lingcod'],speciesBias:{blue:1.25,copper:1.6,halibut:.74,mackerel:.7,lingcod:1.5,vermilion:1.65,salmon:.4,seabass:.65,bonito:.75}}),
});

export function getRigProfile(rig='bottom'){
  return RIG_PROFILES[typeof rig==='object'?rig?.id:rig]||RIG_PROFILES.bottom;
}

function environment(options={}){
  const rig=getRigProfile(options.rig),bottomDepth=bounded(options.bottomDepth??options.depthMeters,12,.1,400);
  const weightGrams=bounded(options.weightGrams,rig.defaultWeightGrams,1,1000);
  // A scalar represents cross-flow relative to the boat, not a compass vector.
  const currentMps=Math.abs(bounded(options.currentMps,0,-4,4));
  const boatSpeedMps=Math.abs(bounded(options.boatSpeedMps,0,-8,8));
  const crossFlow=Math.hypot(currentMps,boatSpeedMps*.8);
  const lineDiameterMm=bounded(options.lineDiameterMm,.3,.06,1.5);
  const lineOutMeters=bounded(options.lineOutMeters,bottomDepth*1.7+3,.1,800);
  const effectiveLine=Math.min(lineOutMeters,bottomDepth*1.35+3);
  const submergedWeight=weightGrams*.001*9.81*.91;
  const drag=.5*1025*(lineDiameterMm*.001*effectiveLine*.7+rig.dragArea)*crossFlow**2;
  const angle=Math.atan2(drag,submergedWeight);
  return{rig,bottomDepth,weightGrams,currentMps,boatSpeedMps,crossFlow,lineOutMeters,angle};
}

/** Approximate vertical settling speed, metres/second; current slows descent. */
export function rigSinkRate(options={}){
  const e=environment(options);
  const still=.78*Math.sqrt(e.weightGrams/85)*e.rig.sinkFactor;
  return clamp(still/Math.sqrt(1+(e.crossFlow/Math.max(.12,still))**2*.8),.015,3.5);
}

/** Relative presentation activity, distinct from the chance of meeting a fish. */
export function lureAttraction(options={}){
  const rig=getRigProfile(options.rig),speed=bounded(options.retrieveSpeedMps,0,0,3);
  const pumping=options.pumping?1:0,drift=Math.abs(bounded(options.currentMps,0,-4,4));
  const swimming=Math.min(1,speed/.25)*bell(speed,.45,.65);
  if(rig.id==='jig')return clamp(.48+swimming*1.08+pumping*.58-speed*.05,.32,2.05);
  if(rig.id==='sabiki'||rig.id==='sabiki6')return clamp(.7+swimming*.5+pumping*.48-speed*.06,.4,1.7);
  if(rig.id==='feather40')return clamp(.64+swimming*.72+pumping*.58-speed*.08,.38,1.85);
  if(rig.id==='slider')return clamp(.92+.24*bell(drift,.2,.19)+swimming*.12-pumping*.12-speed*.16,.5,1.3);
  if(rig.id==='float')return clamp(1.04-speed*.3-pumping*.06,.45,1.04);
  return clamp(.96+swimming*.13+pumping*.12-speed*.14,.5,1.18);
}

/** Per-second hazard, not a per-frame probability. Use 1-exp(-hazard*dt). */
export function rigSnagRisk(options={}){
  const e=environment(options),depth=bounded(options.lureDepth??options.depth,0,0,e.bottomDepth);
  const clearance=Math.max(0,e.bottomDepth-depth-e.rig.baitAboveBottom);
  const nearStructure=Math.exp(-clearance*2.8);
  const base=options.habitat==='reef'?.0045:options.habitat==='kelp'?.0028:.00012;
  const speed=bounded(options.retrieveSpeedMps,0,0,3);
  const dragged=.4+Math.min(2.5,e.crossFlow)*1.65+speed*.7;
  const mass=.7+Math.min(1.6,e.weightGrams/140);
  const vegetation=options.habitat==='kelp'&&depth>.5?.00012*e.rig.snagFactor:0;
  return clamp(base*nearStructure*e.rig.snagFactor*dragged*mass+vegetation,0,.04);
}

/**
 * One deterministic lure step. Depth is bait depth below the surface, in metres.
 * Pass the returned pumpHeight into the next step. A held lift has a finite
 * stroke; it cannot keep lifting indefinitely. lineOutMeters is actual paid-out
 * line, NOT the horizontal cast distance. Omit it for automatic line feeding.
 */
export function stepRigLure(options={}){
  const e=environment(options),dt=bounded(options.dt,0,0,5);
  const startDepth=bounded(options.depth??options.lureDepth,0,0,e.bottomDepth);
  const sinkRate=rigSinkRate(options),retrieveSpeed=bounded(options.retrieveSpeedMps,0,0,3);
  const maxSinkerDepth=Math.min(e.bottomDepth,e.lineOutMeters*Math.cos(e.angle));
  let targetDepth=Math.max(0,maxSinkerDepth-e.rig.baitAboveBottom);
  if(e.rig.layer==='suspended')targetDepth=Math.min(targetDepth,bounded(options.floatDepth??options.fishingDepthMeters,e.rig.defaultFishingDepth,.25,40));
  if(e.rig.layer==='midwater')targetDepth=Math.min(targetDepth,bounded(options.fishingDepthMeters,Math.min(e.rig.defaultFishingDepth,e.bottomDepth*.55),.25,80));
  const previousPump=bounded(options.pumpHeight,0,0,.8);
  const pumpHeight=options.pumping?Math.min(.8,previousPump+dt*.95):Math.max(0,previousPump-dt*.6);
  const liftVelocity=dt>0?(pumpHeight-previousPump)/dt:0;
  const verticalRetrieve=retrieveSpeed*Math.max(.3,Math.cos(e.angle))*.88;
  // The raised rod suspends the entire rig; retain this offset while held.
  const heldTarget=Math.max(0,targetDepth-pumpHeight);
  let depth=startDepth;
  if(dt>0){
    depth=clamp(startDepth+(sinkRate-verticalRetrieve)*dt-(pumpHeight-previousPump),0,e.bottomDepth);
    if(depth>heldTarget)depth=Math.max(heldTarget,startDepth-(verticalRetrieve+Math.max(0,liftVelocity)+sinkRate*.4)*dt);
    depth=clamp(depth,0,e.bottomDepth);
  }
  const bottomContact=e.bottomDepth-depth-e.rig.baitAboveBottom<=.18;
  const nearBottom=e.bottomDepth-depth<=Math.max(1.1,e.rig.baitAboveBottom+.35);
  return{depth,targetDepth:heldTarget,sinkRate,pumpHeight,liftVelocity,lineAngleDeg:e.angle*180/Math.PI,
    verticalSpeed:dt>0?(depth-startDepth)/dt:0,bottomContact,nearBottom,
    snagRiskPerSecond:rigSnagRisk({...options,depth,bottomDepth:e.bottomDepth}),
    attraction:lureAttraction(options)};
}

const SPECIES=Object.freeze({
  vermilion:{habitat:{kelp:1.2,reef:3.2,sand:.35},baits:{squid:1.4,anchovy:1.25,shrimp:1.1,sardine:1.15,jig:1.3},layer:'structure'},
  salmon:{habitat:{kelp:.65,reef:.6,sand:1.6},baits:{squid:.45,anchovy:1.8,shrimp:.3,sardine:1.6,jig:1.1},layer:'pelagic'},
  seabass:{habitat:{kelp:2.6,reef:.65,sand:1.4},baits:{squid:1.9,anchovy:1.3,shrimp:.25,sardine:1.6,jig:.8},layer:'school'},
  bonito:{habitat:{kelp:.8,reef:.7,sand:1.7},baits:{squid:.6,anchovy:1.6,shrimp:.25,sardine:1.7,jig:1.5},layer:'pelagic'},
  blue:{habitat:{kelp:2.5,reef:1.8,sand:.8},baits:{squid:1.3,anchovy:1.08,shrimp:1.16,sardine:1.08,jig:1.13},layer:'school'},
  copper:{habitat:{kelp:1.85,reef:2.9,sand:.6},baits:{squid:1.35,anchovy:1.06,shrimp:1.21,sardine:1.05,jig:1.18},layer:'structure'},
  halibut:{habitat:{kelp:.78,reef:.52,sand:3.1},baits:{squid:.95,anchovy:1.5,shrimp:.9,sardine:1.35,jig:1.19},layer:'sand'},
  mackerel:{habitat:{kelp:1.15,reef:.95,sand:1.3},baits:{squid:1.05,anchovy:1.28,shrimp:.95,sardine:1.22,jig:1.16},layer:'pelagic'},
  lingcod:{habitat:{kelp:2,reef:3,sand:.65},baits:{squid:1.15,anchovy:1.24,shrimp:.82,sardine:1.33,jig:1.48},layer:'structure'},
});

const RIG_SPECIES_KEYS=new Set([...Object.keys(SPECIES),'croaker','sanddab']);

/** Accept existing PIXEL_FISH objects, latin names or future stable IDs. */
export function rigSpeciesKey(fish){
 const value=typeof fish==='string'&&RIG_SPECIES_KEYS.has(fish)?{id:fish}:fish;
 const kind=fishSpecies(value)?.artKind;return RIG_SPECIES_KEYS.has(kind)?kind:'other';
}

/** Soft affinity for the actual bait layer. No species has a zero-weight gate. */
export function rigFishWeights(fishes,options={}){
  const rig=getRigProfile(options.rig),bottom=bounded(options.bottomDepth??options.depth,12,.1,400);
  const depth=bounded(options.lureDepth,bottom-rig.baitAboveBottom,0,bottom),above=bottom-depth;
  const freshness=bounded(options.freshness,1,0,1),activity=lureAttraction(options);
  return fishes.map(fish=>{
    const key=rigSpeciesKey(fish),s=SPECIES[key];
    if(!s)return .7*(.55+.45*freshness);
    const habitat=s.habitat[options.habitat]||1,bait=s.baits[options.bait]||1;
    let layer=1;
    if(s.layer==='sand')layer=.045+.955*Math.exp(-above/1.8);
    else if(s.layer==='structure')layer=.07+.93*bell(above,1.1,3.4);
    else if(s.layer==='school')layer=.23+.77*bell(depth/bottom,.62,.32);
    else if(s.layer==='pelagic')layer=.17+.83*bell(depth,Math.min(5,bottom*.33),Math.max(2,bottom*.23));
    const newBias={vermilion:{bottom:1.3,dropper:1.7,jig:1.5,float:.35,sabiki:.55},salmon:{bottom:.35,dropper:.3,jig:1.2,float:1.05,sabiki:.35,slider:.8},seabass:{bottom:.9,dropper:.65,slider:1.5,jig:1,float:1.2,sabiki:.2},bonito:{bottom:.3,dropper:.25,jig:1.65,float:1.25,sabiki:.8}};
    const presentation=newBias[key]?.[rig.id]||rig.speciesBias[key]||1;
    const actionBias=key==='lingcod'||key==='copper'?activity:key==='mackerel'?.65+activity*.35:.8+activity*.2;
    const warmth=key==='bonito'?clamp((number(options.waterTemp,15)-11)/7,.15,1.3):1;
    const seasonal=key==='salmon'&&[11,12,1,2].includes(options.month)?.3:1;
    return Math.max(.001,habitat*bait*layer*presentation*actionBias*(.55+.45*freshness)*number(fish.rarity,1)*warmth*seasonal);
  });
}

/** Positive weights provide overlap without pretending to predict wild catches. */
export function weightedRigFish(fishes,options={},rng=Math.random){
  if(!fishes.length)return undefined;
  const weights=rigFishWeights(fishes,options),sum=weights.reduce((a,b)=>a+b,0);
  let roll=bounded(rng(),.5,0,1-Number.EPSILON)*sum;
  for(let i=0;i<fishes.length;i++){roll-=weights[i];if(roll<0)return fishes[i];}
  return fishes.at(-1);
}
