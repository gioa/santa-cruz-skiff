import test from 'node:test';
import assert from 'node:assert/strict';
import {helmShiftAvailability} from '../dist/pixel-helm-availability.js';
const vessel=()=>({mode:'boat',engine:true,standing:false,moored:false,docking:null,paused:false,fishState:'idle',canOperateHelm:true,speed:0,throttle:0});
const neutral={gear:'N',throttle:0,steer:.4,manual:true};

test('available gears exactly follow neutral, idle-throttle and slow-speed interlocks',()=>{
  for(const speed of[-.79,0,.79]){const a=helmShiftAvailability({...vessel(),speed},neutral);assert.equal(a.gears.F.visible,true);assert.equal(a.gears.R.visible,true);assert.equal(a.gears.N.enabled,true);}
  for(const speed of[-.8,.8,2,NaN,undefined]){const a=helmShiftAvailability({...vessel(),speed},neutral);assert.equal(a.gears.F.visible,false);assert.equal(a.gears.R.visible,false);assert.equal(a.gears.N.enabled,true);}
  for(const throttle of[.081,.5,1]){const a=helmShiftAvailability(vessel(),{...neutral,throttle});assert.equal(a.gears.F.visible,false);assert.equal(a.gears.R.visible,false);assert.equal(a.gears.N.visible,true);}
  assert.equal(helmShiftAvailability(vessel(),{...neutral,throttle:.08}).gears.F.visible,true);
  assert.equal(helmShiftAvailability({...vessel(),throttle:.3},neutral).gears.F.visible,false,'assisted propulsion must idle before a manual engagement');
});
test('the engaged gear remains a status but the opposite direction disappears until neutral',()=>{
  for(const gear of['F','R']){const a=helmShiftAvailability({...vessel(),speed:2},{...neutral,gear,throttle:.6});assert.equal(a.gears[gear].visible,true);assert.equal(a.gears[gear].current,true);assert.equal(a.gears[gear==='F'?'R':'F'].visible,false);assert.equal(a.gears.N.enabled,true);}
});
test('every deployed rig hides reverse and flags an old reverse setting for neutralisation',()=>{
  for(const fishState of['flight','sinking','waiting','bite','fight']){
    const state={...vessel(),fishState,rodMount:'port'},a=helmShiftAvailability(state,neutral),oldReverse=helmShiftAvailability(state,{...neutral,gear:'R'});assert.equal(a.gears.R.visible,false);assert.equal(a.gears.F.visible,true);assert.equal(a.gears.N.enabled,true);assert.equal(oldReverse.neutralizeReverse,true);assert.equal(oldReverse.gears.R.visible,false);
  }
});
test('availability reads snapshots without mutation and cannot enable a paused helm',()=>{
  const state=Object.freeze({...vessel(),paused:true}),control=Object.freeze({...neutral}),a=helmShiftAvailability(state,control);assert.equal(a.active,false);assert.equal(a.gears.F.visible,false);assert.equal(a.gears.N.visible,true);assert.equal(a.gears.N.enabled,false);assert.deepEqual(control,neutral);
});
