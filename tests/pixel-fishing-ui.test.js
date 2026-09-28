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

function fixture(t,fishState='idle',{electric=false,focus=false}={}){
 const priorDocument=globalThis.document;globalThis.document={getElementById:()=>null};
 t.after(()=>{if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;});
 const buttons=['rod-config-btn','drag-knob','spool-toggle','lower-rig','reel-btn','retrieve-rig','rod-hand','rod-port','rod-starboard'];
 const ids=['reel-wheel','rod-mount','tackle-name','rod-load','reel-instrument','reel-actions',...buttons];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element(buttons.includes(id)?'BUTTON':'DIV')]));
 elements['.fishing-toolbar']=new Element();elements['.fishing-instruments']=new Element();
 const root=new Element();root.querySelector=query=>elements[query.startsWith('#')?query.slice(1):query];
 const state={mode:'boat',rentalPaid:true,launchStage:'afloat',fishState,rodMount:'hand',rodElevation:45,rodAzimuth:70,drag:.5,rig:'bottom',fuel:80,engine:false,paused:false,inspection:null,profile:{owned:['rod',...(electric?['rod_electric']:[])],loadout:{rod:electric?'rod_electric':'rod'}},packed:['rod',...(electric?['rod_electric']:[])]};
 const sim={state,lowerRig:()=>{state.fishState='sinking';return{ok:true};},setRodPose:pose=>{state.rodElevation=pose.elevation;state.rodAzimuth=pose.azimuth;},changeDrag:delta=>{state.drag+=delta;}};
 let retrieveCalls=0,configureCalls=0;
 const ui=mountFishingConsole(root,{sim,getFocusView:()=>({active:focus}),getActions:()=>boatActions(state,{canLower:true}),onFeedback(){},onMount:value=>{state.rodMount=value;},onRetrieve(){retrieveCalls++;},onConfigure(){configureCalls++;}});
 ui.update();return{state,ui,elements,retrieveCalls:()=>retrieveCalls,configureCalls:()=>configureCalls};
}


test('the console without a casting control lowers directly and exposes the reel',t=>{
 const {state,ui,elements}=fixture(t),lower=elements['lower-rig'];
 assert.equal(elements['cast-btn'],undefined);assert.equal(elements['rod-pose'],undefined);assert.equal(elements['.fishing-instruments'].hidden,true);assert.equal(lower.hidden,false);
 assert.equal(lower.textContent,'船边下放');assert.equal(elements['reel-instrument'].hidden,true);
 lower.onclick();assert.equal(state.fishState,'sinking');ui.update();
 assert.equal(lower.hidden,true);assert.equal(elements['reel-instrument'].hidden,false);assert.equal(elements['.fishing-instruments'].hidden,false);
 assert.equal(elements['spool-toggle'].hidden,false);assert.equal(elements['reel-btn'].hidden,false);
 lower.onclick();assert.equal(state.fishState,'sinking','an unavailable lower action cannot restart deployment');
});

test('the drag control stays hidden and ignores pointer and keyboard input before hookup',t=>{
 const {state,ui,elements}=fixture(t),drag=elements['drag-knob'];
 for(const phase of['idle','casting','flight','sinking','waiting','bite']){
  state.fishState=phase;ui.update();assert.equal(drag.hidden,true,phase);assert.equal(drag.disabled,true,phase);
  drag.emit('pointerdown');drag.emit('pointermove',{clientY:46});drag.emit('keydown',{key:'ArrowUp'});
  assert.equal(drag.hasPointerCapture(1),false,phase);assert.equal(state.drag,.5,phase);
 }
 state.fishState='fight';ui.update();assert.equal(drag.hidden,false);assert.equal(drag.disabled,false);
 drag.emit('keydown',{key:'ArrowUp'});assert.equal(state.drag,.55);
});

test('ending a fight hides and cancels a held drag control without changing saved drag',t=>{
 const {state,ui,elements}=fixture(t,'fight'),drag=elements['drag-knob'];
 drag.emit('pointerdown');drag.emit('pointermove',{clientY:82});assert.equal(state.drag,.6);
 state.fishState='landed';ui.update();assert.equal(drag.hidden,true);assert.equal(drag.disabled,true);assert.equal(drag.hasPointerCapture(1),false);
 drag.emit('pointermove',{clientY:46});drag.emit('keydown',{key:'ArrowUp'});assert.equal(state.drag,.6);
 state.fishState='waiting';ui.update();drag.emit('pointerdown',{pointerId:2});drag.emit('pointermove',{pointerId:2,clientY:46});assert.equal(state.drag,.6);
 state.fishState='fight';ui.update();drag.emit('pointermove',{clientY:46});assert.equal(state.drag,.6,'the previous fight gesture cannot resume');
 drag.emit('pointerdown',{pointerId:2});drag.emit('pointermove',{pointerId:2,clientY:82});assert.equal(state.drag,.7);
});

