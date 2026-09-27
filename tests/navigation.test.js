import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));const g=await import('../dist/geography.js'),n=await import('../dist/navigation.js'),h=await import('../dist/harbor-layout.js');
const home={x:h.HARBOR.boatX,z:h.HARBOR.boatZ};
test('all four geographic destinations and return routes avoid coast and wharf',()=>{for(const spot of g.FISHING_SPOTS)for(const [start,end]of[[home,spot],[spot,home]]){const route=n.waterRoute(start,end);assert.ok(route,spot.name);let prev=start;for(const p of route){assert.ok(n.clearWaterSegment(prev,p));const d=Math.hypot(p.x-prev.x,p.z-prev.z),steps=Math.ceil(d/.8);for(let i=0;i<=steps;i++){const f=i/steps,x=prev.x+(p.x-prev.x)*f,z=prev.z+(p.z-prev.z)*f;assert.equal(g.onPier(x,z)||g.onLand(x,z),false);}prev=p;}assert.ok(Math.hypot(prev.x-end.x,prev.z-end.z)<.001);}});
test('short segment across wharf cannot be accepted by same-cell rounding',()=>{const a={x:-.1687,z:-37.2499},b={x:17.8295,z:-56.2579};assert.equal(n.clearWaterSegment(a,b),false);const route=n.waterRoute(a,b);let prev=a;for(const p of route||[]){assert.ok(n.clearWaterSegment(prev,p));prev=p;}});
test('rental platform blocks boat routes while the new left-side berth remains usable',()=>{
 assert.equal(n.clearWaterSegment({x:-36,z:-55},{x:-28,z:-55}),false);
 assert.equal(n.clearWaterSegment(home,{x:home.x,z:home.z-15}),true);
 for(const spot of g.FISHING_SPOTS){
  const target={x:h.HARBOR.returnX,z:h.HARBOR.returnZ},route=n.waterRoute(spot,target);assert.ok(route,spot.name);
  let prev=spot;for(const p of route){assert.ok(n.clearWaterSegment(prev,p));const steps=Math.max(1,Math.ceil(Math.hypot(p.x-prev.x,p.z-prev.z)/.3));for(let i=0;i<=steps;i++){const f=i/steps;assert.equal(h.harborWaterBlocked(prev.x+(p.x-prev.x)*f,prev.z+(p.z-prev.z)*f),false);}prev=p;}
 }
});

test('a rejected turn restores the entire hull pose without resetting the running engine',()=>{
 const before={x:-32.2,z:-78.1,heading:0},v={...before,heading:Math.PI/2,vx:0,vz:0,yawRate:1,rpm:.7,tiller:1,thrustN:500};
 assert.equal(n.hullPenetration(before),0);assert.ok(n.hullPenetration(v)>0);
 const contact=n.resolveVesselContact(v,before);assert.equal(contact.collided,true);assert.equal(v.heading,before.heading);assert.equal(n.hullPenetration(v),0);
 assert.equal(v.rpm,.7);assert.equal(v.tiller,1);assert.equal(v.thrustN,500);
});

test('overlapping wharf save backs out under power then reaches the fishing route in observed wind',async()=>{
 const p=await import('../dist/vessel-physics.js');
 for(const wind of[{},p.vesselWind(15.55072,330)]){
  const v=p.createVesselState({x:-32,z:-78.1,heading:-.069}),route=n.waterRoute(v,g.FISHING_SPOTS[0]);let maxStep=0,backed=false,arrived=false;
  assert.ok(n.hullPenetration(v)>0);
  for(let i=0;i<60*450;i++){
   const before={x:v.x,z:v.z,heading:v.heading},control=n.contactAwareControl(v,p.vesselAutopilot(v,route[0],{final:route.length===1}));
   backed ||=control.throttle<0;p.stepVessel(v,{dt:1/60,time:i/60,engine:true,...control,...wind});n.resolveVesselContact(v,before);
   maxStep=Math.max(maxStep,Math.hypot(v.x-before.x,v.z-before.z));
   if(control.arrived){route.shift();if(!route.length){arrived=true;break;}}
  }
  assert.equal(backed,true);assert.equal(arrived,true,`stuck at ${v.x}, ${v.z}`);assert.equal(n.hullPenetration(v),0);assert.ok(maxStep<.06,`unphysical position step ${maxStep}`);
 }
});

test('a hull stopped just outside the pier detects a sustained impact and backs out at any frame rate',async()=>{
 const p=await import('../dist/vessel-physics.js');
 // A valid pose just outside the starboard contact boundary: boolean overlap
 // cannot detect its blocked next step until the force integrator advances it.
 const start={x:-32.0278417,z:-78.1,heading:-.074},target={x:-62,z:-78.1};
 assert.equal(n.hullPenetration(start),0);
 for(const dt of[1/30,1/120]){
  const v=p.createVesselState(start);let firstReverse=null,arrived=false,maxStep=0;
  for(let i=0;i<Math.ceil(60/dt);i++){
   const before={x:v.x,z:v.z,heading:v.heading},control=n.contactAwareControl(v,p.vesselAutopilot(v,target,{final:true}));
   if(control.throttle<0)firstReverse??=i*dt;
   p.stepVessel(v,{dt,time:i*dt,engine:true,...control,...p.vesselWind(15.55072,330)});
   // The browser resolves only actual blocked candidates, not every free step.
   if(n.hullPenetration(v)>0)n.resolveVesselContact(v,before,{dt});
   maxStep=Math.max(maxStep,Math.hypot(v.x-before.x,v.z-before.z));
   if(control.arrived){arrived=true;break;}
  }
  assert.ok(firstReverse>=1.15&&firstReverse<1.4,`reverse started ${firstReverse}s at ${1/dt}fps`);
  assert.equal(arrived,true);assert.equal(n.hullPenetration(v),0);assert.ok(maxStep<4*dt);
 }
});
