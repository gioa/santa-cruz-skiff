// Accelerated player sessions through the production simulation. No fish,
// bites, catches, population density, sea state or tackle condition are injected.
// node scripts/simulate-shore-day.mjs --json /tmp/shore-day.json [--verify]
// Small benchmark: --seconds 60 --hours 6 --profile pacifica-crab --spot 1100
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {shoreProfile} from '../dist/shore-data.js';
import {shoreStandPosition} from '../dist/shore-movement.js';
import {shoreWorldTime} from '../dist/shore-day.js';
import {shoreSupply,isShoreLure} from '../dist/shore-equipment.js';
import {createShoreReelHold,setShoreReelHeld,stepShoreReelHold} from '../dist/shore-reel-input.js';

export const SHORE_DAY_PROFILES=Object.freeze([
 {id:'pacifica-crab',sceneId:'pacifica',rig:'carolina_rig',bait:'sandcrab',spots:[1100,2440]},
 {id:'pacifica-squid',sceneId:'pacifica',rig:'carolina_rig',bait:'squid',spots:[1100,2440]},
 {id:'half-moon-bay-crab',sceneId:'half-moon-bay',rig:'carolina_rig',bait:'sandcrab',spots:[1100,3660]},
 {id:'half-moon-bay-squid',sceneId:'half-moon-bay',rig:'carolina_rig',bait:'squid',spots:[1100,3660]},
 {id:'benicia-spoon',sceneId:'benicia',rig:'salmon_spoon',spots:[1212,1888]},
 {id:'benicia-anchovy',sceneId:'benicia',rig:'carolina_rig',bait:'anchovy',spots:[1212,1888]},
]);
const round=n=>Math.round(n*1000)/1000;
const defaultFactory=options=>options.sceneId==='benicia'?new BeniciaSimulation(options):new PacificaSimulation(options);
const stock=s=>({credits:s.credits,bait:{...s.inventory},mounted:structuredClone(shoreSupply(s)),spares:Object.fromEntries(Object.entries(s.rigStock).map(([id,rigs])=>[id,rigs.length]))});
const conditions=sim=>({californiaDateTime:sim.calendar().toISOString().slice(0,19),instant:sim.sharedWorld?new Date(sim.sharedWorld.instantMs).toISOString():null,
 waveHeightM:sim.state.seaState?.waveHeightM,wavePeriodS:sim.state.seaState?.wavePeriodS,tideM:sim.state.shoreSample?.tide,currentX:sim.state.shoreSample?.currentX,currentY:sim.state.shoreSample?.currentY});

// California's supported modern offsets are UTC−07/−08. Validate candidates
// through the production timezone formatter instead of assuming summer time.
// An overlapping autumn hour chooses its first occurrence; a missing spring
// hour is rejected rather than silently moved to a different fishing window.
export function californiaSessionEpoch(date,startHour){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(startHour)||startHour<0||startHour>23)throw new Error('Use a valid date and an integer California hour from 0 to 23.');
 const civil=Date.parse(`${date}T00:00:00Z`)+startHour*3600000;
 const matches=[7,8].map(offset=>civil+offset*3600000).filter(epoch=>{
  if(!Number.isFinite(epoch))return false;
  const local=shoreWorldTime(new Date(epoch));return local.date===date&&local.timeSeconds===startHour*3600;
 });
 if(!matches.length)throw new Error(`Invalid or nonexistent California time: ${date} ${startHour}:00`);
 return Math.min(...matches);
}

// Charge is selected through the same real ballistic preview as the UI.
// Each subsequent cast recomputes it for the actual remaining bait/load.
function castPlan(sim,profile){
 const p=shoreProfile(sim.scene,sim.state.player.x,sim.state.elapsed,sim.state.seaState);
 const desired=profile.sceneId==='benicia'?27:p.troughDistance;
 let lo=0,hi=1;
 const near=sim.previewCast({power:lo,aim:0}),far=sim.previewCast({power:hi,aim:0});
 const offshore=Math.max(near.offshoreDistance,Math.min(desired,far.offshoreDistance));
 for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(sim.previewCast({power:mid,aim:0}).offshoreDistance<offshore)lo=mid;else hi=mid;}
 return{power:(lo+hi)/2,aim:0};
}

