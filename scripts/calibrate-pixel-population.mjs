// Plays fixed Santa Cruz boat-fishing strategies through the real simulation
// many times and reports waits for the first bite and which fish took it.
// Game-behaviour summary only.   node scripts/calibrate-pixel-population.mjs [runs]
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const {fromGPS}=await import('../dist/pixel-geography.js');
const {syncVessel}=await import('../dist/vessel-physics.js');

const args=process.argv.slice(2),runs=Number(args.find(a=>/^\d+$/.test(a))||16),jsonOut=args.includes('--json')?args[args.indexOf('--json')+1]:null,LIMIT=600,STEP=.1;
const SPOTS={reef:fromGPS(-122.0288,36.9505),sand:fromGPS(-122.0118,36.9585)};
export const PIXEL_STRATEGIES=[
 {id:'reef · squid · single-hook bottom',spot:'reef'},
 {id:'reef · squid · recast every 30 s',spot:'reef',recast:30},
 {id:'reef · feather jig held at depth',spot:'reef',rig:'feather40'},
 {id:'sand · squid · single-hook bottom',spot:'sand'},
 {id:'sand · feather jig held at depth',spot:'sand',rig:'feather40'},
];
function mulberry(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function lower(sim){const r=sim.lowerRig();if(!r.ok)return false;sim.state.snagThreshold=Infinity;return true;}
export function playPixelStrategy(strategy,seed){
 const sim=new PixelSimulation({rng:mulberry(seed),patrolRng:()=>.9,weatherSeed:seed,populationSeed:seed,conditions:{windKnots:0,currentMps:.08},now:()=>new Date('2026-09-27T16:00:00Z')});sim.start();
 Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});sim.state.profile.credits=500;
 if(strategy.rig==='feather40'){sim.buyGear('rig_feather40');sim.replaceRig(undefined,'feather40');}
 const p=SPOTS[strategy.spot];
 Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,boatX:p.x,boatZ:p.z,anchor:false});syncVessel(sim.vessel,{x:p.x,z:p.z,heading:0,clearMotion:true});
 for(let t=0;t<20;t+=STEP)sim.step(STEP);
 if(!lower(sim))return{time:null,error:'lower'};
 let time=0,since=0;
 while(time<LIMIT){
  sim.step(STEP);time+=STEP;since+=STEP;
  if(sim.state.fishState==='bite')return{time,species:sim.state.biteFish?.name,length:sim.state.biteFish?.length};
  if(sim.state.fishState==='idle'){if(!lower(sim))return{time:null};since=0;}
  if(strategy.recast&&since>=strategy.recast&&sim.state.fishState==='waiting'){sim.retrieve();lower(sim);since=0;}
 }
 return{time:null};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const report={generatedAt:new Date().toISOString(),runs,limitSeconds:LIMIT,strategies:{}};
 for(const strategy of PIXEL_STRATEGIES){
  const results=[];for(let i=0;i<runs;i++)results.push(playPixelStrategy(strategy,2000+i*7919));
  const times=results.map(r=>r.time).filter(t=>t!==null).sort((a,b)=>a-b),species={};
  for(const r of results)if(r.species)species[r.species]=(species[r.species]||0)+1;
  const median=times.length>=runs/2?times[Math.ceil(runs/2)-1]:null;
  report.strategies[strategy.id]={runs,biteWithin2min:results.filter(r=>r.time!==null&&r.time<=120).length/runs,biteWithin10min:times.length/runs,medianSeconds:median,species};
  console.log(`${strategy.id.padEnd(36)} ≤2min ${String(Math.round(100*results.filter(r=>r.time!==null&&r.time<=120).length/runs)).padStart(3)}%  ≤10min ${String(Math.round(100*times.length/runs)).padStart(3)}%  median ${median===null?' >600':String(Math.round(median)).padStart(4)} s  ${JSON.stringify(species)}`);
 }
 if(jsonOut){const {writeFile}=await import('node:fs/promises');await writeFile(jsonOut,JSON.stringify(report,null,1)+'\n');}
}
