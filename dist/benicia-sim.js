import {shoreDayHash} from './shore-day.js';
import {SHORE_MOVEMENT as M} from './shore-movement.js';
import {PacificaSimulation,PIXELS_PER_METRE} from './pacifica-sim.js';
import {beniciaSea,beniciaSample} from './benicia-data.js';
import {beniciaCrowd,crowdCastConflict,BENICIA_ANGLERS} from './benicia-crowd.js';
import {shoreSupply,isShoreLure,syncShoreEquipment,shoreSlots,wearShoreSupplies} from './shore-equipment.js';
import {SHORE_POPULATION_SPECIES} from './shore-fish-ecology.js';
import {restorePopulation} from './fish-population.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const BENICIA_SALMON=Object.freeze({id:'chinook_salmon',school:[1,3],density:7,cruise:.7,burst:4,smell:.2,sight:8,sightDrive:1,wariness:.65,calmSeconds:45,patience:18,biteRate:.65,giveUpMeters:45,lengthCm:[48,98],cohortSd:.08,probeMeters:12,arrivalSeconds:65,preferredDepth:d=>Math.min(3,Math.max(.6,d*.6)),verticalReach:d=>Math.max(1,d*.6)});
export const BENICIA_SPECIES=Object.freeze([BENICIA_SALMON,...SHORE_POPULATION_SPECIES.filter(s=>['striped_bass','jacksmelt','white_croaker','pile_perch','shiner_perch'].includes(s.id))]);
export function beniciaSalmonSuitability(sample,month,elapsed=0){
 const season=[0,0,0,0,0,.015,.12,.65,1,.85,.2,.015][month-1]||0;
 const corridor=Math.exp(-(((sample.offshore-27)/30)**2)),depth=clamp((sample.depth-.3)/1.5,0,1);
 // Migration pulses are authored availability, not claimed measured CPUE.
 const pulse=.25+.75*Math.max(0,Math.sin(elapsed/85+sample.offshore/40))**2;
 return season*corridor*depth*pulse;
}
export function beniciaLureAppeal(id,rig,speed,depth,bottom){
 if(!isShoreLure(rig)||depth<.15)return 0;
 const motion=Math.exp(-(((speed-(rig==='salmon_spinner'?.8:.65))/.6)**2));
 const layer=Math.exp(-(((depth-Math.min(2.5,bottom*.6))/2.5)**2));
 return(id==='chinook_salmon'?1:id==='striped_bass'?.6:.008)*motion*layer*(speed>.12?1:.025);
}
export class BeniciaSimulation extends PacificaSimulation{
 constructor(options={}){
  super({...options,sceneId:'benicia',regular:false});
  const s=this.state,valid=options.saved?.scene==='benicia';
  s.crowdSeed=this.sharedWorld?shoreDayHash('benicia',this.calendarDate(),'crowd'):valid?Math.max(1,Number(options.saved.crowdSeed)||1):Math.floor(this.random()*1e6)+1;
  s.crowd=beniciaCrowd(this.sharedWorld?.timeSeconds??s.elapsed,s.crowdSeed,this.calendar().getUTCMonth()+1);
  if(!valid){
   s.rodSupplies.starter_rod={id:'salmon_spoon',condition:1,bait:null};
   s.rigStock.salmon_spoon=[{id:'salmon_spoon',condition:1,bait:null}];
   s.inventory.sandcrab=0;s.inventory.anchovy=6;syncShoreEquipment(s);shoreSlots(s);
  }
  if(valid&&options.saved.population)this.population=restorePopulation(options.saved.population,1,BENICIA_SPECIES.map(d=>d.id));
  s.retrieveSpeed=0;s.snagSeconds=0;s.crowdHintAt=-Infinity;
 }
 updateSea(){const s=this.state;if(s.seaState&&!s.seaState.climate)return;s.seaState={...beniciaSea(this.calendarDate(),this.sharedWorld?this.sharedWorld.timeSeconds/3600:this.calendar().getUTCHours()),...(this.sharedWorld?{environmentSeconds:this.sharedWorld.environmentSeconds}:{})};}
 cast(options){
  const s=this.state;if(s.phase==='walk'){
   const n=crowdCastConflict(s,this.previewCast(options).target);
   if(n)return this.result(false,`${n.name} 正在这里抛收，往旁边空位挪几步。`);
  }
  s.snagSeconds=0;return super.cast(options);
 }
 fishWorld(){
  const w=super.fishWorld(),s=this.state,month=this.calendar().getUTCMonth()+1,supply=shoreSupply(s),lure=isShoreLure(supply?.id);
  w.species=BENICIA_SPECIES;w.stimuli=[];
  w.suitability=(def,x,y)=>{
   const env=this.fishEnv(x,y);if(!env.water)return 0;const e=env.sample;
   if(def.id==='chinook_salmon')return beniciaSalmonSuitability(e,month,this.sharedWorld?.timeSeconds??s.elapsed);
   if(def.id==='striped_bass')return clamp(e.depth/2,0,1)*.5;
   if(def.id==='pile_perch'||def.id==='shiner_perch')return Math.max(e.rockStructure,e.pierStructure)*.65;
   return e.depth>.3?.22:0;
  };
  if(lure&&s.cast&&['waiting','bite'].includes(s.phase)){
   const e=s.shoreSample,p=s.presentation||{},speed=s.retrieveSpeed||0;
   w.stimulus={id:s.castId,...this.toPlane(s.cast.target.x,s.cast.target.y),depth:p.depth||0,scent:0,flash:speed>.12?1:.05,motion:speed,soakSeconds:s.soakSeconds,currentX:e.currentX,currentY:-e.currentY,
    appeal:def=>beniciaLureAppeal(def.id,supply.id,speed,p.depth||0,e.depth)*supply.condition};
  }
  return w;
 }
 tick(dt,input){
  this.state.retrieveInput=Boolean(input?.reel);
  super.tick(dt,input);
  if(this.sharedWorld)this.state.crowdSeed=shoreDayHash('benicia',this.calendarDate(),'crowd');
  this.state.crowd=beniciaCrowd(this.sharedWorld?.timeSeconds??this.state.elapsed,this.state.crowdSeed||1,this.calendar().getUTCMonth()+1);
 }
 drift(dt,input={}){
  const s=this.state,supply=shoreSupply(s),crankDriven=Number.isFinite(input.crankRate);
  if(crankDriven)s.autoRetrieve=false;
  const reeling=crankDriven?input.crankRate>0:s.autoRetrieve||(input.reel===undefined?this.reeling:Boolean(input.reel));
  if(isShoreLure(supply?.id)&&s.cast){
   const e=this.refreshSample(),p=s.presentation;
   // Exposure belongs to this rock contact, not to a remembered patch of
   // seabed. A lifted lure or one swept onto mud cannot break on old rocks.
   if(e.substrate!=='rock'||!(p?.bottomContact>.8))s.snagSeconds=0;
   else if(!reeling)s.snagSeconds+=dt;
   if(s.snagSeconds>6&&reeling){wearShoreSupplies(s,'break');this.clearLine();s.message='拟饵卡在石缝，拉断了前导。需要装上备用钓组。';return;}
  }
  super.drift(dt,input);
 }

 talkLocal(id){
  const s=this.state,n=s.crowd.find(n=>n.id===id);
  if(!n||s.phase!=='walk'||Math.hypot(n.x-s.player.x,n.y-s.player.y)>M.talkReach)return{ok:false,message:'收好竿，走近钓友再打招呼。'};
  const zone=s.shoreSample.zoneId,noteId=`${zone}:local:${id%BENICIA_ANGLERS.length}`;
  const fresh=!s.shoreLore.notes.some(n=>n.id===noteId);
  if(fresh)s.shoreLore.notes.push({id:noteId,zoneId:zone,topic:'local',title:`${n.name} 的经验`,text:n.line,angler:0,sourceName:n.name,learnedAt:s.elapsed});
  return{ok:true,name:n.name,text:n.line,fresh};
 }
 snapshot(){return{...super.snapshot(),crowdSeed:this.state.crowdSeed};}
 sellCatch(){if(!this.nearShop)return super.sellCatch();const check=this.wardenInspect();if(check.ok===false)return check;return super.sellCatch();}
}
