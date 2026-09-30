// Deterministic simulation QA, NOT a claim of a real-time human play session.
// No injected fish: the population must spawn, roam, detect and take the lure.
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {writeFileSync,mkdirSync} from 'node:fs';
function rng(seed){return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};}
const results=[];
for(const seed of [123,911,2048]){
 const sim=new BeniciaSimulation({date:'2026-09-29',rng:rng(seed),loreSeed:seed}),log={seed,activeSeconds:600,casts:0,bites:0,catches:[],lost:0,finite:true};
 // A real, walkable gap on the bank to the west of the pier; moving there is
 // part of this session. No inventory gifts or generated catch outcomes.
 sim.walkTo(1384,sim.world.shoreY(1384)+28);
 let prev='walk';
 for(let t=0;t<600;t+=.05){
  const s=sim.state;
  if(s.inspection)sim.acknowledgeInspection();
  if(s.phase==='walk'&&!s.walkTarget){
   if(!sim.tackleReady)sim.configureEquipment('salmon_spoon');
   if(sim.tackleReady){const c=sim.cast({power:.7,aim:-.35});if(!c.ok&&/空位/.test(c.message))sim.walkTo(s.player.x+36,sim.world.shoreY(s.player.x+36)+26);}
  }
  if(s.phase==='bite'){log.bites++;sim.strike();}
  if(s.phase==='landed'){log.catches.push({species:s.fish.id,inches:s.fish.length/2.54,lb:s.fish.weightKg/0.45359237});sim.resolveCatch(false);}
  const reel=s.phase==='fighting'?s.tension<.72:s.phase==='waiting'&&s.soakSeconds>3;
  sim.update(.05,{reel,reelSpeed:.5,rodLift:s.phase==='fighting'?.7:.2,drag:.5});
  if(prev==='fighting'&&s.phase==='walk')log.lost++;
  if(![s.player.x,s.player.y,s.lineDistance,s.tension,s.elapsed].every(Number.isFinite))log.finite=false;
  prev=s.phase;
 }
 log.casts=sim.state.stats.casts;log.finalPhase=sim.state.phase;log.remainingRig=sim.tackleReady;log.elapsed=sim.state.elapsed;
 results.push(log);
}
mkdirSync('qa/benicia',{recursive:true});writeFileSync('qa/benicia/simulation-sessions.json',JSON.stringify({kind:'accelerated deterministic simulation, no forced fish',results},null,2));
console.log(JSON.stringify(results,null,2));
if(results.some(r=>!r.finite||r.elapsed<599))process.exitCode=1;