test('a lost fish cancels a held drag gesture even before the next UI refresh',t=>{
 const {state,ui,elements}=fixture(t,'fight'),drag=elements['drag-knob'];
 drag.emit('pointerdown');drag.emit('pointermove',{clientY:82});assert.equal(state.drag,.6);
 state.fishState='idle';drag.emit('pointermove',{clientY:46});assert.equal(state.drag,.6);assert.equal(drag.hasPointerCapture(1),false);
 state.fishState='fight';drag.emit('pointermove',{clientY:28});assert.equal(state.drag,.6);
});

test('a waiting-state snag exposes drag adjustment and releasing the snag cancels a held gesture',t=>{
 const {state,ui,elements}=fixture(t,'waiting'),drag=elements['drag-knob'];
 state.snagged=true;state.rodBend=.95;state.lineSlackMeters=0;ui.update();
 assert.equal(drag.hidden,false);assert.equal(elements['rod-load'].textContent,'钓组卡住了');
 drag.emit('pointerdown');drag.emit('pointermove',{clientY:82});assert.equal(state.drag,.6);
 state.snagged=false;drag.emit('pointermove',{clientY:46});assert.equal(state.drag,.6);assert.equal(drag.hasPointerCapture(1),false);
 ui.update();assert.equal(drag.hidden,true);
 state.snagged=true;ui.update();drag.emit('pointermove',{clientY:28});assert.equal(state.drag,.6,'a released snag must not revive its old finger input');
 drag.emit('pointerdown',{pointerId:2});drag.emit('pointermove',{pointerId:2,clientY:118});assert.equal(state.drag,.5,'fresh downward drag loosens the drag');
});

test('reel illustration never captures touch or keyboard winding in any phase',t=>{
 const {state,ui,elements}=fixture(t,'waiting'),wheel=elements['reel-wheel'];
 for(const fishState of ['idle','flight','sinking','waiting','bite','fight','landed']){
  state.fishState=fishState;ui.update();wheel.emit('pointerdown',{clientX:150,clientY:68.6});wheel.emit('pointermove',{clientX:92,clientY:125});wheel.emit('keydown',{key:'ArrowUp'});
  assert.equal(wheel.attributes.role,'img');assert.equal(wheel.tabIndex,-1);assert.equal(wheel.hasPointerCapture(1),false);assert.equal(ui.input(.01).reel,0);
 }
});

test('phase changes cancel drag before the next UI refresh',t=>{
 const {state,ui,elements}=fixture(t,'fight'),drag=elements['drag-knob'];
 drag.emit('pointerdown',{pointerId:2});state.paused=true;drag.emit('pointermove',{pointerId:2,clientY:20});
 assert.equal(state.drag,.5);assert.equal(drag.hasPointerCapture(2),false);
 state.paused=false;ui.update();drag.emit('pointermove',{pointerId:2,clientY:20});assert.equal(state.drag,.5);
});

test('console replaces force percentages with line cues and a physical drag adjuster',t=>{
 const {state,ui,elements}=fixture(t,'fight');
 Object.assign(state,{rodBend:.9,rodLoadN:40,tension:99,stamina:8,payoutRate:1.2,retrieveRate:.1,paidLineMeters:26});ui.update();
 assert.equal(elements['rod-load'].textContent,'鱼在出线');
 assert.ok(elements['drag-knob'].innerHTML.includes('drag-star'));assert.ok(!elements['drag-knob'].innerHTML.includes('%'));
 assert.equal(elements['drag-knob'].attributes['aria-valuetext'],'泄力适中，向上拧紧，向下放松');
 Object.assign(state,{lineSlackMeters:1,payoutRate:0});ui.update();assert.equal(elements['rod-load'].textContent,'鱼线松了');
});


test('manual reels hide automatic recovery while hold controls remain available',t=>{
 const {state,ui,elements,retrieveCalls}=fixture(t,'waiting');
 const retrieve=elements['retrieve-rig'];
 for(const phase of ['sinking','waiting','bite','fight']){
  state.fishState=phase;ui.update();assert.equal(retrieve.hidden,true);assert.equal(retrieve.disabled,true);
  retrieve.onclick();assert.equal(retrieveCalls(),0);assert.equal(elements['reel-btn'].hidden,false);
 }
});

test('electric recovery appears only on the purchased active set and stops accepting hidden actions',t=>{
 const {state,ui,elements,retrieveCalls}=fixture(t,'waiting',{electric:true});
 const retrieve=elements['retrieve-rig'];assert.equal(retrieve.hidden,false);assert.equal(retrieve.textContent,'电动收线');retrieve.onclick();assert.equal(retrieveCalls(),1);
 state.profile.loadout.rod='rod';ui.update();assert.equal(retrieve.hidden,true);retrieve.onclick();assert.equal(retrieveCalls(),1);
 state.profile.loadout.rod='rod_electric';ui.update();assert.equal(retrieve.hidden,false);
 for(const patch of [{paused:true},{fishState:'bite'},{fishState:'fight'},{fishState:'idle'},{inspection:{phase:'checking'}}]){
  const base={...state};Object.assign(state,patch);ui.update();assert.equal(retrieve.hidden,true);retrieve.onclick();assert.equal(retrieveCalls(),1);Object.assign(state,base);
 }
 state.packed=['rod'];ui.update();assert.equal(retrieve.hidden,true);
});

