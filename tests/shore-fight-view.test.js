import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {shoreFightActive,shoreFightPose,shoreSurfaceProjection,createShoreFightView} from '../dist/shore-fight-view.js';
import {getShoreScene,sampleShore} from '../dist/shore-data.js';

const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-8,message||`${actual} != ${expected}`);
function state(sceneId='pacifica',overrides={}){
 const scene=getShoreScene(sceneId),x=2440,shore=scene.shoreY(x);
 return{sceneId,phase:'fighting',elapsed:12,player:{x,y:shore+55},onPier:false,
  cast:{origin:{x,y:shore+37},target:{x:x+64,y:scene.shoreY(x+64)-192},distance:60},
  lineDistance:60,tension:.5,fish:{id:'halibut',weightKg:2,run:.4,stamina:.6},...overrides};
}
function deepFreeze(value){
 if(value&&typeof value==='object'){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}
 return value;
}
function recordingCanvas(){
 let calls=[];const context={fillStyle:'',imageSmoothingEnabled:true};
 for(const name of ['fillRect','beginPath','moveTo','lineTo','closePath','fill','save','restore','drawImage'])context[name]=(...args)=>calls.push([name,context.fillStyle,...args]);
 return{width:0,height:0,getContext:()=>context,reset(){calls=[];},digest(){return createHash('sha256').update(JSON.stringify(calls)).digest('hex');},get calls(){return calls;}};
}
function render(sceneId,s,options={}){
 const canvas=recordingCanvas(),view=createShoreFightView(canvas,{sceneId});
 view.draw(s,0,{active:true,reducedMotion:true,...options});return{canvas,view,shot:view.snapshot()};
}

test('only fighting and the pending catch decision keep the shore first-person camera active',()=>{
 for(const phase of ['fighting','landed'])assert.equal(shoreFightActive({phase}),true);
 for(const phase of ['walk','casting','waiting','bite','fight',undefined])assert.equal(shoreFightActive({phase}),false);
 assert.equal(shoreFightActive(),false);assert.equal(shoreFightActive(null),false);
});

test('the pose, projection and renderer leave nested gameplay state unchanged',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const s=deepFreeze(state(sceneId)),before=JSON.stringify(s),canvas=recordingCanvas(),view=createShoreFightView(canvas,{sceneId});
  const pose=shoreFightPose(sceneId,s);
  shoreSurfaceProjection(390,844,sceneId,s,pose.entryWorld);
  view.draw(s,.1,{active:true,reeling:true});
  view.draw(s,.1,{active:true,paused:true,reeling:true});
  assert.equal(JSON.stringify(s),before);assert.ok(canvas.calls.length>200);
  assert.equal(view.snapshot().active,true);
 }
});

test('surface projection converts the shore pixels to metres and keeps forward distance monotonic',()=>{
 const width=400,height=800;
 for(const sceneId of ['pacifica','half-moon-bay']){
  const scene=getShoreScene(sceneId),s=state(sceneId),x=s.player.x;
  const project=(offsetX,metres)=>shoreSurfaceProjection(width,height,sceneId,s,{x:x+offsetX,y:scene.shoreY(x+offsetX)-metres*3.2});
  const near=project(0,1),eighteenMetres=project(0,18),far=project(0,90);
  close(eighteenMetres.x,200);
  close(eighteenMetres.y,434,'18 metres is the calibrated halfway point between horizon and near-water plane');
  assert.ok(near.y>eighteenMetres.y&&eighteenMetres.y>far.y);
  const left=project(-32,18),right=project(32,18);
  close(right.x-eighteenMetres.x,50,'32 world pixels are ten metres, not 32 metres');
  close(eighteenMetres.x-left.x,right.x-eighteenMetres.x);
  close(left.y,right.y,'equal offshore depths project equally despite the curved coastline');
  for(const offsetX of [-1e6,1e6]){const p=project(offsetX,18);assert.ok(p.x>=width*.035&&p.x<=width*.965);}
 }
});

test('water entry lies between the elevated rod and submerged fish and uses metre coordinates',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const s=state(sceneId),pose=shoreFightPose(sceneId,s),tip=pose.visual.rodTip;
  const fx=(pose.fishWorld.x-s.player.x)/3.2,fz=(pose.fishWorld.y-s.cast.origin.y)/3.2;
  assert.ok(pose.depth>0&&tip.height>0);
  const fraction=tip.height/(tip.height+pose.depth);
  close(pose.visual.lineEntry.x,fx*fraction);
  close(pose.visual.lineEntry.z,fz*fraction);
  close((pose.entryWorld.x-s.player.x)/3.2,pose.visual.lineEntry.x);
  close((pose.entryWorld.y-s.cast.origin.y)/3.2,pose.visual.lineEntry.z);
  assert.ok(Math.hypot(pose.visual.lineEntry.x,pose.visual.lineEntry.z)<Math.hypot(fx,fz));
 }
});

