import test from 'node:test';
import assert from 'node:assert/strict';
import {getShoreScene} from '../dist/shore-data.js';
import {shoreFishPosition} from '../dist/shore-line-geometry.js';
import {shoreRodPose,shoreActionCameraTarget,advanceShoreActionCamera,shoreFishVisual,shoreCastPreviewVisual} from '../dist/shore-action-view.js';
import {createShoreCast} from '../dist/shore-casting.js';
import {createPacificaWorld} from '../dist/pacifica-world.js';
import {createBeniciaWorld,beniciaRippleX} from '../dist/benicia-world.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function state(id='pacifica',overrides={}){
 const scene=getShoreScene(id),x=id==='benicia'?1440:2440,y=scene.shoreY(x);
 return{phase:'fighting',elapsed:5,player:{x,y:y+20},rig:'carolina',lineDistance:38,tension:.5,
  seaState:{waveHeightM:0,tideM:1.2},fish:{id:'jacksmelt',length:32,weightKg:.3},
  fishMotion:{depth:.6,airHeight:0,lateral:0,energy:.6,run:1,headShake:.2,phase:'run',splash:0},
  cast:{origin:{x,y:y+2},target:{x:x+48,y:y-118},distance:40,fightDistance:40},...overrides};
}
function canvas(width=900,height=600){
 const calls=[],bounds={left:0,top:0,width,height};
 const ctx=new Proxy({globalAlpha:1,drawImage(...args){calls.push(['drawImage',...args]);},translate(...args){calls.push(['translate',...args]);}}, {get:(obj,key)=>key in obj?obj[key]:()=>{}});
 return{width,height,calls,bounds,getContext:()=>ctx,getBoundingClientRect:()=>bounds};
}
globalThis.document={createElement:()=>canvas()};

function cameraFrame(id,s,camera,dt=.05){
 const target=shoreActionCameraTarget(id,s,{width:camera.width,height:camera.height,top:50,bottom:90,baseScale:.5});
 const next=advanceShoreActionCamera(camera,target,dt);
 for(const p of target.points){
  const x=(p.x-next.x)*next.scale+next.width/2,y=(p.y-next.y)*next.scale+target.screenY,b=target.safeBounds;
  assert.ok(x>=b.left-1e-8&&x<=b.right+1e-8&&y>=b.top-1e-8&&y<=b.bottom+1e-8,`action stays in safe frame at ${x}, ${y}`);
 }
 return{next,target};
}

test('one continuous camera keeps angler and rig/fish together through run, jump and landing approach',()=>{
 for(const id of ['pacifica','half-moon-bay','benicia'])for(const [width,height]of[[360,780],[1000,600]]){
  const s=state(id);let camera={x:s.player.x,y:s.player.y-110,scale:.5,width,height},lastScale=null;
  for(let i=0;i<28;i++){
   const lineDistance=70-i*2.3,frame={...s,lineDistance,fishMotion:{...s.fishMotion,lateral:Math.sin(i*.3)*3,airHeight:i===8?.7:0,jumpActive:i===8}};
   const result=cameraFrame(id,frame,camera);camera=result.next;
   assert.equal(result.target.mode,'fighting');assert.ok(result.target.focus>=.72);
   if(i===8)assert.ok(result.target.focus>.8);
   if(i===0)lastScale=camera.scale;
  }
  assert.ok(camera.scale>lastScale*1.3,'camera moves closer as the actual fight comes near shore');
 }
});

test('zoom advances smoothly and reduced motion still preserves the action envelope',()=>{
 const s=state(),base={x:s.player.x,y:s.player.y-65,scale:.4,width:900,height:600};
 const target=shoreActionCameraTarget('pacifica',s,{width:900,height:600,top:50,bottom:80,baseScale:.4});
 const first=advanceShoreActionCamera(base,target,.016),later=advanceShoreActionCamera(first,target,.016),reduced=advanceShoreActionCamera(base,target,.016,{reducedMotion:true});
 assert.ok(first.scale>base.scale&&first.scale<target.scale);assert.ok(later.scale>first.scale&&later.scale<target.scale);
 assert.ok(reduced.scale<first.scale);assert.ok(Math.abs(first.x-base.x)<Math.abs(target.x-base.x));
});

