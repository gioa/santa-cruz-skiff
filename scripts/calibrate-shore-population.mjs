// Plays fixed shore-fishing strategies through the real simulation many times
// (different seeds) and reports how long anglers wait for their first bite and
// which fish take it. Output is a game-behaviour summary, not field data.
//   node scripts/calibrate-shore-population.mjs [runs] [--json out.json]
import {writeFile} from 'node:fs/promises';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {shoreProfile} from '../dist/shore-data.js';
import {syncShoreEquipment} from '../dist/shore-equipment.js';

const args=process.argv.slice(2),runs=Number(args.find(a=>/^\d+$/.test(a))||40),jsonOut=args.includes('--json')?args[args.indexOf('--json')+1]:null;
const LIMIT=600,STEP=.05,fishingDate='2026-09-28';
function mulberry(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export const STRATEGIES=[
 {id:'trough · crab · Carolina · soak',position:'trough',bait:'sandcrab',rig:'carolina_rig'},
 {id:'trough · crab · Carolina · recast 20 s',position:'trough',bait:'sandcrab',rig:'carolina_rig',recast:20},
 {id:'trough · squid · Carolina',position:'trough',bait:'squid',rig:'carolina_rig'},
 {id:'bar gap · anchovy · fish-finder',position:'channel',bait:'anchovy',rig:'fishfinder_rig'},
 {id:'trough · squid · float',position:'trough',bait:'squid',rig:'float_rig',seaState:{waveHeightM:.55,wavePeriodS:8}},
 {id:'trough · crab · fish-finder (big hook)',position:'trough',bait:'sandcrab',rig:'fishfinder_rig'},
 {id:'max range · crab · Carolina',position:'long',bait:'sandcrab',rig:'carolina_rig'},
 {id:'swash · crab · Carolina',position:'swash',bait:'sandcrab',rig:'carolina_rig'},
 {id:'trough · crab · Carolina · rough sea',position:'trough',bait:'sandcrab',rig:'carolina_rig',seaState:{waveHeightM:2.8,wavePeriodS:16}},
 {id:'trough · crab · Carolina · midday',position:'trough',bait:'sandcrab',rig:'carolina_rig',startHour:12},
];

function power(sim,distance){
 let low=0,high=1;const max=sim.previewCast({power:1}).offshoreDistance;distance=Math.min(distance,max);
 for(let i=0;i<40;i++){const mid=(low+high)/2;if(sim.previewCast({power:mid}).offshoreDistance<distance)low=mid;else high=mid;}
 return(low+high)/2;
}
function cast(sim,distance){const r=sim.cast({power:power(sim,distance)});if(!r.ok)throw new Error(r.message);while(sim.state.phase==='casting')sim.update(STEP);}

export function playStrategy(sceneId,strategy,seed){
 // Technique comparisons are controlled: no other angler competing on the beach.
 const sim=new PacificaSimulation({sceneId,date:fishingDate,seaState:strategy.seaState,rng:mulberry(seed),loreSeed:seed,regular:false});
 sim.buy('surf_rod');sim.state.credits=0;sim.configureEquipment('surf_rod');
 const x=strategy.position==='channel'?(sceneId==='pacifica'?3240:2670):1100;
 Object.assign(sim.state.player,{x,y:sim.world.shoreY(x)+25});
 sim.state.wardenNextAt=1e9;
 if(strategy.startHour)sim.state.elapsed=(strategy.startHour-6)*360;
 const refresh=()=>{sim.state.rodSupplies[sim.state.activeRod]={id:strategy.rig,condition:1,bait:{kind:strategy.bait,condition:1}};syncShoreEquipment(sim.state);};
 refresh();
 const p=shoreProfile(sceneId,x,sim.state.elapsed,strategy.seaState);
 const distance={trough:p.troughDistance,channel:p.barDistance,long:99,swash:4}[strategy.position];
 // Walking to the water lets the local fish settle before the first cast.
 for(let t=0;t<30;t+=STEP)sim.update(STEP);
 cast(sim,distance);
 let time=0,sinceCast=0;
 while(time<LIMIT){
  sim.update(STEP);time+=STEP;sinceCast+=STEP;
  if(sim.state.phase==='bite')return{time,species:sim.state.biteSpeciesId,lengthCm:sim.state.biteLengthCm};
  if(sim.state.phase==='walk'){refresh();cast(sim,distance);sinceCast=0;}
  if(strategy.recast&&sinceCast>=strategy.recast&&sim.state.phase==='waiting'&&!sim.state.autoRetrieve)sim.retrieve();
 }
 return{time:null};
}

export function summarize(results){
 const times=results.map(r=>r.time).filter(t=>t!==null).sort((a,b)=>a-b),n=results.length;
 const quantile=q=>{const k=Math.ceil(q*n)-1;return k<times.length?times[k]:null;};
 const species={};for(const r of results)if(r.species)species[r.species]=(species[r.species]||0)+1;
 return{runs:n,biteWithin2min:results.filter(r=>r.time!==null&&r.time<=120).length/n,biteWithin10min:times.length/n,
  medianSeconds:quantile(.5),species};
}

if(import.meta.url===`file://${process.argv[1]}`){
 const report={generatedAt:new Date().toISOString(),runs,limitSeconds:LIMIT,scenes:{}};
 for(const sceneId of['pacifica','half-moon-bay']){
  report.scenes[sceneId]={};
  for(const strategy of STRATEGIES){
   const results=[];for(let i=0;i<runs;i++)results.push(playStrategy(sceneId,strategy,1000+i*7919));
   const s=summarize(results);report.scenes[sceneId][strategy.id]=s;
   console.log(`${sceneId.padEnd(13)} ${strategy.id.padEnd(40)} ≤2min ${(s.biteWithin2min*100).toFixed(0).padStart(3)}%  ≤10min ${(s.biteWithin10min*100).toFixed(0).padStart(3)}%  median ${s.medianSeconds===null?'  >600':String(Math.round(s.medianSeconds)).padStart(5)} s  ${JSON.stringify(s.species)}`);
  }
 }
 if(jsonOut)await writeFile(jsonOut,JSON.stringify(report,null,1)+'\n');
}