export function playShoreSession(config={}, {createSimulation=defaultFactory}={}){
 const profile=typeof config.profile==='string'?SHORE_DAY_PROFILES.find(p=>p.id===config.profile):config.profile||SHORE_DAY_PROFILES[0];
 if(!profile)throw new Error(`Unknown profile: ${config.profile}`);
 const date=config.date||'2026-09-30',startHour=config.startHour??6,seconds=config.seconds??900,dt=config.step??.1,x=config.x??profile.spots[0];
 if(!(seconds>0&&dt>0&&dt<=.25))throw new Error('Session seconds must be positive and step must be in (0, .25].');
 // The shared clock reads this advancing real instant; s.elapsed stays physical.
 const startEpoch=config.startIso?Date.parse(config.startIso):californiaSessionEpoch(date,startHour);
 if(!Number.isFinite(startEpoch))throw new Error(`Invalid start instant: ${config.startIso}`);
 const startIso=new Date(startEpoch).toISOString();let epoch=startEpoch;
 const sim=createSimulation({sceneId:profile.sceneId,date,clockMode:'shared',now:()=>new Date(epoch)});
 if(sim.clockMode!=='shared'||!sim.sharedWorld)throw new Error('This experiment requires the production shared-clock implementation.');
 const s=sim.state,initialElapsed=s.elapsed,initialStats={...s.stats};
 const report={profile:profile.id,scene:profile.sceneId,date,startHour,startIso,x,requestedSeconds:seconds,step:dt,
  policy:{naturalFish:true,clockMode:'shared',controller:'informed standardized automation, not measured human play',target:'known trough through ballistic preview; Benicia 27 m offshore',
   fightReleaseTension:.62,fightResumeTension:.42,startingBudget:120,rod:'starter_rod',rig:profile.rig,bait:profile.bait||null,drag:.55,strikeReactionSeconds:.4,
   bottomSoakSeconds:360,lureSinkSeconds:3,lureHoldSeconds:1,lureReleaseSeconds:.8,releaseAllFish:true},
  casts:0,bites:0,hooked:0,landed:0,species:{},biteSpecies:{},firstBiteSeconds:null,firstLandingSeconds:null,
  blankCasts:0,losses:{snagged:0,broken:0,escaped:0},baitings:0,rigReplacements:0,purchases:[],castFailures:[],catches:[],
  initialStock:stock(s),startConditions:conditions(sim),phaseSeconds:{},stoppedReason:null,stoppedSeconds:0,finite:true};
 let stage='shop',outfitted=false,hold=createShoreReelHold(),biteSince=null,retrieveHome=false,castAt=0,nextCastAt=0,settleUntil=0;
 let fightHeld=false,priorSupply=null,castingFailures=0;
 function fit(){
  let supply=shoreSupply(s);
  if(!supply||supply.id!==profile.rig||supply.condition<=.08){
   const result=sim.configureEquipment(profile.rig);if(!result.ok){report.stoppedReason='no usable replacement rig';return false;}
   if(outfitted)report.rigReplacements++;supply=shoreSupply(s);
  }
  if(profile.bait&&(!supply.bait||supply.bait.kind!==profile.bait||supply.bait.condition<=.18)){
   const result=sim.equipBait(profile.bait);if(!result.ok){report.stoppedReason='bait exhausted';return false;}report.baitings++;
  }
  return true;
 }
 function recordLanding(elapsed){
  if(s.phase!=='landed')return;
  const fish=s.fish;report.landed++;report.species[fish.id]=(report.species[fish.id]||0)+1;
  report.firstLandingSeconds??=round(elapsed);report.catches.push({seconds:round(elapsed),species:fish.id,lengthCm:fish.length,weightKg:fish.weightKg,fightSeconds:round(s.fightElapsed)});
  const result=sim.resolveCatch(false);if(!result.ok)throw new Error(result.message);nextCastAt=elapsed+1;retrieveHome=false;
 }
 for(let elapsed=0;elapsed<seconds-1e-9;){
  const step=Math.min(dt,seconds-elapsed);
  if(s.inspection)sim.acknowledgeInspection();
  if(stage==='shop'&&s.phase==='walk'){
   if(!sim.nearShop){if(!s.walkTarget){const result=sim.walkTo(sim.shop.door.x,sim.shop.door.y);if(!result.ok)throw new Error(result.message);}}
   else{
    // Finite supplies bought from the normal 120-credit starting balance.
    const shopping=isShoreLure(profile.rig)?[profile.rig,profile.rig,profile.rig]:[profile.rig,profile.rig,profile.bait,...(profile.bait==='sandcrab'?[]:[profile.bait])];
    for(const item of shopping){const before=s.credits,result=sim.buy(item);report.purchases.push({item,ok:result.ok,cost:before-s.credits});}
    if(!fit())stage='stopped';else{outfitted=true;stage='walk';const target=shoreStandPosition(sim.scene,x),r=sim.walkTo(target.x,target.y);if(!r.ok)throw new Error(r.message);}
   }
  }
  if(stage==='walk'&&s.phase==='walk'&&!s.walkTarget){stage='fish';settleUntil=elapsed+5;report.fishingPosition={x:s.player.x,y:s.player.y};report.arrivalSeconds=round(elapsed);report.fishingConditions=conditions(sim);report.stockAtWater=stock(s);}
  if(stage==='fish'&&s.phase==='walk'&&elapsed>=Math.max(nextCastAt,settleUntil)){
   if(fit()){
    const result=sim.cast(castPlan(sim,profile));
    if(result.ok){castAt=elapsed;retrieveHome=false;castingFailures=0;}
    else{
     report.castFailures.push({seconds:round(elapsed),message:result.message});nextCastAt=elapsed+2;castingFailures++;
     // Crowds are real obstacles. Try a nearby walkable gap, never delete them.
     if(/空位/.test(result.message)&&castingFailures<=6){const target=shoreStandPosition(sim.scene,x+(castingFailures%2?1:-1)*Math.ceil(castingFailures/2)*12);sim.walkTo(target.x,target.y);stage='walk';}
     else if(castingFailures>=6){stage='stopped';report.stoppedReason='repeated cast obstruction';}
    }
   }else stage='stopped';
  }
  if(s.phase==='bite'){
   if(biteSince===null)biteSince=elapsed;
   if(elapsed-biteSince>=.4){const result=sim.strike();if(result.ok){report.hooked++;fightHeld=true;}}
  }else biteSince=null;
  recordLanding(elapsed);
  let want=false;
  if(s.phase==='fighting'){
   // Hysteresis models reacting to the visible rod load without frame chatter.
   if(s.tension>=.62)fightHeld=false;else if(s.tension<=.42)fightHeld=true;want=fightHeld;
  }else if(s.phase==='waiting'){
   if(isShoreLure(profile.rig))want=s.soakSeconds>=3&&(s.soakSeconds-3)%1.8<1;
   else{
    const bait=shoreSupply(s)?.bait;
    if(!bait||bait.condition<=.18||elapsed-castAt>=360)retrieveHome=true;
    want=retrieveHome;
   }
  }
  hold=setShoreReelHeld(hold,'session',want,{enabled:sim.canReel});
  const gesture=stepShoreReelHold(hold,step,{enabled:sim.canReel});hold=gesture.state;
  const beforePhase=s.phase,beforeCast=s.cast,hadFish=s.fish;priorSupply=shoreSupply(s);
  if(stage==='stopped')report.stoppedSeconds+=step;
  report.phaseSeconds[beforePhase]=(report.phaseSeconds[beforePhase]||0)+step;
  epoch+=step*1000;sim.update(step,{...gesture.input,drag:.55});elapsed+=step;
  if(beforePhase!=='bite'&&s.phase==='bite'){
   report.bites++;report.firstBiteSeconds??=round(elapsed);report.biteSpecies[s.biteSpeciesId]=(report.biteSpecies[s.biteSpeciesId]||0)+1;
  }
  if(beforeCast&&!s.cast){
   if(hadFish&&beforePhase==='fighting')report.losses[shoreSupply(s)?'escaped':'broken']++;
   else{report.blankCasts++;if(priorSupply&&!shoreSupply(s))report.losses.snagged++;}
   nextCastAt=elapsed+1;
  }
  if(![s.player.x,s.player.y,s.lineDistance,s.tension,s.elapsed].every(Number.isFinite)){report.finite=false;throw new Error(`Nonfinite session state: ${profile.id}`);}
 }
 // A fish completed by the last physics step is already landed at the
 // deadline. Record/release it without granting another step of fight time.
 recordLanding(seconds);
 report.casts=s.stats.casts-initialStats.casts;report.missedBites=s.stats.missed-initialStats.missed;
 report.seconds=round(s.elapsed-initialElapsed);report.calendarSeconds=round((epoch-startEpoch)/1000);report.stoppedSeconds=round(report.stoppedSeconds);
 report.endConditions=conditions(sim);report.finalPhase=s.phase;report.finalStock=stock(s);
 report.activeFishAtEnd=s.phase==='fighting'?{species:s.fish.id,fightSeconds:round(s.fightElapsed),lineDistance:s.lineDistance}:null;
 report.censored=Boolean(report.activeFishAtEnd);report.zeroLandings=report.landed===0;report.blank=report.zeroLandings&&!report.censored;
 report.phaseSeconds=Object.fromEntries(Object.entries(report.phaseSeconds).map(([phase,n])=>[phase,round(n)]));
 return report;
}

