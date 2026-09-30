// Independent, saved random stream: conversations never change fishing or patrol rolls.
import {BENICIA_ANGLERS} from './benicia-crowd.js';
import {shoreZone} from './shore-data.js';
import {REGULAR,regularNotes} from './shore-regular.js';
import {shoreDayHash,shoreDayUnit} from './shore-day.js';
export const ANGLERS=Object.freeze([
 {name:'戴旧渔帽的老钓友',style:'oldhat',coat:'#687b62',hat:'#c5b18a'},
 {name:'背帆布包的老钓友',style:'canvasbag',coat:'#586e84',hat:'#9e7960'},
 {name:'穿防水衣的老钓友',style:'raincoat',coat:'#a58a48',hat:'#596f67'},
 // The Sharp Park regular (shore-regular.js); he is never a random encounter.
 {name:REGULAR.name,style:'regular',coat:REGULAR.coat,hat:REGULAR.hat},
]);
const RANDOM_ANGLERS=3;
const PUBLIC_SLOT_SECONDS=240,PUBLIC_VIEW_DISTANCE=420;
const pick=(a,r)=>a[Math.min(a.length-1,Math.floor(r()*a.length))];
function random(lore){let x=lore.rngState>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;lore.rngState=x>>>0;return lore.rngState/4294967296;}
export function shoreClues(scene){if(scene.id==='benicia')return scene.zones.flatMap(z=>BENICIA_ANGLERS.map((a,i)=>({id:`${z.id}:local:${i}`,zoneId:z.id,topic:'local',title:`${a.name} 的经验`,text:a.line,sourceName:a.name})));return scene.zones.flatMap(z=>[
 {id:z.id+':terrain',zoneId:z.id,topic:'terrain',title:'地形印象',text:`${z.name}那边，${z.description}你可以自己去看看浪线。`},
 {id:z.id+':bait',zoneId:z.id,topic:'bait',title:'用饵经验',text:`在${z.name}附近，我通常${['north','dunes','venice','trough'].includes(z.id)?'先用沙蟹配较小的钩找浪脚里的海鲫，短抛也值得试':'用鳀鱼块试条纹鲈，先找能让饵停留的水；比目鱼还得碰上合适的深浅和呈现'}。没有万能饵，等一阵没有口也正常。`},
 {id:z.id+':drift',zoneId:z.id,topic:'drift',title:'看水经验',text:`到${z.name}先看几组浪和泡沫去向；白浪断开的地方，饵可能被带向外侧。钓组不停滚动就检查铅重和落点；重铅能帮助稳底，也未必更容易中鱼。`},
]);}
export function createShoreLore(scene,saved,elapsed=0,seed){
 const fallback=()=>{const bytes=new Uint32Array(1);globalThis.crypto?.getRandomValues?.(bytes);return bytes[0]||((Date.now()^0x9e3779b9)>>>0);};
 const valid=saved?.version===1,lore={version:1,rngState:(valid?saved.rngState:seed)>>>0||(valid||seed!==undefined?1:fallback()),nextAt:0,serial:0,notes:[],encounter:null};
 const catalog=[...shoreClues(scene),...regularNotes(scene)];
 if(valid){
  lore.serial=Math.max(0,Math.floor(Number(saved.serial)||0));
  const seen=new Set();for(const note of Array.isArray(saved.notes)?saved.notes:[]){const clue=catalog.find(c=>c.id===note.id);if(!clue||seen.has(clue.id))continue;seen.add(clue.id);lore.notes.push({...clue,angler:clue.topic==='regular'?ANGLERS.length-1:Math.max(0,Math.min(RANDOM_ANGLERS-1,Math.floor(Number(note.angler)||0))),learnedAt:Math.max(0,Number(note.learnedAt)||0),...(scene.id==='benicia'&&typeof note.sourceName==='string'?{sourceName:note.sourceName.slice(0,60),title:`${note.sourceName.slice(0,60)} 的经验`}:{})});}
  const e=saved.encounter;
  if(e&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&e.x>=20&&e.x<=scene.width-20&&e.y>=scene.shoreY(e.x)+20&&e.y<=scene.world.height-25&&Number.isFinite(e.expiresAt)&&e.expiresAt>elapsed){
   lore.encounter={id:Math.max(1,Math.floor(Number(e.id)||1)),x:e.x,y:e.y,expiresAt:e.expiresAt,angler:Math.max(0,Math.min(2,Math.floor(Number(e.angler)||0))),clueId:catalog.some(c=>c.id===e.clueId)?e.clueId:null,talked:e.talked===true};
   if(typeof e.publicKey==='string'&&e.publicKey.length<160&&Number.isFinite(e.publicDeparture))Object.assign(lore.encounter,{publicKey:e.publicKey,publicDeparture:e.publicDeparture});
  }
  if(Array.isArray(saved.publicTalked))lore.publicTalked=[...new Set(saved.publicTalked.filter(key=>typeof key==='string'&&key.length<160))].slice(-256);
 }
 lore.nextAt=valid&&Number.isFinite(saved.nextAt)?Math.max(elapsed,saved.nextAt):elapsed+35+random(lore)*60;
 return lore;
}
// A public visitor has a fixed place for the whole civil-time slot. Neither
// the player's walk, saved random stream nor personal discoveries choose it.
export function shoreDailyVisitors(scene,world){
 if(scene.id==='benicia'||world?.sceneId!==scene.id||typeof world.date!=='string'||!Number.isFinite(world.timeSeconds))return[];
 const now=world.timeSeconds;if(now<0||now>=86400)return[];
 const slot=Math.floor(now/PUBLIC_SLOT_SECONDS),clues=shoreClues(scene),visitors=[];
 for(let i=0;i<scene.zones.length;i++){
  const zone=scene.zones[i],key=[scene.id,world.date,'visitor',zone.id,slot],unit=label=>shoreDayUnit(...key,label);
  if(unit('present')>=.76)continue;
  const arrival=slot*PUBLIC_SLOT_SECONDS+Math.floor(unit('arrival')*20),departure=arrival+180+Math.floor(unit('duration')*40);
  if(now<arrival||now>=departure)continue;
  const left=i?Math.max(60,(scene.zones[i-1].x+zone.x)/2):60,right=i+1<scene.zones.length?Math.min(scene.width-60,(zone.x+scene.zones[i+1].x)/2):scene.width-60;
  let point=null;
  for(let attempt=0;attempt<4;attempt++){
   const x=left+(right-left)*unit('x:'+attempt),y=scene.shoreY(x)+60+unit('y:'+attempt)*35,shop=scene.shop;
   if(y>scene.world.height-25||scene.pier&&Math.abs(x-scene.pier.x)<70)continue;
   if(shop&&x>=shop.x-18&&x<=shop.x+shop.width+18&&y>=shop.y-18&&y<=shop.y+shop.height+18)continue;
   point={x,y};break;
  }
  if(!point)continue;
  const local=clues.filter(c=>c.zoneId===zone.id),clue=local[Math.floor(unit('clue')*local.length)];
  visitors.push({id:shoreDayHash(...key)+1,publicKey:key.join(':'),publicDeparture:departure,...point,angler:Math.floor(unit('angler')*RANDOM_ANGLERS),clueId:unit('willing')<.72?clue?.id||null:null});
 }
 return visitors;
}
function stepDailyLore(sim){
 const s=sim.state,l=s.shoreLore,world=sim.sharedWorld;
 const candidates=shoreDailyVisitors(sim.scene,world).map(e=>({e,distance:Math.hypot(e.x-s.player.x,e.y-s.player.y)}));
 candidates.sort((a,b)=>a.distance-b.distance||a.e.id-b.e.id);
 const next=candidates[0]?.distance<=PUBLIC_VIEW_DISTANCE?candidates[0].e:null;
 if(!next){l.encounter=null;return;}
 const talked=l.encounter?.publicKey===next.publicKey&&l.encounter.talked||l.publicTalked?.includes(next.publicKey)||false;
 l.encounter={...next,expiresAt:s.elapsed+next.publicDeparture-world.timeSeconds,talked};
}
export function stepShoreLore(sim){
 if(sim.scene.id==='benicia')return; // This waterfront's regulars are the actual crowd.
 if(sim.sharedWorld){stepDailyLore(sim);return;}
 const s=sim.state,l=s.shoreLore,r=()=>random(l);
 if(l.encounter&&s.elapsed>=l.encounter.expiresAt)l.encounter=null;
 if(l.encounter||s.elapsed<l.nextAt)return;
 l.nextAt=s.elapsed+80+r()*130;
 if(s.onPier||s.inspection||r()>.7)return;
 const x=Math.max(60,Math.min(sim.scene.width-60,s.player.x+(r()<.5?-1:1)*(100+r()*180))),y=sim.world.shoreY(x)+60+r()*35;
 if(!sim.onSand(x,y)||sim.scene.pier&&Math.abs(x-sim.scene.pier.x)<70)return;
 const zone=shoreZone(sim.scene,x),clues=shoreClues(sim.scene).filter(c=>c.zoneId===zone.id);
 l.encounter={id:++l.serial,x,y,angler:Math.floor(r()*RANDOM_ANGLERS),expiresAt:s.elapsed+100+r()*100,clueId:r()<.72?pick(clues,r).id:null,talked:false};
}
export function talkShoreAngler(sim,id){
 const s=sim.state,l=s.shoreLore;
 // Refresh against civil time before a click, including one after a paused
 // tab resumes. An expired public visitor cannot grant a stale conversation.
 if(sim.sharedWorld){sim.syncSharedWorld?.();stepDailyLore(sim);}
 const e=l.encounter;
 if(!e||e.id!==id||e.expiresAt<=s.elapsed)return{ok:false,message:'那位钓友已经离开了。'};
 if(s.phase!=='walk'||s.onPier||s.inspection||Math.hypot(e.x-s.player.x,e.y-s.player.y)>65)return{ok:false,message:'先走近一点，收好钓竿再打招呼。'};
 const clue=shoreClues(sim.scene).find(c=>c.id===e.clueId),known=clue&&l.notes.some(n=>n.id===clue.id),fresh=Boolean(clue&&!known&&!e.talked);
 if(fresh)l.notes.push({...clue,angler:e.angler,learnedAt:s.elapsed});e.talked=true;
 if(e.publicKey){l.publicTalked||=[];if(!l.publicTalked.includes(e.publicKey))l.publicTalked.push(e.publicKey);l.publicTalked=l.publicTalked.slice(-256);}
 return{ok:true,name:ANGLERS[e.angler].name,text:clue?clue.text:'今天就想安静钓一会儿。听听浪声也挺好，祝你好运。',fresh,known:Boolean(known),clueId:clue?.id||null};
}
export function knownShoreZones(scene,lore){return scene.zones.filter(z=>lore?.notes?.some(n=>n.zoneId===z.id));}
