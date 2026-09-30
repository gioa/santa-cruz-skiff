// Shared daily background opportunities. Civil seconds since midnight are
// physical seconds here; callers supply the date/time and environment. No
// wall clock, player RNG, cast counter, or query history enters this field.
export const SHORE_FIELD_VERSION=1;
export const SHORE_FIELD_TILE_METRES=64;
const TAU=Math.PI*2,SWIM_RADIUS=12;
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const candidates=new Map(),CACHE_LIMIT=4096;

export function shoreFieldRandom(...parts){
 let h=2166136261;
 for(const part of parts){const value=String(part);h=Math.imul(h^value.length,16777619);for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);}
 h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
 return((h>>>0)+.5)/4294967296;
}
export const shoreFieldKey=field=>`shore-field-${SHORE_FIELD_VERSION}|${field.sceneId}|${field.date}`;

function tileCandidates(field,def,tx,ty){
 const prefix=`${shoreFieldKey(field)}|${tx},${ty}|${def.id}`;
 const key=`${prefix}|${def.density}|${def.school}|${def.lengthCm}|${def.cruise}`;
 let rows=candidates.get(key);if(rows)return rows;
 const mean=Math.max(0,finite(def.density))*SHORE_FIELD_TILE_METRES**2/10000/Math.max(1,(def.school[0]+def.school[1])/2);
 // Inverse Poisson sampling consumes a private, stateless channel per tile.
 const u=shoreFieldRandom(prefix,'school-count');let n=0,p=Math.exp(-Math.min(mean,100)),sum=p;
 while(u>sum&&n<200){n++;p*=mean/n;sum+=p;}
 rows=Array.from({length:n},(_,i)=>{
  const fieldId=`${prefix}|${i}`,r=channel=>shoreFieldRandom(fieldId,channel);
  return Object.freeze({fieldId,id:fieldId,species:def.id,anchorX:(tx+r('x'))*SHORE_FIELD_TILE_METRES,anchorY:(ty+r('y'))*SHORE_FIELD_TILE_METRES,
   count:def.school[0]+Math.floor(r('count')*(def.school[1]-def.school[0]+1)),lengthCm:def.lengthCm[0]+(def.lengthCm[1]-def.lengthCm[0])*r('length')**1.6,
   habitat:r('habitat'),hungerFactor:.55+.45*r('hunger'),radius:4+8*r('radius'),phase:TAU*r('phase'),phaseY:TAU*r('phase-y')});
 });
 candidates.set(key,rows);if(candidates.size>CACHE_LIMIT)candidates.delete(candidates.keys().next().value);
 return rows;
}

/** Pure sample of canonical schools in world.center/world.radius. Existing
 * suitability/feeding/depth callbacks still determine habitat and appetite.
 * Movement is analytical bounded roaming; attraction/alarm are local overlays
 * implemented by fish-population, never changes to this shared background. */
export function sampleShoreFishField(world){
 const field=world.sharedField;if(!field||!Number.isFinite(field.timeSeconds))return[];
 const c=world.center,r=Math.max(0,finite(world.radius)),pad=r+SWIM_RADIUS,size=SHORE_FIELD_TILE_METRES,time=field.timeSeconds;
 const out=[];
 for(let tx=Math.floor((c.x-pad)/size);tx<=Math.floor((c.x+pad)/size);tx++)for(let ty=Math.floor((c.y-pad)/size);ty<=Math.floor((c.y+pad)/size);ty++)for(const def of world.species){
  for(const row of tileCandidates(field,def,tx,ty)){
   const omega=Math.max(0,finite(def.cruise))*.75/row.radius,a=omega*time+row.phase,b=omega*.7*time+row.phaseY;
   let x=row.anchorX+row.radius*Math.sin(a),y=row.anchorY+row.radius*.45*Math.sin(b);
   let env=world.env(x,y);
   if(!env||env.water===false||!(env.depth>.15)){x=row.anchorX;y=row.anchorY;env=world.env(x,y);}
   if(!env||env.water===false||!(env.depth>.15)||Math.hypot(x-c.x,y-c.y)>r)continue;
   const suitability=clamp(finite(world.suitability(def,x,y)),0,1);
   if(row.habitat>=suitability)continue;
   const vx=row.radius*omega*Math.cos(a),vy=row.radius*.45*omega*.7*Math.cos(b),bottom=Math.max(.2,env.depth);
   out.push({id:row.fieldId,fieldId:row.fieldId,species:def.id,x,y,depth:clamp(def.preferredDepth(bottom,world),.05,Math.max(.05,bottom-.05)),
    heading:Math.atan2(vy,vx),speed:Math.hypot(vx,vy),count:row.count,lengthCm:row.lengthCm,hunger:clamp(finite(world.feeding?.(def),.7)*row.hungerFactor,0,1)});
  }
 }
 return out.sort((a,b)=>a.fieldId<b.fieldId?-1:a.fieldId>b.fieldId?1:0);
}
