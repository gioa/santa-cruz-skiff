import test from 'node:test';
import assert from 'node:assert/strict';
import {bindFocusRod} from '../dist/pixel-focus-input.js';
import {boatActions} from '../dist/pixel-boat-actions.js';
import {isFishingFocus,focusRodPoseFromDrag} from '../dist/pixel-fight-focus.js';

// This surface uses real EventTarget and bindPointer capture/release handling.
class Surface extends EventTarget{
 captured=new Set();classes=new Set();viewport={left:0,top:0,width:390,height:640};
 classList={add:value=>this.classes.add(value),remove:value=>this.classes.delete(value)};
 getBoundingClientRect(){return this.viewport;}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);this.send('lostpointercapture',id);}
 send(type,id=1,extra={}){const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:id,pointerType:'touch',button:0,clientX:100,clientY:200},extra);this.dispatchEvent(event);return event;}
}
function fixture(){
 const canvas=new Surface(),state={mode:'boat',rentalPaid:true,launchStage:'afloat',fishState:'fight',rodMount:'hand',rodElevation:38,rodAzimuth:-45,engine:false};let calls=0;
 const pose=()=>({elevation:state.rodElevation,azimuth:state.rodAzimuth}),input=bindFocusRod(canvas,{enabled:()=>isFishingFocus(state)&&boatActions(state).adjustPose,getPose:pose,onPose:value=>{calls++;state.rodElevation=Math.max(5,Math.min(85,value.elevation));state.rodAzimuth=Math.max(-110,Math.min(110,value.azimuth));}});
 return{canvas,state,input,pose,calls:()=>calls};
}

test('touching the first-person water never jumps the rod; owned relative travel changes the physical pose',()=>{
 const f=fixture(),initial=f.pose();f.canvas.send('pointerdown');assert.deepEqual(f.pose(),initial);assert.equal(f.calls(),0);assert.equal(f.canvas.hasPointerCapture(1),true);
 f.canvas.send('pointermove');assert.deepEqual(f.pose(),initial);f.canvas.send('pointermove',1,{clientX:150,clientY:140});assert.deepEqual(f.pose(),focusRodPoseFromDrag(initial,50,-60,f.canvas.viewport));
 f.canvas.send('pointermove',1,{clientX:5000,clientY:-5000});assert.deepEqual(f.pose(),{elevation:85,azimuth:110});f.canvas.send('pointermove',1,{clientX:-5000,clientY:5000});assert.deepEqual(f.pose(),{elevation:5,azimuth:-110});
 f.canvas.send('pointerup');const final=f.pose();assert.equal(f.canvas.captured.size,0);f.canvas.send('pointermove',1,{clientY:100});assert.deepEqual(f.pose(),final);
});

test('another finger cannot move or release the first-person rod owner',()=>{
 const f=fixture(),initial=f.pose();f.canvas.send('pointerdown',1);f.canvas.send('pointerdown',2);f.canvas.send('pointermove',2,{clientY:100});f.canvas.send('pointerup',2);assert.deepEqual(f.pose(),initial);assert.equal(f.canvas.hasPointerCapture(1),true);
 f.canvas.send('pointermove',1,{clientY:140});assert.ok(f.pose().elevation>initial.elevation);f.canvas.send('pointerup',1);assert.equal(f.canvas.captured.size,0);
});

for(const reason of['pointercancel','lostpointercapture','reset'])test(`first-person ${reason} clears the old gesture and a fresh contact starts from the saved pose`,()=>{
 const f=fixture();f.canvas.send('pointerdown');f.canvas.send('pointermove',1,{clientY:170});const before=f.pose();if(reason==='reset')f.input.reset();else f.canvas.send(reason);assert.equal(f.canvas.captured.size,0);assert.equal(f.canvas.classes.has('held'),false);
 f.canvas.send('pointermove',1,{clientY:100});f.canvas.send('pointerup');assert.deepEqual(f.pose(),before);f.canvas.send('pointerdown',2,{clientY:400});assert.deepEqual(f.pose(),before);f.canvas.send('pointermove',2,{clientY:370});assert.deepEqual(f.pose(),focusRodPoseFromDrag(before,0,-30,f.canvas.viewport));
});

test('ending the fight removes rod control immediately, before the next UI refresh',()=>{
 const f=fixture();f.canvas.send('pointerdown');f.state.fishState='landed';f.canvas.send('pointermove',1,{clientY:100});assert.equal(f.calls(),0);assert.equal(f.canvas.captured.size,0);
 f.state.fishState='fight';f.input.update();f.canvas.send('pointermove',1,{clientY:100});assert.equal(f.calls(),0,'the old contact must not revive');f.canvas.send('pointerdown',2);f.canvas.send('pointermove',2,{clientY:150});assert.equal(f.calls(),1);
 f.state.fishState='idle';f.input.update();assert.equal(f.canvas.captured.size,0);f.canvas.send('pointerdown',3);assert.equal(f.canvas.captured.size,0,'the hidden overhead-state canvas cannot take a touch');
});

test('pause leaves the focus view active but cancels its pointer and requires a new contact on resume',()=>{
 const f=fixture();f.canvas.send('pointerdown');f.canvas.send('pointermove',1,{clientY:170});const before=f.pose();f.state.paused=true;assert.equal(isFishingFocus(f.state),true);f.input.update();assert.equal(f.canvas.captured.size,0);
 f.canvas.send('pointerdown',2);f.canvas.send('pointermove',2,{clientY:100});assert.deepEqual(f.pose(),before);f.state.paused=false;f.input.update();f.canvas.send('pointermove',1,{clientY:100});assert.deepEqual(f.pose(),before);f.canvas.send('pointerdown',3);f.canvas.send('pointermove',3,{clientY:170});assert.ok(f.pose().elevation>before.elevation);
});

test('keyboard rod adjustments work only when the focused rod is available and leave unrelated keys alone',()=>{
 const f=fixture();let event=f.canvas.send('keydown',1,{key:'ArrowUp'});assert.equal(event.defaultPrevented,true);assert.equal(f.pose().elevation,43);f.canvas.send('keydown',1,{key:'ArrowRight'});assert.equal(f.pose().azimuth,-35);
 event=f.canvas.send('keydown',1,{key:'f'});assert.equal(event.defaultPrevented,false);assert.equal(f.calls(),2);f.state.paused=true;event=f.canvas.send('keydown',1,{key:'Home'});assert.equal(event.defaultPrevented,false);assert.equal(f.calls(),2);
 f.state.paused=false;f.canvas.send('keydown',1,{key:'Home'});assert.deepEqual(f.pose(),{elevation:45,azimuth:70});f.state.fishState='landed';f.canvas.send('keydown',1,{key:'ArrowDown'});assert.deepEqual(f.pose(),{elevation:45,azimuth:70});
});