export function summarizeShoreSessions(results){
 const sum=key=>results.reduce((n,r)=>n+r[key],0),species={},censoredSpecies={},stoppedByReason={};
 for(const r of results)for(const [id,n]of Object.entries(r.species))species[id]=(species[id]||0)+n;
 for(const r of results)if(r.activeFishAtEnd){const id=r.activeFishAtEnd.species;censoredSpecies[id]=(censoredSpecies[id]||0)+1;}
 for(const r of results)if(r.stoppedReason){const row=stoppedByReason[r.stoppedReason]??={sessions:0,seconds:0};row.sessions++;row.seconds=round(row.seconds+r.stoppedSeconds);}
 return{sessions:results.length,seconds:sum('seconds'),scheduledSeconds:sum('requestedSeconds'),casts:sum('casts'),bites:sum('bites'),hooked:sum('hooked'),landed:sum('landed'),blankSessions:results.filter(r=>r.blank).length,
  zeroLandingSessions:results.filter(r=>r.zeroLandings).length,censoredSessions:results.filter(r=>r.censored).length,activeFishAtEnd:results.filter(r=>r.activeFishAtEnd).length,censoredSpecies,
  blankFraction:results.filter(r=>r.blank).length/results.length,landedPerScheduledHour:sum('landed')/Math.max(1,sum('requestedSeconds'))*3600,species,stoppedSeconds:round(sum('stoppedSeconds')),stoppedByReason,
  losses:Object.fromEntries(['snagged','broken','escaped'].map(key=>[key,results.reduce((n,r)=>n+r.losses[key],0)]))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),value=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
 const profiles=value('--profile',null)?SHORE_DAY_PROFILES.filter(p=>p.id===value('--profile')):SHORE_DAY_PROFILES;
 if(!profiles.length)throw new Error('Unknown --profile.');
 const hours=value('--hours','6,12,17').split(',').map(Number),seconds=Number(value('--seconds',900)),step=Number(value('--step',.1)),date=value('--date',shoreWorldTime().date);
 const sources=[...(await readdir(new URL('../dist/',import.meta.url))).filter(name=>name.endsWith('.js')).map(name=>`dist/${name}`),'scripts/simulate-shore-day.mjs'].sort();
 const sourceHashes=Object.fromEntries(await Promise.all(sources.map(async file=>[file,createHash('sha256').update(await readFile(new URL(`../${file}`,import.meta.url))).digest('hex')])));
 const started=performance.now(),results=[];
 for(const profile of profiles)for(const startHour of hours)for(const x of value('--spot',null)?[Number(value('--spot'))]:profile.spots){
  const config={profile,date,startHour,seconds,step,x},r=playShoreSession(config);results.push(r);
  console.log(`${profile.id} ${startHour}:00 x${x}: ${r.casts} casts, ${r.bites} bites, ${r.hooked} hooked, ${r.landed} landed; ${r.stoppedReason||r.finalPhase}`);
 }
 let deterministicReplay=null;
 if(args.includes('--verify')){
  deterministicReplay=true;
  for(const first of results){
   const again=playShoreSession({profile:first.profile,date,startHour:first.startHour,seconds,step,x:first.x});
   if(JSON.stringify(first)!==JSON.stringify(again))throw new Error(`Identical session replay differed: ${first.profile} ${first.startHour}:00 x${first.x}`);
  }
 }
 const report={kind:'accelerated production player sessions; naturally encountered fish only',generatedAt:new Date().toISOString(),date,timezone:'America/Los_Angeles',clockMode:'shared',sourceHashes,
  note:'Spatial/time/profile samples are a deterministic schedule, not independent random replicates or real-world catch forecasts. This informed standardized bot uses exact tension thresholds and known trough distances through trajectory preview; results do not measure novice, human, or random-player chances. Calendar seconds and active simulation seconds are reported separately. A blank session has no landed fish and no fight active at the deadline; ongoing fights are censored and counted separately. Rates use the entire scheduled session, including outfitting, walking and idle time after supply exhaustion; stopped time/reasons are reported.',
  deterministicReplay,deterministicReplaySessions:deterministicReplay?results.length:0,wallSeconds:round((performance.now()-started)/1000),summary:summarizeShoreSessions(results),results};
 report.byProfile=Object.fromEntries(profiles.map(p=>[p.id,summarizeShoreSessions(results.filter(r=>r.profile===p.id))]));
 report.byStartHour=Object.fromEntries(hours.map(hour=>[hour,summarizeShoreSessions(results.filter(r=>r.startHour===hour))]));
 const out=value('--json',null);if(out)await writeFile(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({summary:report.summary,wallSeconds:report.wallSeconds,deterministicReplay},null,2));
}