test('nearshore fish and line entry remain in water and sample the reeled-in position',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const scene=getShoreScene(sceneId);
  for(const x of [760,2440,3240,scene.world.width-100])for(const offset of [-150,0,150]){
   const s=state(sceneId,{player:{x,y:scene.shoreY(x)+120},lineDistance:2.5,
    cast:{origin:{x,y:scene.shoreY(x)+102},target:{x:x+offset,y:scene.shoreY(x+offset)-224},distance:70}});
   const pose=shoreFightPose(sceneId,s);
   assert.ok(pose.fishWorld.y<scene.shoreY(pose.fishWorld.x));
   assert.ok(pose.entryWorld.y<scene.shoreY(pose.entryWorld.x));
   assert.deepEqual(pose.sample,sampleShore(scene,pose.fishWorld.x,pose.fishWorld.y,s.elapsed));
   assert.notDeepEqual(pose.sample,sampleShore(scene,s.cast.target.x,s.cast.target.y,s.elapsed),'the original cast target is not the returning fish');
   const projected=shoreSurfaceProjection(390,844,scene,s,pose.entryWorld);
   assert.ok(projected.y<844*.85,'entry cannot appear on the foreground wet-sand edge');
  }
 }
});

test('both beaches use their own sand palette while the pier has concrete and rail foreground',()=>{
 const pacifica=render('pacifica',state()),hmb=render('half-moon-bay',state('half-moon-bay'));
 assert.notEqual(pacifica.shot.sandColor,hmb.shot.sandColor);
 for(const [sceneId,result] of [['pacifica',pacifica],['half-moon-bay',hmb]]){
  const palette=getShoreScene(sceneId).palette,colors=new Set(result.canvas.calls.map(call=>call[1]));
  assert.equal(result.shot.ground,'sand');assert.equal(result.shot.sandColor,palette.sand);
  for(const color of [palette.sand,palette.wet,palette.dry,palette.deep])assert.ok(colors.has(color));
 }
 const scene=getShoreScene('pacifica'),p=scene.pier.tip;
 const pierState=state('pacifica',{onPier:true,player:{...p},cast:{origin:{...p},target:{x:p.x+70,y:p.y-192},distance:60}});
 const pier=render('pacifica',pierState),colors=new Set(pier.canvas.calls.map(call=>call[1]));
 assert.equal(pier.shot.ground,'pier');assert.ok(colors.has('#777e77'));assert.ok(colors.has('#3d5658'));
 assert.equal(colors.has(scene.palette.sand),false);
 assert.ok(shoreFightPose('pacifica',pierState).visual.rodTip.height>shoreFightPose('pacifica',state()).visual.rodTip.height);
 const hmbWithoutPier=render('half-moon-bay',state('half-moon-bay',{onPier:true}));
 assert.equal(hmbWithoutPier.shot.ground,'sand','a scene without a pier cannot invent one');
});

test('opaque surf does not expose underwater fish or add fish sprites at any fight distance',()=>{
 for(const sceneId of ['pacifica','half-moon-bay'])for(const lineDistance of [2.5,60,140]){
  const s=state(sceneId,{lineDistance,fish:{id:'halibut',weightKg:4,length:90,run:.4,stamina:.1}});
  const {canvas,shot}=render(sceneId,s);
  assert.equal(shot.surfaceFish,false);assert.equal(shot.fishVisible,false);
  assert.ok(shot.depth>0);assert.equal(canvas.calls.some(call=>call[0]==='drawImage'),false);
 }
});

