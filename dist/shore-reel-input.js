// One deliberate click requests one bounded crank stroke. Cadence controls
// average winding directly; excess taps cannot queue unattended retrieval.
// These are authored tackle/gesture dimensions, not a commercial reel spec.
export const SHORE_CRANK_TURN_METRES=.7;
export const SHORE_CRANK_STROKE_SECONDS=.4;
export const SHORE_MAX_CRANK_RATE=1/SHORE_CRANK_STROKE_SECONDS;
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createShoreReelInput(){return{turnsRemaining:0};}
export function tapShoreReelInput(previous={}, {enabled=true}={}){
 if(!enabled)return createShoreReelInput();
 // Includes the unfinished part of the active stroke: even frantic clicking
 // leaves at most 0.4 seconds of motion after the last deliberate tap.
 return{turnsRemaining:Math.min(1,clamp(finite(previous.turnsRemaining),0,1)+1)};
}
export function stepShoreReelInput(previous={},dt=0,{enabled=true}={}){
 const seconds=Math.max(0,finite(dt)),remaining=enabled?clamp(finite(previous.turnsRemaining),0,1):0;
 const handleTurns=Math.min(remaining,seconds*SHORE_MAX_CRANK_RATE);
 const nextRemaining=Math.max(0,remaining-handleTurns);
 const crankRate=seconds>0?handleTurns/seconds:0;
 return{state:{turnsRemaining:nextRemaining<1e-10?0:nextRemaining},input:{reel:crankRate>0,crankRate},handleTurns};
}
