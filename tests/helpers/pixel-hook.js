import assert from 'node:assert/strict';

/** Request a wind/lift, then allow actual line pressure to seat the hook. */
export function seatHook(sim,{request=true,onStep}={}){
 if(request)assert.equal(sim.hook().ok,true);
 for(let elapsed=0;elapsed<10&&sim.state.fishState==='bite';elapsed+=.05){
  const before={paidLineMeters:sim.state.paidLineMeters,bobber:{...sim.state.bobber}};
  sim.step(.05,{reel:1.2});onStep?.(before,.05);
 }
 assert.equal(sim.state.fishState,'fight','the requested wind/lift must seat through real line pressure');
 return sim.state.fish;
}
