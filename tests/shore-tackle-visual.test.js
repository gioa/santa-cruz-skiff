import test from 'node:test';
import assert from 'node:assert/strict';
import {getShoreScene,sampleShore} from '../dist/shore-data.js';
import {shoreWaterContact,shoreTackleLine} from '../dist/shore-tackle-visual.js';
import {createPacificaWorld} from '../dist/pacifica-world.js';
import {shoreFightPose,createShoreFightView} from '../dist/shore-fight-view.js';

const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const sea={waveHeightM:2.1,wavePeriodS:14,waveDirectionDeg:20,tideM:.6};
function setup(sceneId='pacifica'){
  const scene=getShoreScene(sceneId),x=2440,y=scene.shoreY(x);
  return{scene,point:{x,y:y-40*3.2},state:{phase:'waiting',elapsed:12,seaState:sea,
    player:{x,y:y+24},rig:'float',tension:.1,presentation:{mode:'float',depth:1},
    cast:{origin:{x,y:y+6},target:{x,y:y-40*3.2},distance:42}}};
}
function canvas(){
  const colors=[];
  const context=new Proxy({fillRect(){colors.push(this.fillStyle);},fill(){colors.push(this.fillStyle);}},{get:(object,key)=>key in object?object[key]:()=>{}});
  return{width:900,height:600,colors,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})};
}
globalThis.document={createElement:canvas};

test('surface contact follows each beach wave field and has no independent calm-water bob',()=>{
  for(const id of ['pacifica','half-moon-bay']){
    const {scene,point}=setup(id);
    for(const elapsed of [0,1.5,7,14,103]){
      const contact=shoreWaterContact(scene,point,elapsed,sea),sample=sampleShore(scene,point.x,point.y,elapsed,sea);
      close(contact.height,sample.surfaceElevation);close(contact.flowX,sample.flowX);close(contact.flowY,sample.flowY);
      const calm=shoreWaterContact(scene,point,elapsed,{...sea,waveHeightM:0});
      for(const key of ['height','flowX','flowY','tilt','foam','breaking'])close(calm[key],0);
    }
  }
});

test('water elevation stays continuous as differently sized crests arrive',()=>{
  for(const id of ['pacifica','half-moon-bay']){
    const {scene,point}=setup(id),phase=sampleShore(scene,point.x,point.y,0,sea).wavePhase;
    const first=(Math.ceil(phase/(2*Math.PI))*2*Math.PI-phase)*sea.wavePeriodS/(2*Math.PI);
    for(let i=0;i<8;i++){
      const t=first+i*sea.wavePeriodS,at=shoreWaterContact(scene,point,t+1e-7,sea);
      const before=shoreWaterContact(scene,point,t-1e-4,sea),after=shoreWaterContact(scene,point,t+1e-4,sea);
      close(before.height,after.height,1e-5);
      close(at.height,at.sample.crestHeight*.5,1e-6);
    }
  }
});

test('projected line stays attached, bows with flow direction, and straightens under tension',()=>{
  const tip={x:10,y:20},entry={x:90,y:130};
  const a=shoreTackleLine(tip,entry,{tension:.1,sag:12,flowX:1}),b=shoreTackleLine(tip,entry,{tension:.1,sag:12,flowX:-1});
  assert.deepEqual(a[0],tip);assert.deepEqual(a.at(-1),entry);
  assert.ok(a[12].x>b[12].x);
  const taut=shoreTackleLine(tip,entry,{tension:1,sag:12,flowX:1,flowY:2});
  taut.forEach((p,i)=>{close(p.x,tip.x+(entry.x-tip.x)*i/18);close(p.y,tip.y+(entry.y-tip.y)*i/18);});
  for(const p of shoreTackleLine(tip,entry,{tension:NaN,sag:Infinity,flowX:NaN,flowY:Infinity,scale:NaN,segments:NaN})){
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
  }
});

test('overhead float height, rod load and connected line follow actual water and tension',()=>{
  for(const id of ['pacifica','half-moon-bay']){
    const {scene,state}=setup(id),world=createPacificaWorld(canvas(),{sceneId:id}),before=JSON.stringify(state);
    world.resize(900,600);
    const a=world.draw(state,state.elapsed).tackle,contact=shoreWaterContact(scene,state.cast.target,state.elapsed,sea);
    close(a.waterEntry.x,state.cast.target.x);close(a.waterEntry.y,state.cast.target.y-contact.height*3.2);
    assert.deepEqual(a.line[0],a.rodTip);assert.deepEqual(a.line.at(-1),a.attachment);
    assert.ok(a.floatVisible);close(a.tilt,contact.tilt);
    const loaded=world.draw({...state,tension:.8},state.elapsed).tackle;
    assert.ok(loaded.bend>a.bend);assert.ok(loaded.rodTip.y>a.rodTip.y);
    assert.equal(JSON.stringify(state),before);
    const bite=world.draw({...state,phase:'bite'},state.elapsed).tackle;
    close(bite.attachment.y-a.attachment.y,2);assert.deepEqual(bite.line.at(-1),bite.attachment);
    const bottom=world.draw({...state,rig:'carolina',presentation:{mode:'bottom'}},state.elapsed).tackle;
    assert.equal(bottom.floatVisible,false);close(bottom.bend,a.bend);
  }
});