test('small portrait and landscape views keep tackle anchors and line entry finite and in frame',()=>{
 for(const [width,height] of [[320,568],[390,844],[568,320],[844,390],[1280,720]])for(const sceneId of ['pacifica','half-moon-bay'])for(const onPier of (sceneId==='pacifica'?[false,true]:[false]))for(const tension of [0,1])for(const lineDistance of [2.5,140]){
  const canvas=recordingCanvas(),view=createShoreFightView(canvas,{sceneId}),s=state(sceneId,{tension,lineDistance,onPier});
  if(onPier){const p=getShoreScene(sceneId).pier.tip;s.player={...p};s.cast={origin:{...p},target:{x:p.x+70,y:p.y-192},distance:60};}
  view.resize(width,height);view.draw(s,.1,{active:true,reeling:true,reducedMotion:true});
  const shot=view.snapshot();
  for(const key of ['rodTip','reelKnob','lineEntry']){
   const p=shot[key];assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y),`${key} is finite`);
   assert.ok(p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height,`${width}x${height} ${key} remains in frame`);
  }
  for(const call of canvas.calls)for(const value of call.slice(2))if(typeof value==='number')assert.ok(Number.isFinite(value));
  assert.equal(shot.lineVisible,true);
 }
});

test('paused frames freeze surf, crank and spool, and reduced motion freezes procedural surf',()=>{
 const canvas=recordingCanvas(),view=createShoreFightView(canvas),s=state();
 view.draw(s,.1,{active:true,reeling:true});
 const before=view.snapshot();canvas.reset();view.draw(s,.1,{active:true,paused:true,reeling:true});const frozen=canvas.digest();
 canvas.reset();view.draw(s,4,{active:true,paused:true,reeling:true});assert.equal(canvas.digest(),frozen);
 close(view.snapshot().crankAngle,before.crankAngle);close(view.snapshot().spoolAngle,before.spoolAngle);
 const calm=state('pacifica',{tension:0,fish:null,lineDistance:2.5});
 const first=render('pacifica',calm).canvas.digest();
 const later=render('pacifica',{...calm,elapsed:calm.elapsed+30}).canvas.digest();
 assert.equal(first,later,'reduced motion holds the same surf artwork as gameplay time advances');
});

test('held reeling drives the crank while actual line travel independently drives the spool',()=>{
 const canvas=recordingCanvas(),view=createShoreFightView(canvas),base=state('pacifica',{elapsed:0,lineDistance:40});
 view.draw(base,0,{active:true});const start=view.snapshot();
 view.draw({...base,elapsed:.1,lineDistance:39.8},.1,{active:true,reeling:true});const winding=view.snapshot();
 assert.ok(winding.crankAngle>start.crankAngle);assert.ok(winding.spoolAngle>start.spoolAngle);
 view.draw({...base,elapsed:.2,lineDistance:40},.1,{active:true,reeling:false});const running=view.snapshot();
 close(running.crankAngle,winding.crankAngle);assert.ok(running.spoolAngle<winding.spoolAngle,'a fish taking line reverses the spool');
 view.draw({...base,elapsed:.3,lineDistance:40},.1,{active:true,reeling:false});const stopped=view.snapshot();
 close(stopped.crankAngle,running.crankAngle);close(stopped.spoolAngle,running.spoolAngle);
 view.draw({...base,elapsed:.4,lineDistance:40},.1,{active:true,reeling:true});const held=view.snapshot();
 assert.ok(held.crankAngle>stopped.crankAngle);close(held.spoolAngle,stopped.spoolAngle,'holding reel alone cannot invent line travel');
});

test('walk and explicit hiding draw nothing and re-entry never spins the spool across separate casts',()=>{
 const canvas=recordingCanvas(),view=createShoreFightView(canvas),s=state();
 view.draw(s,.1,{active:true,reeling:true});
 canvas.reset();view.draw({...s,phase:'walk',cast:null,fish:null},.1,{active:true,reeling:true});
 assert.equal(canvas.calls.length,0);assert.equal(view.snapshot().active,false);assert.equal(view.snapshot().lineVisible,false);
 const stopped=view.snapshot();view.draw({...s,lineDistance:10,elapsed:100},.1,{active:true,reeling:false});
 close(view.snapshot().spoolAngle,stopped.spoolAngle,'a new cast must not use the old cast distance delta');
 canvas.reset();view.draw(s,.1,{active:false,reeling:true});assert.equal(canvas.calls.length,0);assert.equal(view.snapshot().active,false);
});

test('landed catch stays first-person without a deployed line, including restored catches without a cast',()=>{
 for(const sceneId of ['pacifica','half-moon-bay'])for(const cast of [state(sceneId).cast,null]){
  const s=state(sceneId,{phase:'landed',cast,lineDistance:0,tension:0}),{canvas,view,shot}=render(sceneId,s);
  assert.equal(shot.active,true);assert.equal(shot.lineVisible,false);assert.equal(shot.fishVisible,false);
  const colors=new Set(canvas.calls.map(call=>call[1]));
  assert.equal(colors.has('#ece6c8'),false);assert.equal(colors.has('#b4d0bd'),false);
  view.draw({...s,elapsed:s.elapsed+1},.1,{active:true,reeling:true});
  close(view.snapshot().crankAngle,shot.crankAngle);close(view.snapshot().spoolAngle,shot.spoolAngle);
 }
});

