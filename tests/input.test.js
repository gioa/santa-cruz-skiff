import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPointer, stickVector, ActionSources} from '../dist/input.js';

class Surface extends EventTarget {
  captured = new Set();
  classList = {add(){},remove(){}};
  setPointerCapture(id){this.captured.add(id);}
  hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);this.send('lostpointercapture',id);}
  send(type,id=1,extra={}){const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:id,pointerType:'touch',button:0,clientX:0,clientY:0},extra);this.dispatchEvent(event);return event;}
}

test('one camera finger owns movement; a second contact cannot steal or release it',()=>{
  const surface=new Surface();let moves=0,ends=0;
  const input=bindPointer(surface,{move:()=>moves++,end:()=>ends++});
  surface.send('pointerdown',1);surface.send('pointerdown',2);surface.send('pointermove',2);surface.send('pointerup',2);
  assert.equal(input.owner,1);assert.equal(moves,0);assert.equal(ends,0);
  surface.send('pointermove',1);surface.send('pointerup',1);
  assert.equal(moves,1);assert.equal(ends,1);assert.equal(input.owner,null);
});

test('moving and looking are independent; lifting look leaves movement held',()=>{
  const movement=new Surface(),look=new Surface();let moving=false,looking=false;
  const move=bindPointer(movement,{start:()=>{moving=true;},end:()=>moving=false,cancel:()=>moving=false});
  const camera=bindPointer(look,{start:()=>{looking=true;},end:()=>looking=false,cancel:()=>looking=false});
  movement.send('pointerdown',1);look.send('pointerdown',2);look.send('pointerup',2);
  assert.equal(moving,true);assert.equal(looking,false);assert.equal(move.owner,1);
  move.reset();assert.equal(moving,false);assert.equal(camera.owner,null);
});

test('cast release outside the button finishes exactly once; leaving alone does not',()=>{
  const surface=new Surface();let casts=0,aborts=0;
  bindPointer(surface,{end:()=>casts++,cancel:()=>aborts++});
  surface.send('pointerdown');surface.send('pointerleave');assert.equal(casts,0);
  surface.send('pointerup',1,{clientX:900,clientY:-100});surface.send('pointerup');
  assert.equal(casts,1);assert.equal(aborts,0);
});

for(const reason of ['pointercancel','lostpointercapture','reset'])test(`${reason} aborts charging and leaves no captured input`,()=>{
  const surface=new Surface();let casts=0,aborts=0;
  const input=bindPointer(surface,{end:()=>casts++,cancel:()=>aborts++});
  surface.send('pointerdown');if(reason==='reset')input.reset();else surface.send(reason);
  surface.send('pointerup');input.reset();
  assert.equal(casts,0);assert.equal(aborts,1);assert.equal(input.owner,null);assert.equal(surface.captured.size,0);
});

test('disabled or rejected action never captures a pointer',()=>{
  const surface=new Surface();const input=bindPointer(surface,{start:()=>false});
  surface.send('pointerdown');assert.equal(input.owner,null);assert.equal(surface.captured.size,0);
});

test('secondary mouse button does not become a held action',()=>{
  const surface=new Surface();let starts=0;const input=bindPointer(surface,{start:()=>{starts++;}});
  surface.send('pointerdown',1,{pointerType:'mouse',button:2});assert.equal(starts,0);assert.equal(input.owner,null);
});

test('capture failure cancels the already started action',()=>{
  const surface=new Surface();surface.setPointerCapture=()=>{throw Error('lost contact');};let active=false;
  const input=bindPointer(surface,{start:()=>{active=true;},cancel:()=>active=false});surface.send('pointerdown');
  assert.equal(active,false);assert.equal(input.owner,null);
});

test('camera release cannot stop a held reel button or continuous reel latch',()=>{
  const active={};const sources=new ActionSources((action,value)=>active[action]=value);
  sources.set('reel','button',true);sources.set('reel','camera',true);sources.set('reel','camera',false);assert.equal(active.reel,true);
  sources.set('reel','toggle',true);sources.set('reel','button',false);assert.equal(active.reel,true);
  sources.set('reel','toggle',false);assert.equal(active.reel,false);
});

test('reset clears pump and reel across every source',()=>{
  const active={};const sources=new ActionSources((action,value)=>active[action]=value);
  sources.set('reel','button',true);sources.set('reel','toggle',true);sources.set('pump','keyboard',true);sources.clear();
  assert.deepEqual(active,{reel:false,pump:false});assert.equal(sources.has('reel','toggle'),false);
});

test('stick dead zone is stable, diagonal is bounded, and small motion stays analog',()=>{
  assert.deepEqual(stickVector(2,2,40),{x:0,y:0});
  const diagonal=stickVector(80,80,40);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-10);
  const slow=stickVector(0,-15,40);assert.ok(slow.y<0&&slow.y>-.5);assert.equal(slow.x,0);
  assert.deepEqual(stickVector(0,0,40),{x:0,y:0});
});
