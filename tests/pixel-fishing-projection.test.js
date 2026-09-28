import test from 'node:test';
import assert from 'node:assert/strict';
import {fishingScenePoint,fishingPhysicalPoint,FISHING_SCENE_SCALE} from '../dist/pixel-fishing-projection.js';
import {SKIFF_LENGTH_METERS,SKIFF_HULL_PIXELS,SKIFF_DISPLAY_METERS_PER_PIXEL} from '../dist/skiff-dimensions.js';
import {skiffScale} from '../dist/pixel-boat-geometry.js';

test('the pre-calibration boat size is preserved at every map zoom',()=>{
 for(const zoom of[2,3,4,6,9])assert.equal(skiffScale(zoom),zoom*.18);
 assert.equal(SKIFF_HULL_PIXELS*SKIFF_DISPLAY_METERS_PER_PIXEL,77*.18);
 assert.equal(SKIFF_LENGTH_METERS,4.572);
});
test('local fishing projection is an invertible boat-centred mapping without changing geographic coordinates',()=>{
 for(const boat of[{boatX:0,boatZ:0},{boatX:1300,boatZ:-320}])for(const dx of[-30,0,7])for(const dz of[-4,0,20]){
  const p={x:boat.boatX+dx,z:boat.boatZ+dz},copy=structuredClone({boat,p}),display=fishingScenePoint(boat,p),back=fishingPhysicalPoint(boat,display);
  assert.ok(Math.hypot(back.x-p.x,back.z-p.z)<1e-9);assert.ok(Math.abs(Math.hypot(display.x-boat.boatX,display.z-boat.boatZ)-Math.hypot(dx,dz)*FISHING_SCENE_SCALE)<1e-9);assert.deepEqual({boat,p},copy);
 }
});
