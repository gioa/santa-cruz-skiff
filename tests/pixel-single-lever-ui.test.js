import test from 'node:test';
import assert from 'node:assert/strict';
import {mountHelm} from '../dist/pixel-helm-ui.js';
import {leverForThrottle} from '../dist/pixel-single-lever.js';

// Exercise actual EventTarget, bindPointer ownership and release callbacks.
class Element extends EventTarget{
 constructor(){super();this.attributes={};this.hidden=false;this.classes=new Set();this.captured=new Set();this.styles={};this.textContent='';this.style={setProperty:(key,value)=>{this.styles[key]=value;}};this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};}
 setAttribute(key,value){this.attributes[key]=value;}
 getBoundingClientRect(){return{left:0,right:150,top:0,bottom:182,width:150,height:182};}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);this.send('lostpointercapture',id);}
 send(type,id=1,extra={}){const event=new Event(type,{cancelable:true});if('timeStamp' in extra){Object.defineProperty(event,'timeStamp',{value:extra.timeStamp});extra={...extra};delete extra.timeStamp;}Object.assign(event,{pointerId:id,pointerType:'touch',button:0,clientX:75,clientY:100},extra);this.dispatchEvent(event);return event;}
 key(key){return this.send('keydown',1,{key});}
}
function fixture(){
 const s={mode:'boat',engine:true,standing:false,moored:false,docking:null,paused:false,fishState:'idle',canOperateHelm:true,speed:0,throttle:0},handle=new Element(),lever=new Element(),arm=new Element(),meter=new Element(),gear=new Element(),feedback=[];
 const selectors={'#tiller-touch':handle,'.tiller-arm':arm,'#throttle-touch':lever,'#throttle-value':meter,'#throttle-gear':gear};let idles=0;
 const root={hidden:false,querySelector:selector=>selectors[selector]},helm=mountHelm(root,{getState:()=>s,onIdle:()=>{if(!s.waypoint)s.throttle=0;idles++;},onFeedback:value=>feedback.push(value)});helm.update();
 return{s,helm,root,handle,lever,meter,gear,feedback,get idles(){return idles;}};
}
const close=(value,expected)=>assert.ok(Math.abs(value-expected)<1e-9,`${value} != ${expected}`);

test('a lever touch does not jump or take over a route; relative movement combines gear and power and release retains it',()=>{
 const f=fixture();f.s.waypoint={name:'fishing spot'};f.s.throttle=.5;
 f.lever.send('pointerdown');assert.deepEqual(f.helm.input(),{});assert.equal(f.helm.snapshot().manual,false);assert.equal(f.s.throttle,.5);
 f.lever.send('pointerup');assert.deepEqual(f.helm.input(),{});assert.equal(f.lever.captured.size,0);
 f.s.waypoint=null;f.lever.send('pointerdown',2);f.lever.send('pointermove',2,{clientY:64});assert.equal(f.helm.snapshot().gear,'F');close(f.helm.snapshot().lever,.6);assert.ok(f.helm.input().throttle>0);
 f.lever.send('pointerup',2);const retained=f.helm.snapshot();for(let frame=0;frame<60;frame++){f.helm.update();assert.deepEqual(f.helm.snapshot(),retained);}
 f.lever.send('pointerdown',3,{clientY:180});assert.deepEqual(f.helm.snapshot(),retained,'new touch position does not act as absolute power');f.lever.send('pointerup',3);assert.deepEqual(f.helm.snapshot(),retained);
});

test('initial zero-distance and sub-two-pixel touch jitter leave automatic navigation ownership unchanged',()=>{
 const f=fixture();f.s.waypoint={name:'fishing spot'};f.s.throttle=.5;f.lever.send('pointerdown');
 for(const clientY of[100,99.9,101,98.01,101.99,100]){
  f.lever.send('pointermove',1,{clientY});assert.equal(f.helm.snapshot().manual,false,`initial movement to ${clientY} must not claim manual control`);assert.equal(f.helm.snapshot().gear,'N');assert.equal(f.helm.snapshot().lever,0);assert.deepEqual(f.helm.input(),{});assert.equal(f.s.throttle,.5);
 }
 f.lever.send('pointermove',1,{clientY:97.9});assert.equal(f.helm.snapshot().manual,true,'a deliberate movement beyond the threshold takes control');assert.equal(f.helm.snapshot().gear,'N','small deliberate travel remains within the neutral detent');assert.deepEqual(f.helm.input(),{steer:0,throttle:0});
 f.lever.send('pointermove',1,{clientY:70});assert.equal(f.helm.snapshot().gear,'F');assert.ok(f.helm.input().throttle>0);f.lever.send('pointerup');
});

