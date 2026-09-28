import test from 'node:test';
import assert from 'node:assert/strict';
import {bindFocusRod} from '../dist/pixel-focus-input.js';
import {boatActions} from '../dist/pixel-boat-actions.js';
import {isFishingFocus} from '../dist/pixel-fight-focus.js';

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
 const canvas=new Surface(),state={mode:'boat',rentalPaid:true,launchStage:'afloat',fishState:'fight',rodMount:'hand',rodElevation:38,rodAzimuth:-45,engine:false};
 const input=bindFocusRod(canvas,{enabled:()=>isFishingFocus(state)&&state.rodMount==='hand'&&boatActions(state).adjustPose});
 return{canvas,state,input};
}
test('hold lifts, arbitrary dragging cannot steer, intentional release starts recovery',()=>{
 const f=fixture();f.canvas.send('pointerdown');assert.equal(f.input.input(),'lift');
 f.canvas.send('pointermove',1,{clientX:5000,clientY:-5000});assert.equal(f.state.rodElevation,38);assert.equal(f.state.rodAzimuth,-45);assert.equal(f.input.input(),'lift');
 f.canvas.send('pointerup');assert.equal(f.input.input(),'recover');assert.equal(f.canvas.captured.size,0);
 f.canvas.send('pointerdown');assert.equal(f.input.input(),'lift');
});
test('second finger cannot release the lifting contact, so drag control stays independent',()=>{
 const f=fixture();f.canvas.send('pointerdown',1);f.canvas.send('pointerdown',2);f.canvas.send('pointerup',2);assert.equal(f.input.input(),'lift');assert.equal(f.canvas.hasPointerCapture(1),true);f.canvas.send('pointerup',1);assert.equal(f.input.input(),'recover');
});
for(const reason of ['pointercancel','lostpointercapture','reset'])test(`first-person ${reason} stops without automatic winding`,()=>{
 const f=fixture();f.canvas.send('pointerdown');if(reason==='reset')f.input.reset();else f.canvas.send(reason);
 assert.equal(f.input.input(),'idle');assert.equal(f.canvas.captured.size,0);f.canvas.send('pointerup');assert.equal(f.input.input(),'idle');f.canvas.send('pointerdown',2);assert.equal(f.input.input(),'lift');
});
test('pause, mounted rods and landing cancel the pump and require fresh input',()=>{
 for(const patch of [{paused:true},{rodMount:'port'},{fishState:'landed'}]){const f=fixture();f.canvas.send('pointerdown');Object.assign(f.state,patch);f.input.update();assert.equal(f.input.input(),'idle');assert.equal(f.canvas.captured.size,0);Object.assign(f.state,{paused:false,rodMount:'hand',fishState:'fight'});f.canvas.send('pointerup');assert.equal(f.input.input(),'idle');f.canvas.send('pointerdown');assert.equal(f.input.input(),'lift');}
});
test('keyboard hold follows the same pump cycle; arrows cannot move the rod',()=>{
 const f=fixture();f.canvas.send('keydown',1,{key:'Enter'});assert.equal(f.input.input(),'lift');f.canvas.send('keyup',1,{key:'Enter'});assert.equal(f.input.input(),'recover');f.canvas.send('keydown',1,{key:'ArrowRight'});assert.equal(f.state.rodAzimuth,-45);f.canvas.send('blur');assert.equal(f.input.input(),'idle');
});
