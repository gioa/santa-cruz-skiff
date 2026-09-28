/**
 * Passive Monterey Bay wildlife, with an independent deterministic RNG.
 *
 * Seasonal references (NOAA, consulted 2026-09-27):
 * https://montereybay.noaa.gov/visitor/seasons.html
 * https://montereybay.noaa.gov/media/visitor/access/wildlife-calendar.pdf
 * https://montereybay.noaa.gov/visitor/whalewatching/
 *
 * NOAA supports the species, broad seasonal presence and forage relationships.
 * The arrival rates, depth cutoffs, distances and animation cycles below are
 * illustrative game tuning, NOT measured encounter probabilities or forecasts.
 * Birds and cetaceans never change catches, stock, credits or fishing RNG.
 */
import {createBaitSchool,followerPosition} from './pixel-bait-schools.js?v=20260927-pixel-v35';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,f=0)=>Number.isFinite(x)?x:f;
export const WILDLIFE_SOURCES=Object.freeze([
  {title:'NOAA — Seasons in the Sanctuary',url:'https://montereybay.noaa.gov/visitor/seasons.html'},
  {title:'NOAA — Wildlife Viewing Calendar',url:'https://montereybay.noaa.gov/media/visitor/access/wildlife-calendar.pdf'},
  {title:'NOAA — Whale Watching Guidelines',url:'https://montereybay.noaa.gov/visitor/whalewatching/'},
]);
export const WILDLIFE_TUNING=Object.freeze({
  illustrative:true,notObservedProbabilities:true,
  meanEligibleSeconds:Object.freeze({bait:240,dolphins:720,whale:1800}),
  minimumEligibleSeconds:Object.freeze({bait:90,dolphins:300,whale:900}),
  maximumActive:2,
});
function randomGenerator(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function defaultSeed(){const data=new Uint32Array(1);if(globalThis.crypto?.getRandomValues){globalThis.crypto.getRandomValues(data);return data[0];}return(Date.now()^Math.round(finite(globalThis.performance?.now?.())*1000))>>>0;}
function currentMonth(){return Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',month:'numeric'}).format(new Date()));}
export function wildlifeSeason(month=9){
  const m=clamp(Math.floor(finite(month,9)),1,12);
  return {
    bait:[.7,.65,.55,.6,.8,.95,1,1.15,1.2,1.1,.9,.75][m-1],
    dolphins:m===8||m===9?1.35:m>=6&&m<=10?1:.72,
    humpback:m>=3&&m<=11?(m>=5&&m<=10?1:.5):0,
    gray:m===12||m<=2?.9:m>=3&&m<=5?.8:0,
    blue:m>=6&&m<=9?.4:0,
  };
}

/** habitat(x,z) => {water:boolean,depth:number,distanceFromHarbor?:number}. */
export function createWildlife({seed=defaultSeed(),month=currentMonth(),habitat=()=>({water:false,depth:0}),origin={x:-34.2,z:-55}}={}){
  const random=randomGenerator(seed),events=[],history=[],hazards={},thresholds={};let elapsed=0,serial=0;
  const exponential=()=>-Math.log(Math.max(1e-9,1-random()));
  const waitingScale={bait:150,dolphins:420,whale:900};
  const arrivalThreshold=type=>WILDLIFE_TUNING.minimumEligibleSeconds[type]/waitingScale[type]+exponential();
  for(const type of['bait','dolphins','whale']){hazards[type]=0;thresholds[type]=arrivalThreshold(type);}
  function environment(x,z){const h=habitat(x,z)||{};return{...h,water:Boolean(h.water),depth:finite(h.depth),distanceFromHarbor:finite(h.distanceFromHarbor,Math.hypot(x-origin.x,z-origin.z))};}
  function spawn(type,s,conditions,season){
    const observer={x:finite(s.boatX,origin.x),z:finite(s.boatZ,origin.z)},range=type==='bait'?[15,34]:type==='dolphins'?[29,58]:[48,79];
    let p=null,env=null;
    for(let i=0;i<12;i++){
      const a=random()*TAU,r=range[0]+random()*(range[1]-range[0]),candidate={x:observer.x+Math.cos(a)*r,z:observer.z+Math.sin(a)*r},h=environment(candidate.x,candidate.z),minDepth=type==='whale'?13:type==='dolphins'?7:3;
      if(h.water&&h.depth>=minDepth&&h.distanceFromHarbor>(type==='whale'?290:type==='dolphins'?95:40)){p=candidate;env=h;break;}
    }
    if(!p)return false;
    const nearbyBait=events.find(e=>e.type==='bait'&&Math.hypot(e.x-p.x,e.z-p.z)<55);
    let species,name,members,speed,duration,school=null;
    if(type==='bait'){school=createBaitSchool(random,{depth:env.depth,month:conditions.month||month,waterTemp:finite(conditions.waterTemp,14)});species=school.species;name='饵鱼群与觅食海鸟';members=Math.max(1,Math.round(1+school.density*school.radius*.5));speed=.12+random()*.11;duration=50+random()*55;}
    if(type==='dolphins'){species=random()<.55?'pacific-white-sided-dolphin':'common-dolphin';name=species==='common-dolphin'?'普通海豚群':'太平洋斑纹海豚群';members=3+Math.floor(random()*5);speed=1.25+random()*.9;duration=65+random()*35;}
    if(type==='whale'){
      const weights=[['humpback','座头鲸',season.humpback],['gray','灰鲸',season.gray],['blue','蓝鲸',env.depth>55&&env.distanceFromHarbor>1250?season.blue:0]],total=weights.reduce((sum,e)=>sum+e[2],0);
      if(total<=0)return false;let ticket=random()*total;for(const [id,title,weight]of weights){ticket-=weight;if(ticket<=0){species=id;name=title;break;}}
      members=species==='humpback'&&nearbyBait&&random()>.55?2:1;speed=species==='gray'?.8:.43+random()*.27;duration=90+random()*60;
    }
    // Pods cross the sector independently. They do not chase or attach to boats.
    let heading=Math.atan2(p.x-observer.x,-(p.z-observer.z))+(random()>.5?Math.PI/2:-Math.PI/2);
    if(nearbyBait&&type==='dolphins')heading=Math.atan2(-(nearbyBait.x-p.x),-(nearbyBait.z-p.z));
    const event={...school,id:++serial,type,species,name,x:p.x,z:p.z,heading,age:0,duration,members,speed,phase:random()*TAU,seed:Math.floor(random()*0xffffffff),linkedBaitId:nearbyBait?.id||null};
    events.push(event);history.unshift({id:event.id,type,species,name,elapsed:Math.round(elapsed)});history.splice(20);
    return true;
  }
  function update(state,dt,conditions={}){
    if(state.paused||state.mode==='intro')return events;
    let remaining=clamp(finite(dt),0,60);
    while(remaining>0){const step=Math.min(remaining,.5);remaining-=step;elapsed+=step;
      for(let i=events.length-1;i>=0;i--){
        const e=events[i];e.age+=step;
        const nx=e.x-Math.sin(e.heading)*e.speed*step,nz=e.z-Math.cos(e.heading)*e.speed*step,h=environment(nx,nz);
        if(h.water&&h.depth>(e.type==='whale'?9:e.type==='dolphins'?4:1)){e.x=nx;e.z=nz;}else{e.heading+=step*.8;e.duration=Math.min(e.duration,e.age+12);}
        const boatDistance=Math.hypot(e.x-finite(state.boatX,origin.x),e.z-finite(state.boatZ,origin.z));
        // The animals can pass the scene but never intentionally circle a boat.
        if(e.type!=='bait'&&boatDistance<18)e.heading=Math.atan2(-(e.x-state.boatX),-(e.z-state.boatZ));
        if(e.age>=e.duration||boatDistance>450)events.splice(i,1);
      }
      if(state.mode!=='boat'||state.moored||events.length>=WILDLIFE_TUNING.maximumActive)continue;
      const h=environment(finite(state.boatX,origin.x),finite(state.boatZ,origin.z));if(!h.water||h.depth<3)continue;
      const season=wildlifeSeason(conditions.month||month),hour=(6+finite(state.elapsed)/3600)%24,daylight=hour>=5.7&&hour<19.7?1:.12,morning=hour>=6&&hour<11?1.15:1;
      // Rough seas reduce visibility of encounters; this is not animal absence.
      const visibility=clamp(1-finite(conditions.waveHeight)*.15-finite(conditions.windKnots)*.013,.2,1);
      const active=type=>events.some(e=>e.type===type);
      const rates={
        bait:!active('bait')&&h.distanceFromHarbor>40?season.bait*morning*daylight*visibility/waitingScale.bait:0,
        dolphins:!active('dolphins')&&h.depth>=7&&h.distanceFromHarbor>95?season.dolphins*daylight*visibility/waitingScale.dolphins:0,
        whale:!active('whale')&&h.depth>=13&&h.distanceFromHarbor>290?(season.humpback+season.gray+season.blue*.5)*daylight*visibility/waitingScale.whale:0,
      };
      for(const type of['bait','dolphins','whale']){
        hazards[type]+=rates[type]*step;
        if(hazards[type]>=thresholds[type]&&events.length<WILDLIFE_TUNING.maximumActive){hazards[type]=0;thresholds[type]=arrivalThreshold(type);spawn(type,state,conditions,season);}
      }
    }
    return events;
  }
  return {update,get events(){return events;},get history(){return history.map(e=>({...e}));},get seed(){return seed>>>0;},snapshot(){return events.map(e=>({id:e.id,type:e.type,species:e.species,name:e.name,x:Math.round(e.x),z:Math.round(e.z),age:Math.round(e.age),members:e.members,...(e.type==='bait'?{radius:e.radius,density:e.density,depth:e.depth,thickness:e.thickness,visualFishCount:e.visualFishCount,followers:e.followers.map(f=>({...f}))}:{})}));}};
}

// All marks land on whole pixels. project() is supplied by the world renderer,
// so these visuals follow the same map projection and camera compression.
export function drawWildlife(ctx,events,{project,scale=5,sprites={},layer='water'}={}){
  if(!project)return;
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
  const line=(x0,y0,x1,y1,color,width=1)=>{x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;for(let i=0;i<1000;i++){rect(x0,y0,width,width,color);if(x0===x1&&y0===y1)break;const e=2*error;if(e>=dy){error+=dy;x0+=sx;}if(e<=dx){error+=dx;y0+=sy;}}};
  const oval=(cx,cy,rx,ry,color)=>{for(let y=Math.ceil(cy-ry);y<=Math.floor(cy+ry);y++){const d=(y-cy)/Math.max(.01,ry),span=Math.sqrt(Math.max(0,1-d*d))*rx;rect(cx-span,y,span*2,1,color);}};
  const ripple=(x,y,r,alpha=.5)=>{ctx.globalAlpha=alpha;line(x-r,y,x-r*.6,y-2,'#b3ded0');line(x-r*.6,y-2,x+r*.65,y-2,'#b3ded0');line(x+r*.65,y-2,x+r,y,'#b3ded0');line(x-r*.7,y+2,x+r*.6,y+2,'#a2d5c9');ctx.globalAlpha=1;};
  for(const e of events){
    const p=project(e.x,e.z),fade=clamp(Math.min(e.age/3,(e.duration-e.age)/6),0,1),s=clamp(scale/5.5,.55,1.7);
    if(p.x<-220||p.x>ctx.canvas.width+220||p.y<-220||p.y>ctx.canvas.height+220)continue;
    if(e.type==='bait'){
      if(layer==='water'){
        const edge=project(e.x+finite(e.radius,8),e.z),edgeZ=project(e.x,e.z+finite(e.radius,8)),rx=Math.max(3,Math.hypot(edge.x-p.x,edge.y-p.y)),ry=Math.max(2,Math.hypot(edgeZ.x-p.x,edgeZ.y-p.y)*.7),density=finite(e.density,.5),count=Math.min(160,finite(e.visualFishCount,23));
        ctx.globalAlpha=(.12+.22*density)*fade;oval(p.x,p.y,rx,ry,'#367e88');
        ctx.globalAlpha=(.32+.45*density)*fade;
        for(let i=0;i<count;i++){const a=i*2.399+e.age*.35,r=Math.sqrt((i+.5)/count),x=p.x+Math.cos(a)*r*rx,y=p.y+Math.sin(a)*r*ry;rect(x,y,2+(i%3===0?1:0),1,i%4?'#a9d2c4':'#e1e8bf');}
        ctx.globalAlpha=1;for(let i=0;i<Math.ceil(density*5);i++)ripple(p.x+Math.sin(i*4.2)*rx*.7,p.y+Math.cos(i*3.7)*ry*.6,3+(e.age*5+i*4)%8,.32*fade);
        // Brief subsurface silhouettes at the school edge; never labels or a
        // promise of a bite. Fish artwork uses actual length in world metres.
        for(const f of e.followers||[]){const pos=followerPosition(e,f);if(!pos.visible)continue;const q=project(pos.x,pos.z),length=Math.max(2,finite(f.lengthCm,65)/100*scale);ctx.save();ctx.globalAlpha=.38*fade;ctx.translate(q.x,q.y);ctx.rotate(pos.heading);oval(0,0,length*.52,length*.14,'#215768');line(-length*.42,0,-length*.7,-length*.17,'#215768');line(-length*.42,0,-length*.7,length*.17,'#215768');ctx.restore();}

      }else{
        for(let i=0;i<e.members;i++){const a=e.age*.34+i*TAU/e.members+e.phase,r=(finite(e.radius,8)*2+(i%3)*7)*s,dive=Math.max(0,Math.sin(e.age*.9+i*1.7))**12,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r*.45-(15-dive*13)*s,asset=sprites[(Math.sin(e.age*5+i)>0)?'gull':'gull2'];ctx.globalAlpha=fade;if(asset)ctx.drawImage(asset,Math.round(x-7*s),Math.round(y-4*s),Math.round(14*s),Math.round(8*s));else{line(x-5,y+Math.sin(e.age*5+i)*2,x,y,'#f2ecd4');line(x,y,x+5,y+Math.sin(e.age*5+i)*2,'#f2ecd4');}if(dive>.8)ripple(x,y+3,3+3*dive,.7*fade);}
        ctx.globalAlpha=1;
      }
      continue;
    }
    if(layer!=='water')continue;
    for(let i=0;i<e.members;i++){
      const offset=(i-(e.members-1)/2),wx=e.x+Math.cos(e.heading)*offset*(e.type==='dolphins'?3.1:15),wz=e.z-Math.sin(e.heading)*offset*(e.type==='dolphins'?3.1:15),q=project(wx,wz),phase=e.age/(e.type==='dolphins'?4.6:19)+e.phase+i*.29,cycle=((phase%1)+1)%1;
      if(e.type==='dolphins'){
        const surf=Math.sin(cycle*Math.PI),visible=cycle<.62;
        ctx.globalAlpha=(visible?.75:.15)*fade;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-e.heading);
        const body=clamp(scale*.75,3,7),length=body*3.6,lift=visible?Math.sin(cycle/.62*Math.PI)*3*s:0;
        oval(2,3,body*.9,length*.45,'#256b78');
        if(visible){oval(0,-lift,body*.55,length*.47,'#345d70');oval(-body*.13,-lift-2,body*.3,length*.35,'#82a5a6');rect(-body*.15,-length*.5-lift,body*.3,3*s,'#a4bdbc');line(-body*.3,2-lift,-body*1.05,5-lift,'#34556a',2);line(body*.3,2-lift,body*.95,5-lift,'#34556a',2);line(0,-1-lift,body*.7,4-lift,'#25485d',2);line(0,length*.42-lift,-body*.8,length*.57-lift,'#36566a',2);line(0,length*.42-lift,body*.8,length*.57-lift,'#36566a',2);if(e.species==='pacific-white-sided-dolphin')line(-body*.32,0-lift,-body*.2,6-lift,'#ced6c4');}
        ctx.restore();ctx.globalAlpha=1;if(cycle>.5&&cycle<.73)ripple(q.x,q.y+5,(cycle-.5)*30*s,.6*fade);
      }else{
        const surfaced=cycle<.43,tail=cycle>=.43&&cycle<.57,bodyLength=clamp(scale*(e.species==='blue'?15:10),38,112),bodyWidth=bodyLength*(e.species==='blue'?.18:.23);
        ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-e.heading);ctx.globalAlpha=(surfaced?.72:tail?.5:.075)*fade;oval(2,4,bodyWidth*.6,bodyLength*.51,'#245c6d');
        if(surfaced){oval(0,0,bodyWidth*.5,bodyLength*.47,e.species==='gray'?'#637b80':'#355b70');oval(-bodyWidth*.12,-bodyLength*.04,bodyWidth*.29,bodyLength*.36,e.species==='gray'?'#91a09d':'#527b89');line(-bodyWidth*.4,4,-bodyWidth*.84,bodyLength*.17,'#294e66',Math.max(2,bodyWidth*.14));line(bodyWidth*.4,4,bodyWidth*.82,bodyLength*.16,'#294e66',Math.max(2,bodyWidth*.14));line(0,bodyLength*.12,bodyWidth*.25,bodyLength*.22,'#203f55',3);if(e.species==='gray')for(let j=0;j<8;j++)rect(Math.sin(j*4)*bodyWidth*.3,Math.cos(j*3)*bodyLength*.28,2,2,'#c0c5b4');}
        if(tail){const rise=Math.sin((cycle-.43)/.14*Math.PI),y=bodyLength*.3;line(0,y,-bodyWidth*.85,y-6-rise*8,'#344f60',3);line(-bodyWidth*.85,y-6-rise*8,-bodyWidth*1.1,y-rise*4,'#587787',3);line(0,y,bodyWidth*.85,y-6-rise*8,'#344f60',3);line(bodyWidth*.85,y-6-rise*8,bodyWidth*1.1,y-rise*4,'#587787',3);line(-bodyWidth*.85,y-7-rise*8,-bodyWidth*.2,y-3,'#c1cebd',1);line(bodyWidth*.85,y-7-rise*8,bodyWidth*.2,y-3,'#c1cebd',1);}
        ctx.restore();ctx.globalAlpha=1;
        if(cycle<.11){const t=cycle/.11,head=project(wx-Math.sin(e.heading)*bodyLength/(scale*2.8),wz-Math.cos(e.heading)*bodyLength/(scale*2.8));ctx.globalAlpha=(1-t)*fade;for(let j=0;j<7;j++){const spread=(j-3)*(2+t*5),height=(16+Math.sin(j*2)*5)*s*t;rect(head.x+spread,head.y-height,Math.max(1,3-t*2),Math.max(2,5-t*3),'#e1e8d5');}ctx.globalAlpha=1;}
        if(surfaced||tail)ripple(q.x,q.y+bodyLength*.3,bodyWidth*.8+(e.age%3),.38*fade);
      }
    }
  }
  ctx.globalAlpha=1;
}
