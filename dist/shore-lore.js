// Independent, saved random stream: conversations never change fishing or patrol rolls.
import {shoreZone} from './shore-data.js';
import {REGULAR,regularNotes} from './shore-regular.js';
export const ANGLERS=Object.freeze([
 {name:'戴旧渔帽的老钓友',style:'oldhat',coat:'#687b62',hat:'#c5b18a'},
 {name:'背帆布包的老钓友',style:'canvasbag',coat:'#586e84',hat:'#9e7960'},
 {name:'穿防水衣的老钓友',style:'raincoat',coat:'#a58a48',hat:'#596f67'},
 // The Sharp Park regular (shore-regular.js); he is never a random encounter.
 {name:REGULAR.name,style:'regular',coat:REGULAR.coat,hat:REGULAR.hat},
]);
const RANDOM_ANGLERS=3;
const pick=(a,r)=>a[Math.min(a.length-1,Math.floor(r()*a.length))];
function random(lore){let x=lore.rngState>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;lore.rngState=x>>>0;return lore.rngState/4294967296;}
export function shoreClues(scene){return scene.zones.flatMap(z=>[
 {id:z.id+':terrain',zoneId:z.id,topic:'terrain',title:'地形印象',text:`${z.name}那边，${z.description}你可以自己去看看浪线。`},
 {id:z.id+':bait',zoneId:z.id,topic:'bait',title:'用饵经验',text:`在${z.name}附近，我通常${['north','dunes','venice','trough'].includes(z.id)?'先用沙蟹配较小的钩找浪脚里的海鲫，短抛也值得试':'用鳀鱼块试条纹鲈，先找能让饵停留的水；比目鱼还得碰上合适的深浅和呈现'}。没有万能饵，等一阵没有口也正常。`},
 {id:z.id+':drift',zoneId:z.id,topic:'drift',title:'看水经验',text:`到${z.name}先看几组浪和泡沫去向；白浪断开的地方，饵可能被带向外侧。钓组不停滚动就检查铅重和落点；重铅能帮助稳底，也未必更容易中鱼。`},
]);}
export function createShoreLore(scene,saved,elapsed=0,seed){
 const fallback=()=>{const bytes=new Uint32Array(1);globalThis.crypto?.getRandomValues?.(bytes);return bytes[0]||((Date.now()^0x9e3779b9)>>>0);};
 const valid=saved?.version===1,lore={version:1,rngState:(valid?saved.rngState:seed)>>>0||fallback(),nextAt:0,serial:0,notes:[],encounter:null};
 const catalog=[...shoreClues(scene),...regularNotes(scene)];
 if(valid){
  lore.serial=Math.max(0,Math.floor(Number(saved.serial)||0));
  const seen=new Set();for(const note of Array.isArray(saved.notes)?saved.notes:[]){const clue=catalog.find(c=>c.id===note.id);if(!clue||seen.has(clue.id))continue;seen.add(clue.id);lore.notes.push({...clue,angler:clue.topic==='regular'?ANGLERS.length-1:Math.max(0,Math.min(RANDOM_ANGLERS-1,Math.floor(Number(note.angler)||0))),learnedAt:Math.max(0,Number(note.learnedAt)||0)});}
  const e=saved.encounter;
  if(e&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&e.x>=20&&e.x<=scene.width-20&&e.y>=scene.shoreY(e.x)+20&&e.y<=scene.world.height-25&&Number.isFinite(e.expiresAt)&&e.expiresAt>elapsed){
   lore.encounter={id:Math.max(1,Math.floor(Number(e.id)||1)),x:e.x,y:e.y,expiresAt:e.expiresAt,angler:Math.max(0,Math.min(2,Math.floor(Number(e.angler)||0))),clueId:catalog.some(c=>c.id===e.clueId)?e.clueId:null,talked:e.talked===true};
  }
 }
 lore.nextAt=valid&&Number.isFinite(saved.nextAt)?Math.max(elapsed,saved.nextAt):elapsed+35+random(lore)*60;
 return lore;
}
export function stepShoreLore(sim){
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
 const s=sim.state,l=s.shoreLore,e=l.encounter;
 if(!e||e.id!==id||e.expiresAt<=s.elapsed)return{ok:false,message:'那位钓友已经离开了。'};
 if(s.phase!=='walk'||s.onPier||s.inspection||Math.hypot(e.x-s.player.x,e.y-s.player.y)>65)return{ok:false,message:'先走近一点，收好钓竿再打招呼。'};
 const clue=shoreClues(sim.scene).find(c=>c.id===e.clueId),known=clue&&l.notes.some(n=>n.id===clue.id),fresh=Boolean(clue&&!known&&!e.talked);
 if(fresh)l.notes.push({...clue,angler:e.angler,learnedAt:s.elapsed});e.talked=true;
 return{ok:true,name:ANGLERS[e.angler].name,text:clue?clue.text:'今天就想安静钓一会儿。听听浪声也挺好，祝你好运。',fresh,known:Boolean(known),clueId:clue?.id||null};
}
export function knownShoreZones(scene,lore){return scene.zones.filter(z=>lore?.notes?.some(n=>n.zoneId===z.id));}