test('explicit action focus boosts active tackle without suppressing fight or jump focus',()=>{
 const settings={width:900,height:600,baseScale:.5},s=state('pacifica',{phase:'waiting'});
 const idle=shoreActionCameraTarget('pacifica',s,settings),focused=shoreActionCameraTarget('pacifica',s,{...settings,actionFocus:true});
 assert.ok(focused.focus>=.75);assert.ok(focused.focus>idle.focus);
 assert.equal(shoreActionCameraTarget('pacifica',s,{...settings,actionFocus:false}).focus,idle.focus);
 const jump=state('pacifica',{fishMotion:{jumpActive:true,run:3}});
 assert.equal(shoreActionCameraTarget('pacifica',jump,{...settings,actionFocus:true}).focus,shoreActionCameraTarget('pacifica',jump,settings).focus);
});

test('rod lift, lateral sweep, twitch and real tension all change the connected rod pose',()=>{
 const s=state(),low=shoreRodPose(s,{rodLift:0,rodSweep:-1}),high=shoreRodPose(s,{rodLift:1,rodSweep:1});
 assert.ok(high.tip.y<low.tip.y);assert.ok(high.tip.x>low.tip.x);
 assert.deepEqual(high.points[0],high.butt);assert.deepEqual(high.points.at(-1),high.tip);
 const slack=shoreRodPose({...s,tension:0}),loaded=shoreRodPose({...s,tension:1}),twitched=shoreRodPose({...s,presentation:{twitch:1}});
 assert.ok(loaded.tip.y>slack.tip.y);assert.ok(loaded.bend>slack.bend);assert.ok(twitched.tip.y<shoreRodPose(s).tip.y);
});

test('fight lateral swimming is in metres, keeps its shore constraint and never moves waiting tackle',()=>{
 for(const id of ['pacifica','half-moon-bay','benicia']){
  const s=state(id),base=shoreFishPosition(id,s),moved=shoreFishPosition(id,{...s,fishMotion:{...s.fishMotion,lateral:2}});
  const dx=s.cast.target.x-s.cast.origin.x,dy=s.cast.target.y-s.cast.origin.y,norm=Math.hypot(dx,dy);
  close((moved.x-base.x)*(-dy/norm)+(moved.y-base.y)*(dx/norm),6.4);
  close(Math.hypot(moved.x-s.cast.origin.x,moved.y-s.cast.origin.y),Math.hypot(base.x-s.cast.origin.x,base.y-s.cast.origin.y));
  assert.notEqual(moved.x,base.x);
  const near={...s,lineDistance:2.5,fishMotion:{...s.fishMotion,lateral:200}};
  const q=shoreFishPosition(id,near);assert.ok(q.y<=getShoreScene(id).shoreY(q.x)-3.2);
  assert.deepEqual(shoreFishPosition(id,{...s,phase:'waiting',fishMotion:{lateral:2}}),shoreFishPosition(id,{...s,phase:'waiting',fishMotion:{lateral:0}}));
 }
});

test('deep fish stay hidden; actual surface and aerial fish use their own species and true motion position',()=>{
 for(const id of ['pacifica','half-moon-bay','benicia']){
  const s=state(id),deep=shoreFishVisual(id,{...s,fishMotion:{...s.fishMotion,depth:2,splash:1}},{time:5});
  assert.equal(deep.visible,false,'a surface splash cannot reveal an underwater fish');
  const jump={...s,fishMotion:{...s.fishMotion,depth:0,airHeight:.7,jumpActive:true,lateral:2,splash:.4}},visual=shoreFishVisual(id,jump,{time:5});
  assert.equal(visual.visible,true);assert.equal(visual.kind,'jacksmelt');assert.deepEqual(visual.ground,shoreFishPosition(id,jump));
  close(visual.surfaceWorld.y-visual.world.y,.7*3.2);close(visual.world.x,visual.ground.x);
  const halibut=shoreFishVisual(id,{...jump,fish:{id:'halibut',length:70,weightKg:3}}),salmon=shoreFishVisual(id,{...jump,fish:{id:'chinook_salmon',length:75,weightKg:4}});
  assert.equal(halibut.kind,'halibut');assert.equal(salmon.kind,'salmon');assert.ok(halibut.length>visual.length);
  const enlarged=shoreFishVisual(id,jump,{cameraScale:12});close(enlarged.length,32/100*3.2);
 }
});