test('a second finger cannot move or release the lever owner and tiller steering remains independent',()=>{
 const f=fixture();f.lever.send('pointerdown',1);f.lever.send('pointerdown',2);f.lever.send('pointermove',2,{clientY:30});f.lever.send('pointerup',2);assert.equal(f.helm.snapshot().gear,'N');assert.equal(f.lever.hasPointerCapture(1),true);
 f.lever.send('pointermove',1,{clientY:55});const power=f.helm.snapshot().throttle;
 f.handle.send('pointerdown',3,{clientX:75,clientY:75});f.handle.send('pointermove',3,{clientX:95,clientY:75});assert.ok(f.helm.snapshot().steer>0);close(f.helm.snapshot().throttle,power);f.handle.send('pointerup',3);const steer=f.helm.snapshot().steer;
 f.lever.send('pointermove',1,{clientY:70});assert.ok(f.helm.snapshot().throttle<power);close(f.helm.snapshot().steer,steer);f.lever.send('pointerup',1);
});

for(const reason of['pointercancel','lostpointercapture','reset'])test(`${reason} idles and a stale lever pointer cannot restart the engine drive`,()=>{
 const f=fixture();f.lever.send('pointerdown');f.lever.send('pointermove',1,{clientY:45});assert.ok(f.helm.input().throttle>0);
 if(reason==='reset')f.helm.reset();else f.lever.send(reason);
 assert.equal(f.lever.captured.size,0);assert.equal(f.helm.snapshot().gear,'N');assert.deepEqual(f.helm.input(),{});assert.equal(f.s.throttle,0);
 f.lever.send('pointermove',1,{clientY:10});f.lever.send('pointerup');assert.deepEqual(f.helm.input(),{});
 f.lever.send('pointerdown',2);f.lever.send('pointermove',2,{clientY:65});assert.equal(f.helm.snapshot().gear,'F');f.lever.send('pointerup',2);
});

test('pause, disabled fishing states  cancel held inputs before the next UI refresh',()=>{
 for(const patch of[{paused:true},{moored:true},{standing:true},{anchor:true},{docking:{}},{inspection:{phase:'checking'}},{fishState:'bite',canOperateHelm:false}]){
  const f=fixture();f.lever.send('pointerdown');f.lever.send('pointermove',1,{clientY:40});Object.assign(f.s,patch);assert.deepEqual(f.helm.input(),{},JSON.stringify(patch));assert.equal(f.lever.captured.size,0);assert.equal(f.helm.snapshot().gear,'N');
  Object.assign(f.s,{paused:false,engine:true,moored:false,standing:false,anchor:false,docking:null,inspection:null,fishState:'idle',canOperateHelm:true});f.lever.send('pointermove',1,{clientY:10});assert.deepEqual(f.helm.input(),{});f.helm.update();assert.equal(f.lever.attributes['aria-disabled'],'false');
 }
});

test('hiding the helm cancels an active drag but preserves a released trolling setting for the rod panel',()=>{
 const f=fixture();Object.assign(f.s,{fishState:'waiting',rodMount:'starboard'});f.lever.key('End');close(f.helm.input().throttle,.28);f.root.hidden=true;f.helm.update();close(f.helm.input().throttle,.28);assert.equal(f.lever.tabIndex,-1);assert.equal(f.lever.attributes['aria-disabled'],'true');
 f.lever.key('Home');close(f.helm.input().throttle,.28,'hidden keyboard cannot touch retained power');f.lever.send('pointerdown');assert.equal(f.lever.captured.size,0);
 f.root.hidden=false;f.helm.update();f.lever.send('pointerdown',2);f.root.hidden=true;assert.deepEqual(f.helm.input(),{});assert.equal(f.lever.captured.size,0);
 f.root.hidden=false;f.lever.send('pointermove',2,{clientY:30});assert.deepEqual(f.helm.input(),{});
});

