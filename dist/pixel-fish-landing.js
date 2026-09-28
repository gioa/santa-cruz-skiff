// A secured boat-side fish is lifted clear of the gunwale, then brought inside.
// This is handling animation after capture, not extra exhaustion or reeling.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
export function beginFishLanding(s){
 const p=s.bobber||{x:s.boatX,z:s.boatZ,height:0};
 return{elapsed:0,duration:s.fish?.kg>=2.5?3.2:2.6,fromX:p.x-s.boatX,fromZ:p.z-s.boatZ,fromHeight:p.height||0,startElevation:s.rodElevation||45,phase:'lift'};
}
export function stepFishLanding(s,dt){
 const a=s.fishLanding,elapsed=Math.min(a.duration,a.elapsed+Math.max(0,Math.min(.25,dt))),p=elapsed/a.duration;
 const lift=clamp(p/.4,0,1),aboard=clamp((p-.4)/.4,0,1),ease=aboard*aboard*(3-2*aboard);
 const bobber={x:s.boatX+a.fromX*(1-ease),z:s.boatZ+a.fromZ*(1-ease),height:mix(mix(a.fromHeight,1.15,lift),.3,ease)};
 return{fishLanding:{...a,elapsed,phase:p<.4?'lift':p<.8?'aboard':p<1?'settle':'complete'},bobber,lureDepth:Math.max(0,-bobber.height),lineEntry:{x:bobber.x,z:bobber.z,height:0},rodElevation:mix(a.startElevation,82,lift),fightPumpPhase:'idle',rodTargetElevation:null,rodTargetAzimuth:null,crankRate:0,payoutRate:0,retrieveRate:0,reeling:false,pumping:false,fishState:p>=1?'landed':'fight'};
}