test('each world draws fish at the actual jump, retains control pose and hides all deep fish sprites',()=>{
 for(const id of ['pacifica','half-moon-bay','benicia']){
  const art=canvas(),world=id==='benicia'?createBeniciaWorld(art):createPacificaWorld(art,{sceneId:id});world.resize(900,600);
  const s=state(id),before=JSON.stringify(s),deep=world.draw(s,5);
  assert.equal(deep.fishVisual.visible,false);
  assert.equal(art.calls.some(c=>c[0]==='drawImage'&&c[1]?.width===48&&c[1]?.height===24),false);
  const jump={...s,fishMotion:{...s.fishMotion,depth:0,airHeight:.8,jumpActive:true,splash:.8}};art.calls.length=0;
  const shot=world.draw(jump,5.05,{rodLift:.9,rodSweep:.8});
  assert.equal(shot.fishVisual.visible,true);assert.equal(shot.actionCamera.mode,'fighting');
  assert.equal(shot.tackle.rodControls.rodLift,.9);assert.equal(shot.tackle.rodControls.rodSweep,.8);
  assert.deepEqual(shot.tackle.line.at(-1),shot.tackle.attachment);
  close(shot.tackle.attachment.y,shot.fishVisual.world.y);
  assert.ok(art.calls.some(c=>c[0]==='drawImage'&&c[1]?.width===48&&c[1]?.height===24),'species sprite painted');
  assert.ok(art.calls.some(c=>c[0]==='translate'&&c[1]===shot.fishVisual.world.x&&c[2]===shot.fishVisual.world.y));
  assert.deepEqual(shot.castTarget,world.worldToScreen(shoreFishPosition(id,jump)));
  assert.equal(JSON.stringify(s),before);
 }
});

test('phase/layout updates do not reset the continuous world camera',()=>{
 for(const id of ['pacifica','half-moon-bay','benicia']){
  const art=canvas(),world=id==='benicia'?createBeniciaWorld(art):createPacificaWorld(art,{sceneId:id});world.resize(900,600);world.setInsets({top:70,bottom:100});
  const s=state(id,{phase:'waiting',lineDistance:12,cast:{...state(id).cast,target:{x:state(id).player.x+12,y:state(id).player.y-58}}});
  const first=world.draw(s,1);world.setInsets({top:70,bottom:100});
  const bite=world.draw({...s,phase:'bite'},1);
  assert.deepEqual(bite.camera,first.camera,'phase changes do not snap to the new preferred scale');
 }
});

test('charging loads the actual rod without revealing or fitting a future landing location',()=>{
 for(const id of ['pacifica','half-moon-bay','benicia']){
  const s=state(id,{phase:'walk',cast:null}),castPreview=createShoreCast(id,s,{power:.7,aim:.25}),previewState={...s,castPreview,castCharge:.7};
  assert.equal(shoreCastPreviewVisual(previewState),null);
  const settings={width:900,height:600,top:70,bottom:100};
  assert.deepEqual(shoreActionCameraTarget(id,previewState,settings),shoreActionCameraTarget(id,{...previewState,castPreview:{target:{x:9999,y:-9999}}},settings));
  assert.notDeepEqual(shoreRodPose(previewState).tip,shoreRodPose({...previewState,castCharge:0}).tip);
  const art=canvas(),world=id==='benicia'?createBeniciaWorld(art):createPacificaWorld(art,{sceneId:id}),shot=world.draw(previewState,0);
  assert.equal(shot.actionCamera.mode,'charging');assert.equal(shot.castPreview,null);assert.equal(shot.tackle,null);
 }
});

test('measured overlay bounds remain authoritative beyond former percentage caps',()=>{
 for(const id of ['pacifica','benicia']){
  const art=canvas(900,700),world=id==='benicia'?createBeniciaWorld(art):createPacificaWorld(art,{sceneId:id});world.resize(900,700);
  world.setInsets({top:260,bottom:375,left:0,right:80});
  const shot=world.draw(state(id),0),factor=art.height/700,bounds=shot.actionCamera.safeBounds;
  close(bounds.top,260*factor+12);close(bounds.bottom,art.height-375*factor-12);
  close(bounds.right,art.width-80*factor-Math.min(28,art.width*.08));
  assert.ok(shot.player.visible);assert.ok(shot.castTarget.visible);
 }
});

test('Benicia flood ripples move east on the south-facing view and wrap in either tide direction',()=>{
 const start=1300;close(beniciaRippleX(start,1,1)-beniciaRippleX(start,0,1),-3.2);
 close(beniciaRippleX(start,1,-1)-beniciaRippleX(start,0,-1),3.2);
 for(const elapsed of [0,1,1000,1e6])for(const speed of [-1,.7,1]){
  const x=beniciaRippleX(start,elapsed,speed);assert.ok(x>=-150&&x<2450);
 }
});
