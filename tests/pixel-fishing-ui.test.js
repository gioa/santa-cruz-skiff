import test from 'node:test';
import assert from 'node:assert/strict';
import {mountFishingConsole} from '../dist/pixel-fishing-ui.js';
import {boatActions} from '../dist/pixel-boat-actions.js';

// Exercise the real pointer binding and capability selector without a browser.
class Element {
 constructor(tagName='DIV'){
  this.tagName=tagName;this.listeners=new Map();this.hidden=false;this.style={};this.attributes={};
  const classes=new Set();this.classList={add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v),contains:v=>classes.has(v)};
 }
 addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(handler);}
 emit(type,values={}){for(const handler of this.listeners.get(type)||[])handler({pointerId:1,pointerType:'touch',clientX:100,clientY:100,preventDefault(){},stopPropagation(){},...values});}
 getBoundingClientRect(){return{left:0,top:0,width:200,height:140};}
 setPointerCapture(id){this.capture=id;}
 hasPointerCapture(id){return this.capture===id;}
 releasePointerCapture(id){this.capture=null;this.emit('lostpointercapture',{pointerId:id});}
 setAttribute(name,value){this.attributes[name]=value;}
 removeAttribute(name){delete this.attributes[name];}
}

function fixture(t,fishState='idle'){
 const priorDocument=globalThis.document;globalThis.document={getElementById:()=>null};
 t.after(()=>{if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;});
 const buttons=['drag-knob','spool-toggle','lower-rig','cast-btn','reel-btn','retrieve-rig','take-rod'];
 const ids=['rod-pose','reel-wheel','rod-mount','tackle-name','rod-load','reel-instrument',...buttons];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element(id==='rod-mount'?'SELECT':buttons.includes(id)?'BUTTON':'DIV')]));
 elements['.fishing-toolbar']=new Element();elements['.fishing-instruments']=new Element();
 const root=new Element();root.querySelector=query=>elements[query.startsWith('#')?query.slice(1):query];
 const state={mode:'boat',rentalPaid:true,launchStage:'afloat',fishState,rodMount:'hand',rodElevation:45,rodAzimuth:70,drag:.5,rig:'bottom',fuel:80,engine:false};
 const sim={state,setRodPose:pose=>{state.rodElevation=pose.elevation;state.rodAzimuth=pose.azimuth;},changeDrag:delta=>{state.drag+=delta;}};
 const ui=mountFishingConsole(root,{sim,getActions:()=>boatActions(state,{canLower:true,canCast:true}),onFeedback(){},onMount(){},onRetrieve(){}});
 ui.update();return{state,ui,elements};
}

test('casting into flight cancels an already held rod and a fresh touch is needed afterwards',t=>{
 const {state,ui,elements}=fixture(t),pose=elements['rod-pose'];
 pose.emit('pointerdown');pose.emit('pointermove',{clientY:86});assert.equal(state.rodElevation,53.5);
 state.fishState='flight';ui.update();assert.equal(pose.attributes.role,'img');assert.equal(pose.hasPointerCapture(1),false);
 pose.emit('pointermove',{clientY:30});assert.equal(state.rodElevation,53.5);
 state.fishState='waiting';ui.update();pose.emit('pointermove',{clientY:30});assert.equal(state.rodElevation,53.5,'the old touch must not reactivate');
 pose.emit('pointerdown',{pointerId:2});pose.emit('pointermove',{pointerId:2,clientY:86});assert.equal(state.rodElevation,62);
});

test('retrieving the rig hides and cancels a held drag control without changing saved drag',t=>{
 const {state,ui,elements}=fixture(t,'waiting'),drag=elements['drag-knob'];
 drag.emit('pointerdown');drag.emit('pointermove',{clientY:82});assert.equal(state.drag,.6);
 state.fishState='idle';ui.update();assert.equal(drag.hidden,true);assert.equal(drag.disabled,true);assert.equal(drag.hasPointerCapture(1),false);
 drag.emit('pointermove',{clientY:46});assert.equal(state.drag,.6);
 state.fishState='sinking';ui.update();drag.emit('pointermove',{clientY:46});assert.equal(state.drag,.6);
 drag.emit('pointerdown',{pointerId:2});drag.emit('pointermove',{pointerId:2,clientY:82});assert.equal(state.drag,.7);
});

test('losing reel availability clears captured crank travel and keyboard winding, not just output',t=>{
 const {state,ui,elements}=fixture(t,'waiting'),wheel=elements['reel-wheel'];
 wheel.emit('pointerdown',{clientX:150,clientY:68.6});wheel.emit('pointermove',{clientX:92,clientY:125});
 wheel.emit('keydown',{key:'ArrowUp'});assert.ok(ui.input(.01).reel>0);
 state.rodMount='port';ui.update();assert.equal(wheel.attributes.role,'img');assert.equal(wheel.hasPointerCapture(1),false);assert.equal(ui.input(.01).reel,0);
 state.rodMount='hand';ui.update();assert.equal(ui.input(.01).reel,0,'queued travel and a held key must not restart after pickup');
 wheel.emit('pointermove',{clientX:35,clientY:68.6});assert.equal(ui.input(.01).reel,0);
 wheel.emit('pointerdown',{pointerId:2,clientX:150,clientY:68.6});wheel.emit('pointermove',{pointerId:2,clientX:92,clientY:125});assert.ok(ui.input(.01).reel>0);
});

test('phase changes cancel gestures before the next UI refresh or pointer release',t=>{
 const {state,ui,elements}=fixture(t,'waiting'),pose=elements['rod-pose'],drag=elements['drag-knob'],wheel=elements['reel-wheel'];
 pose.emit('pointerdown');drag.emit('pointerdown',{pointerId:2});wheel.emit('pointerdown',{pointerId:3,clientX:150,clientY:68.6});
 state.paused=true;pose.emit('pointermove',{clientY:20});
 assert.equal(state.rodElevation,45);assert.equal(state.drag,.5);assert.equal(pose.hasPointerCapture(1),false);assert.equal(drag.hasPointerCapture(2),false);assert.equal(wheel.hasPointerCapture(3),false);
 state.paused=false;ui.update();wheel.emit('keydown',{key:'ArrowUp'});assert.equal(ui.input(.01).reel,1.2);
 state.paused=true;assert.equal(ui.input(.01).reel,0);state.paused=false;assert.equal(ui.input(.01).reel,0,'the frame gate also cancels a held key before update() runs');
});

test('console replaces force percentages with line cues and a physical drag adjuster',t=>{
 const {state,ui,elements}=fixture(t,'fight');
 Object.assign(state,{rodBend:.9,rodLoadN:40,tension:99,stamina:8,payoutRate:1.2,retrieveRate:.1,paidLineMeters:26});ui.update();
 assert.equal(elements['rod-load'].textContent,'鱼在出线');
 assert.ok(elements['rod-pose'].attributes['aria-valuetext'].includes('竿身深弯'));
 assert.ok(!elements['rod-pose'].attributes['aria-valuetext'].includes('%'));
 assert.ok(elements['drag-knob'].innerHTML.includes('drag-star'));assert.ok(!elements['drag-knob'].innerHTML.includes('%'));
 assert.equal(elements['drag-knob'].attributes['aria-valuetext'],'泄力适中，向上拧紧，向下放松');
 Object.assign(state,{lineSlackMeters:1,payoutRate:0});ui.update();assert.equal(elements['rod-load'].textContent,'鱼线松了');
});