test('spinning bail remains continuous when the hand crank wraps a full turn',()=>{
 const view=createShoreFightView(recordingCanvas()),s=state();
 for(let i=0;i<8;i++)view.draw(s,.1,{active:true,reeling:true,reducedMotion:true});
 close(view.snapshot().rotorAngle,(Math.PI*2*1.6*5.2*.8)%(Math.PI*2));
 const before=view.snapshot();view.draw({...s,elapsed:s.elapsed+.1,lineDistance:s.lineDistance+1},.1,{active:true,reeling:false});
 close(view.snapshot().rotorAngle,before.rotorAngle,'payout alone cannot wind a spinning reel bail');
 close(view.snapshot().crankAngle,before.crankAngle);
});

test('fight sampling and rendered surf honor the same explicit sea-state scenario',()=>{
 const seaState={waveHeightM:0,wavePeriodS:18,waveDirectionDeg:-25,tideM:1.2};
 const s=state('pacifica',{seaState}),pose=shoreFightPose('pacifica',s);
 assert.deepEqual(pose.sample,sampleShore('pacifica',pose.fishWorld.x,pose.fishWorld.y,s.elapsed,seaState));
 assert.equal(pose.sample.waveHeight,0);assert.equal(pose.sample.wavePeriod,18);assert.equal(pose.sample.tide,1.2);
 const calm=render('pacifica',s).canvas.digest(),rough=render('pacifica',{...s,seaState:{...seaState,waveHeightM:2}}).canvas.digest();
 assert.notEqual(calm,rough);
});

function floatState(sceneId='pacifica',overrides={}){
 return state(sceneId,{rig:'float',presentation:{mode:'float',depth:1},
  seaState:{waveHeightM:2.8,wavePeriodS:10,waveDirectionDeg:28,tideM:1.2},...overrides});
}
function surfaceExtremes(sceneId,s){
 const point=shoreFightPose(sceneId,s).entryWorld;
 let crest=null,trough=null,breaker=null;
 for(let elapsed=0;elapsed<=30;elapsed+=.25){
  const sample=sampleShore(sceneId,point.x,point.y,elapsed,s.seaState),item={elapsed,sample};
  if(!crest||sample.surfaceElevation>crest.sample.surfaceElevation)crest=item;
  if(!trough||sample.surfaceElevation<trough.sample.surfaceElevation)trough=item;
  if(!breaker||sample.activeBreaking>breaker.sample.activeBreaking)breaker=item;
 }
 return{crest,trough,breaker};
}

test('first-person line contact samples the water intersection independently of fish depth',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const s=state(sceneId),pose=shoreFightPose(sceneId,s),{shot}=render(sceneId,s,{reducedMotion:false});
  assert.deepEqual(shot.entryWorld,pose.entryWorld);
  assert.deepEqual(shot.waterContact.sample,sampleShore(sceneId,pose.entryWorld.x,pose.entryWorld.y,s.elapsed,s.seaState));
  assert.notDeepEqual(shot.waterContact.sample,pose.sample,'bottom-rig contact is nearer shore than the fish');
  assert.deepEqual(shot.linePoints.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})).at(0),shot.rodTip);
  assert.deepEqual(shot.linePoints.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})).at(-1),shot.lineEntry);
 }
});

test('float and line contact rise on local crests and fall into troughs at the coast projection scale',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const s=floatState(sceneId),{crest,trough}=surfaceExtremes(sceneId,s),shots=[];
  assert.ok(crest.sample.surfaceElevation>.05);assert.ok(trough.sample.surfaceElevation<-.05);
  for(const frame of [crest,trough]){
   const frameState={...s,elapsed:frame.elapsed},{canvas,shot}=render(sceneId,frameState,{reducedMotion:false});shots.push(shot);
   const base=shoreSurfaceProjection(canvas.width,canvas.height,sceneId,frameState,shot.entryWorld);
   const offshore=Math.max(.5,(getShoreScene(sceneId).shoreY(shot.entryWorld.x)-shot.entryWorld.y)/3.2);
   close(shot.surfacePixelsPerMetre,12*18/(18+offshore)*shot.height/canvas.height);
   close(shot.waterContact.height,frame.sample.surfaceElevation);
   close(shot.linePoints.at(-1).y,base.y*shot.height/canvas.height-shot.waterContact.height*shot.surfacePixelsPerMetre);
   close(shot.linePoints.at(-1).x,base.x*shot.width/canvas.width);
   assert.equal(shot.floatVisible,true);
  }
  assert.ok(shots[0].lineEntry.y<shots[0].waterBase.y,'crest lifts the float above its mean-water position');
  assert.ok(shots[1].lineEntry.y>shots[1].waterBase.y,'trough lowers the float below its mean-water position');
 }
});

