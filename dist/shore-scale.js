// One metric convention for the shore simulation, actors, tackle and props.
// World geography is retained; camera zoom supplies readable close views.
export const SHORE_WORLD_UNITS_PER_METRE=3.2;
export const SHORE_PERSON_HEIGHT_METRES=1.75;
export const shoreWorldMetres=metres=>metres*SHORE_WORLD_UNITS_PER_METRE;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const artHeights={benicia_violet:44,canvasbag:44,benicia_orange:43,raincoat:43,warden:43,benicia_red:42,regular:42,benicia_cream:42,staff:42};
export const shorePersonScale=(style='player')=>shoreWorldMetres(SHORE_PERSON_HEIGHT_METRES)/(artHeights[style]||41);
export const shoreRodLengthMetres=state=>state?.activeRod==='surf_rod'?3.05:2.13;
export const shoreDeckHeight=state=>state?.onPier?3.5:0;
export const shoreProjectPoint=point=>({x:point.x,y:point.y-shoreWorldMetres(finite(point.height))});
export const shorePersonFoot=state=>shoreProjectPoint({...state.player,height:shoreDeckHeight(state)});

// The fishing hand is the centre of the authored left-hand pixels. Its
// physical height therefore remains attached to every scaled player pose.
export function shoreRodGeometry(state={},options={}){
 const p=state.player||{x:0,y:0},controls=state.fishingControls||{},k=shorePersonScale(options.style||'player');
 const lift=clamp(finite(options.rodLift,finite(controls.rodLift,.35)),0,1),sweep=clamp(finite(options.rodSweep,finite(controls.rodSweep)),-1,1);
 const release=Boolean(options.release||state.phase==='casting'),charge=release?0:clamp(finite(state.castCharge),0,1);
 const aim=clamp(finite(options.aim,finite(state.cast?.aim,finite(state.castAim))),-1,1);
 const twitch=clamp(finite(state.presentation?.twitch),0,1);
 const elevation=(release?38:18+lift*57+twitch*9+charge*52)*Math.PI/180;
 const heading=(release||charge>0?aim:sweep)*Math.PI/3;
 const lengthM=shoreRodLengthMetres(state),tension=release?0:clamp(finite(state.tension),0,1);
 const bend=(tension*.24+charge*.1)*lengthM;
 const hand={x:finite(p.x)-12*k,y:finite(p.y),height:shoreDeckHeight(state)+28*k/SHORE_WORLD_UNITS_PER_METRE};
 const nodes=[hand],steps=24;
 // Integrate equal-length segments so bending changes the endpoint without
 // stretching the actual blank. Each segment is a physical piece of rod.
 for(let i=1;i<=steps;i++){
  const t=(i-.5)/steps,angle=elevation-tension*.58*t*t-charge*.2*t*t;
  const segment=lengthM/steps,forward=segment*Math.cos(angle),prior=nodes.at(-1);
  nodes.push({x:prior.x+shoreWorldMetres(Math.sin(heading)*forward),y:prior.y-shoreWorldMetres(Math.cos(heading)*forward),height:prior.height+segment*Math.sin(angle)});
 }
 const points=nodes.map(shoreProjectPoint);
 return{butt:points[0],tip:points.at(-1),points,nodes,hand,tipWorld:nodes.at(-1),lengthM,bend:shoreWorldMetres(bend),controls:{rodLift:lift,rodSweep:sweep},charge};
}
export const shoreRodTipHeight=state=>shoreRodGeometry(state).tipWorld.height;
export function shoreCastRelease(state={},options={}){
 const rod=shoreRodGeometry(state,{...options,release:true});
 return{...rod.tipWorld,screen:{...rod.tip}};
}
