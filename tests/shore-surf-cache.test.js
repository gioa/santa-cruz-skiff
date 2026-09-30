import test from 'node:test';
import assert from 'node:assert/strict';

// Separate module instances model cold caches without exposing a production
// cache reset. Query order must never choose the water that a player receives.
const forward=await import('../dist/shore-surf.js?cache-forward');
const reverse=await import('../dist/shore-surf.js?cache-reverse');
const snapshot=(api,options)=>{
 const c=api.surfColumn(options),wave=c.wave(123);
 const read=w=>({height:[...w.H],state:[...w.state],type:[...w.type],roller:[...w.roller],made:[...w.made],outer:w.outer});
 return{depth:[...c.depths],groupSpeed:[...c.depths.cg],wet:c.depths.wet,toe:c.depths.toe,significant:read(c.sig),wave:read(wave),foam:[...c.meanMade()]};
};
const base={sceneId:'pacifica',shape:forward.beachShape('pacifica',0),tide:.801,period:12.041,hs:1.31,omega:Math.PI/6,phaseAt:d=>d*.1,alongshore:340};

test('nearby surf queries give the same depths, waves and foam regardless of cache warmup order',()=>{
 const a={...base,shape:{...base.shape,barDistance:60.011,troughDistance:30.0055},gap:.0011};
 const b={...base,shape:{...base.shape,barDistance:60.049,troughDistance:30.0245},gap:.0049};
 const aFirst=snapshot(forward,a),bSecond=snapshot(forward,b);
 const bFirst=snapshot(reverse,b),aSecond=snapshot(reverse,a);
 assert.deepEqual(aFirst,aSecond);assert.deepEqual(bFirst,bSecond);
});

test('surf cache distinguishes every bed-profile parameter, even at the same bar position',()=>{
 const a={...base,gap:.25},b={...a,shape:{...a.shape,datum:.7,faceSlope:.07,barAmp:1.1,troughAmp:.7}};
 const aFirst=snapshot(forward,a),bSecond=snapshot(forward,b);
 const bFirst=snapshot(reverse,b),aSecond=snapshot(reverse,a);
 assert.notDeepEqual(aFirst.depth,bFirst.depth,'these are different physical seabeds');
 assert.deepEqual(aFirst,aSecond);assert.deepEqual(bFirst,bSecond);
});
