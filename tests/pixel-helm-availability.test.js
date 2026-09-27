import test from 'node:test';
import assert from 'node:assert/strict';
import {helmShiftAvailability} from '../dist/pixel-helm-availability.js';
import {mountHelm} from '../dist/pixel-helm-ui.js';
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

class Element extends EventTarget{
  constructor(tagName='DIV',gear){super();this.tagName=tagName;this.dataset=gear?{gear}:{};this.attributes={};this.hidden=false;this.disabled=false;this.style={setProperty(){}};this.classList={add(){},remove(){}};this.captured=new Set();}
  setAttribute(k,v){this.attributes[k]=v;}
  getBoundingClientRect(){return{left:0,right:150,top:0,bottom:150,width:150,height:150};}
  setPointerCapture(id){this.captured.add(id);}hasPointerCapture(id){return this.captured.has(id);}releasePointerCapture(id){this.captured.delete(id);}
  key(key){const e=new Event('keydown',{cancelable:true});Object.assign(e,{key});this.dispatchEvent(e);}
}
function fixture(){const s=vessel(),handle=new Element(),grip=new Element(),arm=new Element(),meter=new Element(),gears=Object.fromEntries(['F','N','R'].map(g=>[g,new Element('BUTTON',g)])),selectors={'#tiller-touch':handle,'.tiller-arm':arm,'#throttle-touch':grip,'#throttle-value':meter},feedback=[];let idles=0;const root={querySelector:selector=>selectors[selector],querySelectorAll:()=>Object.values(gears)},helm=mountHelm(root,{getState:()=>s,onIdle:()=>{s.throttle=0;idles++;},onFeedback:r=>feedback.push(r)});helm.update();return{s,helm,handle,grip,gears,feedback,get idles(){return idles;}};}
test('stale reverse events cannot engage a newly deployed line between UI refreshes',()=>{
  const f=fixture();assert.equal(f.gears.R.hidden,false);Object.assign(f.s,{fishState:'waiting',rodMount:'starboard'});f.gears.R.onclick();assert.equal(f.helm.snapshot().gear,'N');assert.equal(f.gears.R.hidden,true);assert.deepEqual(f.helm.input(),{});assert.equal(f.gears.N.disabled,false);
});
test('deploying while reverse is retained idles before the next frame without centring the tiller',()=>{
  const f=fixture();f.gears.R.onclick();f.handle.key('ArrowRight');f.handle.key('ArrowRight');for(let i=0;i<8;i++)f.grip.key('ArrowUp');assert.equal(f.helm.snapshot().gear,'R');assert.ok(f.helm.input().throttle<0);const steer=f.helm.snapshot().steer;
  Object.assign(f.s,{fishState:'sinking',rodMount:'port'});const input=f.helm.input();assert.equal(input.throttle,0);assert.equal(input.steer,steer);assert.equal(f.helm.snapshot().gear,'N');assert.equal(f.idles,1);f.helm.update();assert.equal(f.gears.R.hidden,true);assert.equal(f.gears.N.attributes['aria-pressed'],'true');assert.equal(f.idles,1,'safe input does not repeatedly reset an already neutral motor');
});
test('unavailable opposing gears hide immediately and current retained settings survive updates',()=>{
  const f=fixture();f.gears.F.onclick();f.handle.key('ArrowLeft');for(let i=0;i<6;i++)f.grip.key('ArrowUp');const retained=f.helm.snapshot();f.s.speed=1.2;
  for(let i=0;i<20;i++){f.helm.update();assert.deepEqual(f.helm.snapshot(),retained);}assert.equal(f.gears.F.hidden,false);assert.equal(f.gears.R.hidden,true);assert.equal(f.gears.N.disabled,false);
  f.gears.N.onclick();assert.equal(f.helm.input().throttle,0);assert.equal(f.helm.snapshot().steer,retained.steer);assert.equal(f.gears.F.hidden,true);f.s.speed=.3;f.helm.update();assert.equal(f.gears.F.hidden,false);assert.equal(f.gears.R.hidden,false);
});