test('focus exposes the winding button and drag, hiding passive reel and unavailable actions',t=>{
 const {state,ui,elements}=fixture(t,'fight',{focus:true});
 for(const id of ['spool-toggle','rod-config-btn','rod-mount','retrieve-rig','lower-rig','reel-instrument','.fishing-instruments'])assert.equal(elements[id].hidden,true,id);
 assert.equal(elements['reel-btn'].hidden,false);assert.equal(elements['reel-actions'].hidden,false);assert.equal(elements['drag-knob'].hidden,false);
 const wheel=elements['reel-wheel'];wheel.emit('pointerdown');wheel.emit('pointermove',{clientX:160});assert.equal(ui.input(.05).reel,0);
 state.rodMount='port';ui.update();assert.equal(elements['rod-hand'].hidden,false);assert.equal(elements['rod-port'].hidden,true);assert.equal(elements['rod-starboard'].hidden,true);
 state.fishState='landed';ui.update();assert.equal(elements['reel-btn'].hidden,true);assert.equal(elements['drag-knob'].hidden,true);assert.equal(elements['lower-rig'].hidden,false);
});

test('bite phase keeps hook or pickup action and steady winding without showing drag',t=>{
 const {state,ui,elements}=fixture(t,'bite',{focus:true});
 assert.equal(elements['lower-rig'].hidden,false);assert.equal(elements['reel-btn'].hidden,false);assert.equal(elements['drag-knob'].hidden,true);
 state.rodMount='starboard';ui.update();assert.equal(elements['lower-rig'].hidden,true);assert.equal(elements['rod-hand'].hidden,false);assert.equal(elements['rod-starboard'].hidden,true);
});

test('focus drag slider uses its actual track for taps and full top-to-bottom travel',t=>{
 const {state,ui,elements}=fixture(t,'fight',{focus:true}),drag=elements['drag-knob'];
 drag.querySelector=selector=>selector==='.drag-focus-track'?{getBoundingClientRect:()=>({top:200,height:64})}:null;
 drag.emit('pointerdown',{clientY:232});assert.ok(Math.abs(state.drag-.525)<1e-12);
 drag.emit('pointermove',{clientY:200});assert.equal(state.drag,.85);
 drag.emit('pointermove',{clientY:264});assert.ok(Math.abs(state.drag-.2)<1e-12);
 drag.emit('pointercancel');drag.emit('pointermove',{clientY:200});assert.ok(Math.abs(state.drag-.2)<1e-12);
});


test('icon placement switches directly between hand and either holder, with one selected state',t=>{
 const {state,ui,elements}=fixture(t,'waiting');
 for(const value of ['port','starboard','hand']){
  elements['rod-'+value].onclick();ui.update();assert.equal(state.rodMount,value);
  for(const k of ['hand','port','starboard'])assert.equal(elements['rod-'+k].attributes['aria-pressed'],String(k===value));
 }
 state.fishState='fight';ui.update();elements['rod-port'].onclick();assert.equal(state.rodMount,'hand');assert.equal(elements['rod-mount'].hidden,true);
 state.rodMount='port';ui.update();assert.equal(elements['rod-hand'].hidden,false);assert.equal(elements['rod-starboard'].hidden,true);
 state.speed=2;ui.update();elements['rod-hand'].onclick();assert.equal(state.rodMount,'port');
 state.speed=0;state.paused=true;elements['rod-starboard'].onclick();assert.equal(state.rodMount,'port');
});


test('both side holders keep manual winding and the purchased electric reel available',t=>{
 const {state,ui,elements}=fixture(t,'waiting',{electric:true});
 for(const mount of ['port','starboard']){
  state.rodMount=mount;ui.update();assert.equal(elements['reel-btn'].hidden,false);assert.equal(elements['reel-wheel'].attributes.role,'img');assert.equal(elements['retrieve-rig'].hidden,false);
  elements['reel-wheel'].emit('keydown',{key:'ArrowUp'});assert.equal(ui.input(.05).reel,0);assert.equal(state.rodMount,mount);elements['reel-wheel'].emit('keyup',{key:'ArrowUp'});assert.equal(ui.input(.05).reel,0);
 }
});


test('rod configuration only opens after retrieval and guards stale clicks during deployment',t=>{
 const f=fixture(t),button=f.elements['rod-config-btn'];
 assert.equal(button.disabled,false);button.onclick();assert.equal(f.configureCalls(),1);
 for(const phase of ['casting','flight','sinking','waiting','bite','fight','landed']){
  f.state.fishState=phase;button.onclick();assert.equal(f.configureCalls(),1,'stale UI must not open configuration');
  f.ui.update();assert.equal(button.disabled,true,phase);
 }
 f.state.fishState='idle';f.state.rodMount='port';f.ui.update();assert.equal(button.disabled,false);button.onclick();assert.equal(f.configureCalls(),2);
});
