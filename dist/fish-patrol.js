/**
 * Unannounced, legality-independent game inspections. This is illustrative
 * game behaviour, not a claim about CDFW patrol schedules or enforcement rates.
 * Only state.inspection is mutated here. The caller handles engine controls,
 * legal assessment, confiscation, credits, sound and the trip journal.
 */
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const number=(n,f=0)=>Number.isFinite(n)?n:f;
const cargo=s=>Array.isArray(s.catches)&&s.catches.some(f=>f.kept&&!f.settled);
function seededRandom(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function independentRandom(){const seed=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(seed);else seed[0]=(Date.now()^Math.round(number(globalThis.performance?.now?.())*1000))>>>0;return seededRandom(seed[0]);}

export class FishingPatrol {
  constructor({rng=independentRandom(),isWater=()=>true}={}){
    this.rng=rng;this.isWater=isWater;this.serial=0;this.resetTrip();
  }
  random(){return clamp(number(this.rng(),.5),0,.999999999);}
  resetTrip(){
    this.activeBoatSeconds=0;this.nextInspectionAt=300+240+this.random()*300;
    this.dockConsidered=false;this.retryAt=0;this.completed=0;
  }
  spawn(state,reason){
    if(state.inspection||!cargo(state))return false;
    const bx=number(state.boatX),bz=number(state.boatZ),base=number(state.heading)+Math.PI/2;
    let position=null;
    for(let attempt=0;attempt<12;attempt++){
      const angle=base+(attempt?this.random()*TAU:0),r=90+this.random()*45,x=bx-Math.sin(angle)*r,z=bz-Math.cos(angle)*r;
      if(this.isWater(x,z)){position={x,z};break;}
    }
    if(!position){this.retryAt=this.activeBoatSeconds+30;return false;}
    state.inspection={id:++this.serial,phase:'approaching',...position,heading:Math.atan2(-(bx-position.x),-(bz-position.z)),progress:0,elapsed:0,reason};
    return true;
  }
  /** One independent 25% draw at a cargo-bearing return request per trip. */
  considerDock(state){
    if(state.paused||this.dockConsidered)return false;
    this.dockConsidered=true;
    if(state.inspection||!cargo(state))return false;
    if(this.random()>=.25)return false;
    return this.spawn(state,'dock');
  }
  navigate(p,target,speed,dt){
    const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.02)return;
    const desired=Math.atan2(-dx,-dz),step=Math.min(d,speed*dt);
    for(const offset of[0,.55,-.55,1.1,-1.1,Math.PI/2,-Math.PI/2]){
      const heading=desired+offset,nx=p.x-Math.sin(heading)*step,nz=p.z-Math.cos(heading)*step;
      if(this.isWater(nx,nz)){p.x=nx;p.z=nz;p.heading=heading;return;}
    }
  }
  update(state,dt,{assessment={violations:[]}}={}){
    const events=[];
    if(state.paused||state.mode==='intro')return events;
    let remaining=clamp(number(dt),0,60);
    while(remaining>0){const step=Math.min(remaining,.25);remaining-=step;
      const afloat=state.mode==='boat'&&state.launchStage!=='stored'&&state.launchStage!=='lowering';
      if(afloat&&!state.moored)this.activeBoatSeconds+=step;
      if(!state.inspection&&afloat&&!state.moored&&this.activeBoatSeconds>=this.nextInspectionAt&&this.activeBoatSeconds>=this.retryAt){
        if(cargo(state))this.spawn(state,'water');
        // Passing a scheduled opportunity with an empty cooler does not leave
        // a hidden overdue inspection that pounces on the next fish caught.
        else this.nextInspectionAt=this.activeBoatSeconds+240+this.random()*300;
      }
      const p=state.inspection;if(!p)continue;
      p.elapsed=number(p.elapsed)+step;
      const bx=number(state.boatX),bz=number(state.boatZ),heading=number(state.heading),side={x:Math.cos(heading),z:-Math.sin(heading)};
      // Keep two enlarged pixel hulls separate while displaying the check.
      let target={x:bx+side.x*11,z:bz+side.z*11};
      if(!this.isWater(target.x,target.z))target={x:bx-side.x*11,z:bz-side.z*11};
      if(p.phase==='approaching'){
        this.navigate(p,target,Math.max(7.5,Math.abs(number(state.speed))+3),step);
        p.progress=clamp(1-Math.hypot(p.x-target.x,p.z-target.z)/120,0,1);
        if(Math.hypot(p.x-target.x,p.z-target.z)<1.2){p.phase='checking';p.elapsed=0;p.progress=0;p.heading=heading;events.push({type:'inspection-start',id:p.id,reason:p.reason});}
        else if(p.elapsed>120){p.phase='departing';p.elapsed=0;p.progress=0;this.nextInspectionAt=this.activeBoatSeconds+240+this.random()*300;}
      }else if(p.phase==='checking'){
        this.navigate(p,target,Math.max(7.5,Math.abs(number(state.speed))+3),step);p.heading=heading;p.progress=clamp(p.elapsed/8,0,1);
        if(p.elapsed>=8){
          const result=typeof assessment==='function'?assessment(state):assessment;
          const violations=Array.isArray(result?.violations)?result.violations.map(v=>typeof v==='object'&&v!==null?{...v}:v):[];
          events.push({type:'inspection-result',id:p.id,reason:p.reason,violations});
          p.phase='departing';p.elapsed=0;p.progress=0;this.completed++;this.nextInspectionAt=this.activeBoatSeconds+240+this.random()*300;
        }
      }else if(p.phase==='departing'){
        const away=Math.atan2(-(p.x-bx),-(p.z-bz));
        this.navigate(p,{x:p.x-Math.sin(away)*90,z:p.z-Math.cos(away)*90},8,step);p.progress=clamp(p.elapsed/16,0,1);
        if(p.elapsed>=16){state.inspection=null;events.push({type:'inspection-ended',id:p.id});}
      }
    }
    return events;
  }
}