test('a zero-wave sea has no procedural float bob, lean or breaker cover',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const s=floatState(sceneId,{seaState:{waveHeightM:0,wavePeriodS:10,waveDirectionDeg:28,tideM:1.2}});
  const first=render(sceneId,{...s,elapsed:0},{reducedMotion:false}),later=render(sceneId,{...s,elapsed:31},{reducedMotion:false});
  assert.equal(first.canvas.digest(),later.canvas.digest());assert.deepEqual(first.shot.linePoints,later.shot.linePoints);
  assert.equal(first.shot.waterContact.height,0);assert.equal(first.shot.waterContact.tilt,0);assert.equal(first.shot.foamOcclusion,0);
  assert.deepEqual(first.shot.lineEntry,first.shot.waterBase);
 }
});

test('surf flow bows the free line in its actual direction and full tension straightens it',()=>{
 const deflection=shot=>{const points=shot.linePoints,i=12,t=i/(points.length-1);return points[i].x-(points[0].x+(points.at(-1).x-points[0].x)*t);};
 for(const direction of [-40,40]){
  const s=floatState('pacifica',{tension:0,seaState:{waveHeightM:3,wavePeriodS:10,waveDirectionDeg:direction,tideM:1.2}});
  const {crest}=surfaceExtremes('pacifica',s),frame={...s,elapsed:crest.elapsed};
  const slack=render('pacifica',frame,{reducedMotion:false}).shot,taut=render('pacifica',{...frame,tension:1},{reducedMotion:false}).shot;
  assert.ok(Math.abs(slack.waterContact.flowX)>.05);
  assert.equal(Math.sign(deflection(slack)),Math.sign(slack.waterContact.flowX));
  assert.equal(Math.sign(slack.waterContact.flowX),Math.sign(direction));
  close(deflection(taut),0,'full tension removes lateral bow while contact stays attached');
  assert.ok(Math.abs(deflection(slack))>.1);
 }
});

test('active breaking foam covers the float base after its colored body is drawn',()=>{
 const s=floatState(),{breaker}=surfaceExtremes('pacifica',s),{canvas,shot}=render('pacifica',{...s,elapsed:breaker.elapsed},{reducedMotion:false});
 assert.ok(breaker.sample.activeBreaking>.05);assert.ok(shot.foamOcclusion>0);
 close(shot.waterContact.breaking,breaker.sample.activeBreaking);
 const floatBase=canvas.calls.findIndex(call=>call[0]==='fill'&&call[1]==='#c96a47');
 assert.ok(floatBase>=0);
 assert.ok(canvas.calls.slice(floatBase+1).some(call=>call[0]==='fillRect'&&call[1]===getShoreScene('pacifica').palette.foam));
});

test('float contact, foam and line shape are deterministic, paused and reduced-motion safe',()=>{
 for(const sceneId of ['pacifica','half-moon-bay']){
  const s=floatState(sceneId),canvas=recordingCanvas(),view=createShoreFightView(canvas,{sceneId});
  view.draw(s,0,{active:true,reducedMotion:false});const before=view.snapshot(),digest=canvas.digest();
  canvas.reset();view.draw(s,.1,{active:true,paused:true,reeling:true,reducedMotion:false});
  assert.equal(canvas.digest(),digest);assert.deepEqual(view.snapshot(),before);
  const frozen=render(sceneId,s),later=render(sceneId,{...s,elapsed:s.elapsed+37});
  assert.equal(frozen.canvas.digest(),later.canvas.digest());assert.deepEqual(frozen.shot.waterContact,later.shot.waterContact);
  assert.deepEqual(frozen.shot.linePoints,later.shot.linePoints);
  assert.deepEqual(frozen.shot.waterContact.sample,sampleShore(sceneId,frozen.shot.entryWorld.x,frozen.shot.entryWorld.y,0,s.seaState));
 }
});
