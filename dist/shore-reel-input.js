// Press raises the rod; a sustained hold then winds. Release lowers the rod
// and stops winding. Finite stroke helpers remain for deterministic fixtures.
// These are authored tackle/gesture dimensions, not a commercial reel spec.
export const SHORE_CRANK_TURN_METRES=.7;
export const SHORE_CRANK_STROKE_SECONDS=.4;
export const SHORE_MAX_CRANK_RATE=1/SHORE_CRANK_STROKE_SECONDS;
export const SHORE_REEL_HOLD_DELAY_SECONDS=.22;
export const SHORE_ROD_REST_LIFT=.2;
export const SHORE_ROD_HELD_LIFT=.7;
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createShoreReelHold(){return{sources:[],heldSeconds:0,raisePending:0};}
export function setShoreReelHeld(previous={},source,held,{enabled=true}={}){
 if(!enabled)return createShoreReelHold();
 const sources=new Set(previous.sources||[]);
 if(held)sources.add(source);else sources.delete(source);
 const newPress=held&&!previous.sources?.length;
 return{sources:[...sources],heldSeconds:sources.size&&previous.sources?.length?Math.max(0,finite(previous.heldSeconds)):0,
  raisePending:newPress?SHORE_ROD_HELD_LIFT-SHORE_ROD_REST_LIFT:Math.max(0,finite(previous.raisePending))};
}
export function stepShoreReelHold(previous={},dt=0,{enabled=true}={}){
 const sources=enabled?[...new Set(previous.sources||[])]:[],held=sources.length>0;
 const seconds=Math.max(0,finite(dt)),before=held?Math.max(0,finite(previous.heldSeconds)):0;
 // Only the part of a frame after the threshold winds, keeping pickup equal
 // across frame rates. Releasing clears the timer instead of queuing a turn.
 const windingSeconds=held?Math.max(0,seconds-Math.max(0,SHORE_REEL_HOLD_DELAY_SECONDS-before)):0;
 const crankRate=seconds>0?SHORE_MAX_CRANK_RATE*windingSeconds/seconds:0;
 const pending=enabled?Math.max(0,finite(previous.raisePending)):0;
 const state={sources,heldSeconds:held?Math.min(SHORE_REEL_HOLD_DELAY_SECONDS,before+seconds):0,raisePending:seconds>0?0:pending};
 const input={reel:crankRate>0,crankRate,rodLift:held?SHORE_ROD_HELD_LIFT:SHORE_ROD_REST_LIFT};
 // A completed press shorter than a render frame still moved the rod. Apply
 // that one stroke physically, with the visible rod already lowered.
 if(!held&&seconds>0&&pending>0)input.rodRaise=pending;
 return{state,input,handleTurns:windingSeconds*SHORE_MAX_CRANK_RATE};
}

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