test('newly deployed tackle blocks stale reverse gestures and caps retained forward power and indicator at the input boundary',()=>{
 const reverse=fixture();reverse.lever.key('ArrowDown');reverse.handle.key('ArrowRight');assert.ok(reverse.helm.input().throttle<0);const steer=reverse.helm.snapshot().steer;
 Object.assign(reverse.s,{fishState:'sinking',rodMount:'port'});assert.deepEqual(reverse.helm.input(),{steer,throttle:0});assert.equal(reverse.helm.snapshot().gear,'N');assert.equal(reverse.idles,1);reverse.helm.update();assert.equal(reverse.gear.textContent,'N');assert.equal(reverse.lever.attributes['aria-valuemin'],'0');assert.equal(reverse.idles,1);
 reverse.lever.key('ArrowDown');assert.equal(reverse.helm.input().throttle,0);assert.equal(reverse.helm.snapshot().gear,'N');
 const forward=fixture();forward.lever.key('End');assert.equal(forward.helm.input().throttle,1);forward.s.speed=2;Object.assign(forward.s,{fishState:'waiting',rodMount:'starboard'});close(forward.helm.input().throttle,.28);close(forward.helm.snapshot().lever,leverForThrottle(.28));forward.helm.update();assert.equal(forward.meter.textContent,'28%');assert.equal(forward.lever.attributes['aria-valuemax'],'28');assert.equal(forward.lever.attributes['aria-valuenow'],'28');
 forward.s.fishState='idle';forward.helm.update();close(forward.helm.input().throttle,.28,'retrieving tackle does not restore the old full-power demand');
});

test('keyboard crosses the neutral detent in one deliberate step and reversal never queues while the hull slows',()=>{
 const f=fixture();f.lever.key('ArrowUp');assert.equal(f.helm.snapshot().gear,'F');assert.ok(f.helm.input().throttle>0);f.lever.key('End');assert.equal(f.helm.input().throttle,1);f.handle.key('ArrowLeft');const steer=f.helm.snapshot().steer;
 f.s.speed=2;f.lever.key('Home');assert.equal(f.helm.snapshot().gear,'N');assert.equal(f.helm.input().throttle,0);assert.equal(f.helm.snapshot().steer,steer);
 f.lever.key('ArrowDown');assert.equal(f.helm.snapshot().gear,'N');assert.ok(f.feedback.length>0);const reports=f.feedback.length;f.lever.key('ArrowDown');assert.equal(f.feedback.length,reports,'same blocked shift does not spam feedback');
 f.s.speed=.2;for(let frame=0;frame<50;frame++){f.helm.update();assert.equal(f.helm.input().throttle,0);}f.lever.key('ArrowDown');assert.equal(f.helm.snapshot().gear,'R');assert.ok(f.helm.input().throttle<0);assert.equal(f.lever.attributes['aria-valuemin'],'-100');
 const event=f.lever.key('f');assert.equal(event.defaultPrevented,false,'unrelated keyboard controls are untouched');
});


test('legacy engine-off state does not gate steering or forward/reverse lever input',()=>{
 const f=fixture();f.s.engine=false;f.helm.update();assert.equal(f.lever.attributes['aria-disabled'],'false');
 f.lever.key('ArrowUp');assert.ok(f.helm.input().throttle>0);f.lever.key('Home');assert.equal(f.helm.input().throttle,0);
 f.lever.key('ArrowDown');assert.ok(f.helm.input().throttle<0);f.lever.key('Home');
 f.handle.send('pointerdown',2);f.handle.send('pointermove',2,{clientX:110});f.handle.send('pointerup',2,{clientX:110});assert.ok(f.helm.snapshot().steer>0);
});
test('tapping or keyboard activation on the tiller does not change propulsion',()=>{
 const f=fixture();f.lever.key('ArrowUp');const before=f.helm.snapshot();
 f.handle.send('pointerdown');f.handle.send('pointerup');f.handle.key('Enter');f.handle.key(' ');
 assert.deepEqual(f.helm.snapshot(),before);assert.equal(f.feedback.length,0);assert.equal(f.s.engine,true);
 assert.doesNotMatch(f.handle.attributes['aria-label'],/启停|启动|熄火/);
});
