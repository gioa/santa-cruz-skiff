import {BENICIA_SCENE} from './benicia-data.js';
import {SHORE_MOVEMENT as M,shoreStandPosition} from './shore-movement.js';
import {shoreWorldMetres as m} from './shore-scale.js';
// Fictional regulars, never names/likenesses of real residents. Stable outfits.
export const BENICIA_ANGLERS=Object.freeze([
 {name:'Ray',style:'benicia_denim',line:'别一味往最远抛。鱼有时候贴着岸走，试试沿岸斜着搜一遍。'},
 {name:'Marta',style:'benicia_violet',line:'亮片停收就下沉。石头边不要一直等，慢慢收，让它游起来。'},
 {name:'Jun',style:'benicia_orange',line:'顺流和逆流，同样的收线速度，亮片动作不一样。竿尖能感觉出来。'},
 {name:'Luis',style:'benicia_red',line:'我刚才那一竿是在离岸不远咬的。它们是一阵一阵过来，没口的时候也得等。'},
 {name:'Evelyn',style:'benicia_teal',line:'旁边的人准备抛竿，就留一点空当。找个空位比把线交在一起好。'},
 {name:'Sam',style:'benicia_cream',line:'我会换亮片再试，不把剥下来的饵留在岸边。祝你今天碰上一条。'},
]);
const names=['Ray','Marta','Jun','Luis','Evelyn','Sam','Dale','Nina','Theo','Isa','Leon','Mai','Rosa','Ken','Ari','Jo','Pat','Vera','Max','Eli','Nora','Jae','Ruth','Tao','Alex','Lee','Ren','Sol'];
const hash=n=>{let h=Math.imul(n|0,0x45d9f3b);h^=h>>>16;return(h>>>0)/4294967296;};
export function beniciaCrowd(elapsed=0,seed=1,month=9){
 const busy=month>=8&&month<=10,block=Math.floor(elapsed/140),out=[],walkDistance=m(12),walkSeconds=walkDistance/M.walkSpeed;
 for(let i=0;i<28;i++){
  // Always retain several gaps and a clear walkway behind the casting line.
  if(i%7===3)continue;
  const present=b=>hash(i*37+seed+b*701)<(busy?.84:.37),current=present(block),previous=present(Math.max(0,block-1)),arrival=elapsed%140;
  if(!current&&(!previous||arrival>=walkSeconds))continue;
  const x=160+i*72;if(Math.abs(x-1090)<70)continue;
  const a=BENICIA_ANGLERS[i%BENICIA_ANGLERS.length],cycle=(elapsed+hash(i+seed)*90)%(55+hash(i+78)*35),baseY=shoreStandPosition(BENICIA_SCENE,x).y,transition=current!==previous&&arrival<walkSeconds, y=baseY+(transition?(current?1-arrival/walkSeconds:arrival/walkSeconds)*walkDistance:0);
  const mode=cycle<2?'casting':cycle<35?'retrieving':cycle<42?'rigging':'watching';
  out.push({...a,name:names[i],id:i,x,y,mode:transition?'walking':mode,walking:transition,phase:cycle,offset:hash(i+88),talked:false});
 }
 return out;
}
export function crowdCastConflict(state,target){
 if(state.onPier)return null;
 const p=state.player,dx=target.x-p.x,dy=target.y-p.y;
 for(const n of state.crowd||[]){
  if(Math.hypot(n.x-p.x,n.y-p.y)<m(1.2))return n;
  // Protect the neighbour's casting corridor; do not block empty water.
  if(n.mode==='casting'||n.mode==='retrieving'){
   const corridorY=n.y-m(2),den=dx*dx+dy*dy,t=den?((n.x-p.x)*dx+(corridorY-p.y)*dy)/den:0;
   if(t>0&&t<.6&&Math.hypot(p.x+dx*t-n.x,p.y+dy*t-corridorY)<m(.8))return n;
  }
 }
 return null;
}
