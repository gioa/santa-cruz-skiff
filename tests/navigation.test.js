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