test('overhead uses simulated horizontal drift once and never adds cosmetic orbital travel',()=>{
  const {state}=setup(),world=createPacificaWorld(canvas());
  const moved={...state,cast:{...state.cast,target:{x:state.cast.target.x+13,y:state.cast.target.y-7}}};
  const a=world.draw(state,0).tackle,b=world.draw(moved,0).tackle;
  close(b.waterEntry.x-a.waterEntry.x,13);
  const contact=shoreWaterContact('pacifica',moved.cast.target,moved.elapsed,sea);
  close(b.waterEntry.y+contact.height*3.2,moved.cast.target.y);
});

test('overhead calm and reduced-motion tackle stay still while elapsed time changes',()=>{
  const {state}=setup(),world=createPacificaWorld(canvas());
  const calm={...state,seaState:{...sea,waveHeightM:0}};
  assert.deepEqual(world.draw(calm,0).tackle,world.draw({...calm,elapsed:22},22).tackle);
  assert.deepEqual(world.draw(state,0,{reducedMotion:true}).tackle,world.draw({...state,elapsed:22},22,{reducedMotion:true}).tackle);
  assert.notDeepEqual(world.draw(state,0).tackle,world.draw({...state,elapsed:22},22).tackle);
  assert.equal(world.draw({...state,phase:'walk',cast:null},0).tackle,null);
});

test('equipped bottom rigs never inherit bobbers from stale float presentation in either camera',()=>{
  for(const id of ['pacifica','half-moon-bay'])for(const rig of ['carolina_rig','fishfinder_rig']){
    const {state}=setup(id),art=canvas(),world=createPacificaWorld(art,{sceneId:id});
    // Both legacy hints still say float; the mounted rig must win.
    const s={...state,activeRod:'starter_rod',rodSupplies:{starter_rod:{id:rig}}};
    const overhead=world.draw(s,s.elapsed).tackle;
    assert.equal(overhead.floatVisible,false);assert.equal(overhead.tilt,0);
    assert.equal(art.colors.includes('#e26e50'),false);
    assert.equal(art.colors.includes('#e0ead0'),false,'no terminal target ring on bottom tackle');
    const fight={...s,phase:'fighting',lineDistance:s.cast.distance};
    const closeArt=canvas(),view=createShoreFightView(closeArt,{sceneId:id});view.draw(fight,0,{active:true});
    assert.equal(view.snapshot().floatVisible,false);assert.equal(closeArt.colors.includes('#e26e50'),false);
    assert.equal(shoreFightPose(id,fight).visual.rig,'bottom');
    // A real float stays visible even if the older hints say bottom.
    const floating={...s,rig:'carolina',presentation:{mode:'bottom',depth:1},rodSupplies:{starter_rod:{id:'float_rig'}}};
    assert.equal(world.draw(floating,0).tackle.floatVisible,true);
    assert.equal(shoreFightPose(id,{...floating,phase:'fighting',lineDistance:s.cast.distance}).visual.rig,'float');
  }
});

test('bottom line enters water before submerged tackle and both cameras agree during fights',()=>{
  for(const id of ['pacifica','half-moon-bay']){
    const {state,scene}=setup(id),world=createPacificaWorld(canvas(),{sceneId:id});
    const s={...state,rig:'fishfinder',presentation:{mode:'bottom',depth:2.5}};
    const before=JSON.stringify(s),shot=world.draw(s,0).tackle;
    const range=p=>Math.hypot(p.x-s.cast.origin.x,p.y-s.cast.origin.y);
    assert.ok(range(shot.entryWorld)<range(shot.terminalPosition));
    assert.deepEqual(shot.terminalPosition,s.cast.target);assert.equal(JSON.stringify(s),before);
    assert.ok(shot.entryWorld.y<scene.shoreY(shot.entryWorld.x));
    const fighting={...s,phase:'fighting',lineDistance:s.cast.distance};
    assert.deepEqual(world.draw(fighting,0).tackle.entryWorld,shoreFightPose(id,fighting).entryWorld);
    const floating={...s,rig:'float',presentation:{mode:'float',depth:1}};
    assert.deepEqual(world.draw(floating,0).tackle.entryWorld,s.cast.target);
  }
});
