import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFightView,fightViewGeometry,fightFishProjection} from '../dist/pixel-fight-view.js';

const state=(overrides={})=>({fishState:'fight',fish:{length:30,latin:'Sebastes melanops'},rodMount:'hand',rodElevation:45,rodAzimuth:70,rodBend:.45,rodLoadN:12,paidLineMeters:18,lureDepth:12,lineSlackMeters:0,rig:'bottom',reelMode:'brake',crankRate:0,heading:0,rodTip:{x:2,z:0,height:1.8},lineEntry:{x:2.3,z:-1},...overrides});

test('rear grip stays behind the reel seat and boat occupies only the lower edge',()=>{
 for(const [w,h] of [[320,568],[390,844],[844,390]])for(const elevation of[5,45,85]){
  const g=fightViewGeometry(w,h,state({rodElevation:elevation}),{bottomInset:180});
  assert.ok((g.reelSeat.x-g.grip.x)*(g.base.x-g.butt.x)+(g.reelSeat.y-g.grip.y)*(g.base.y-g.butt.y)>0,'support hand stays behind the reel seat along the rod axis, including low sideways poses');
  assert.ok(g.railY>=h*.84,'low gunwale matches the approved close view');
  assert.ok(Math.hypot(g.grip.x-g.butt.x,g.grip.y-g.butt.y)<Math.hypot(g.base.x-g.butt.x,g.base.y-g.butt.y));
  assert.ok(g.knob.x<w&&g.knob.y<h);
 }
});
function recordingCanvas(){
 let calls=[];const context={fillStyle:'',imageSmoothingEnabled:true};
 for(const name of['fillRect','beginPath','moveTo','lineTo','closePath','fill','save','restore','drawImage'])context[name]=(...args)=>calls.push([name,context.fillStyle,...args]);
 return{width:0,height:0,getContext:()=>context,reset(){calls=[];},digest(){return createHash('sha256').update(JSON.stringify(calls)).digest('hex');},get count(){return calls.length;},get calls(){return calls;}};
}

function fishAsset(){
 const width=48,height=24,data=new Uint8ClampedArray(width*height*4);
 for(let y=8;y<16;y++)for(let x=4;x<44;x++)data[(y*width+x)*4+3]=255;
 return{width,height,getContext:()=>({getImageData:()=>({data})})};
}

test('first-person rod stays within the view at every control limit and mount',()=>{
 for(const [width,height,bottomInset] of [[390,844,180],[320,568,180],[568,320,120],[1280,720,120]]){
  for(const rodMount of['hand','port','starboard'])for(const rodElevation of[5,45,85])for(const rodAzimuth of[-110,0,110])for(const rodBend of[0,.5,1]){
   const g=fightViewGeometry(width,height,state({rodMount,rodElevation,rodAzimuth,rodBend}),{bottomInset});
   for(const p of [...g.points,...g.line]){
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    assert.ok(p.x>=width*.06&&p.x<=width*.94,`${rodMount} ${rodElevation} ${rodAzimuth} ${rodBend} tip stays in frame`);
    assert.ok(p.y>=0&&p.y<height);
   }
   assert.strictEqual(g.line[0],g.tip,'line starts at shared rod tip');
   assert.strictEqual(g.line.at(-1),g.waterEntry,'line ends at shared surface entry');
  }
 }
});

test('loaded rod bends from its fixed grip and its pose follows both control axes',()=>{
 const neutral=fightViewGeometry(390,844,state({rodBend:0}),{bottomInset:180});
 const loaded=fightViewGeometry(390,844,state({rodBend:1}),{bottomInset:180});
 assert.deepEqual(neutral.base,loaded.base);assert.ok(loaded.tip.y>neutral.tip.y+40);
 const high=fightViewGeometry(390,844,state({rodElevation:85}),{bottomInset:180});
 const low=fightViewGeometry(390,844,state({rodElevation:5}),{bottomInset:180});
 assert.ok(high.tip.y<low.tip.y);
 const left=fightViewGeometry(390,844,state({rodAzimuth:-110}));
 const right=fightViewGeometry(390,844,state({rodAzimuth:110}));
 assert.ok(left.tip.x<left.base.x);assert.ok(right.tip.x>right.base.x);
 const port=fightViewGeometry(390,844,state({rodMount:'port',rodAzimuth:-100}));
 const starboard=fightViewGeometry(390,844,state({rodMount:'starboard',rodAzimuth:100}));
 assert.ok(port.mounted&&starboard.mounted);assert.ok(port.base.x<starboard.base.x);
});

test('water entry respects actual line displacement without inventing surface fish or floats',()=>{
 const base=fightViewGeometry(390,844,state());
 const displaced=fightViewGeometry(390,844,state({lineEntry:{x:4.3,z:-4}}));
 assert.ok(displaced.waterEntry.x>base.waterEntry.x);assert.ok(displaced.waterEntry.y<base.waterEntry.y);
 for(const rig of ['bottom','dropper','slider','jig','sabiki'])assert.equal(fightViewGeometry(390,844,state({rig,floatPosition:{x:1,z:1}})).showFloat,false);
 assert.equal(fightViewGeometry(390,844,state({rig:'float'})).showFloat,false);
 assert.equal(fightViewGeometry(390,844,state({rig:'float',floatPosition:{x:1,z:1}})).showFloat,true);
 assert.equal(base.surfaceFish,false);
 assert.equal(fightViewGeometry(390,844,state({lureDepth:.7,paidLineMeters:5})).surfaceFish,true);
 assert.equal(fightViewGeometry(390,844,state({lureDepth:12,paidLineMeters:5})).surfaceFish,false);
 assert.equal(fightViewGeometry(390,844,state({fishState:'landed',lureDepth:0,paidLineMeters:1})).lineVisible,false);
});

test('first-person rendering never changes gameplay and actual crank rotates the visible reel',()=>{
 const canvas=recordingCanvas(),view=createFightView(canvas),s=state({crankRate:2});
 Object.freeze(s.rodTip);Object.freeze(s.lineEntry);Object.freeze(s);
 const before=JSON.stringify(s);view.resize(390,844);view.draw(s,.1,{active:true,bottomInset:180});
 assert.equal(JSON.stringify(s),before);assert.ok(canvas.count>200);
 assert.ok(Math.abs(view.snapshot().crankAngle-Math.PI*.4)<1e-10);
 const stopped=state();view.draw(stopped,.1,{active:true,bottomInset:180});
 assert.ok(Math.abs(view.snapshot().crankAngle-Math.PI*.4)<1e-10);
});

test('pause freezes artwork and reduced motion stops all procedural movement',()=>{
 const canvas=recordingCanvas(),view=createFightView(canvas),s=state({crankRate:2});
 view.resize(320,568);canvas.reset();view.draw(s,.08,{active:true,paused:true,bottomInset:180});const paused=canvas.digest();
 canvas.reset();view.draw(s,.1,{active:true,paused:true,bottomInset:180});assert.equal(canvas.digest(),paused);assert.equal(view.snapshot().crankAngle,0);
 const still=state();canvas.reset();view.draw(still,.1,{active:true,reducedMotion:true,bottomInset:180});const reduced=canvas.digest();
 canvas.reset();view.draw(still,.1,{active:true,reducedMotion:true,bottomInset:180});assert.equal(canvas.digest(),reduced);
 canvas.reset();view.draw(s,.1,{active:false});assert.equal(canvas.count,0);assert.equal(view.snapshot().active,false);
});

test('actual payout spins the visible spool independently from the crank and pause freezes both',()=>{
 const canvas=recordingCanvas(),view=createFightView(canvas),running=state({crankRate:1,payoutRate:1.4,retrieveRate:.2});
 view.draw(running,.02,{active:true,reducedMotion:true});
 const moving=view.snapshot();assert.ok(moving.crankAngle>0);assert.ok(moving.spoolAngle<0,'a fish taking line back-drives the spool, not the handle');
 view.draw(running,.1,{active:true,paused:true,reducedMotion:true});
 assert.equal(view.snapshot().spoolAngle,moving.spoolAngle);assert.equal(view.snapshot().crankAngle,moving.crankAngle);
 view.draw(state({crankRate:0,payoutRate:0,retrieveRate:0}),.1,{active:true,reducedMotion:true});
 assert.equal(view.snapshot().spoolAngle,moving.spoolAngle,'no line travel means no spool movement');
});

test('surface disturbance follows actual fish motion and never reads a stamina score',()=>{
 const render=s=>{const canvas=recordingCanvas(),view=createFightView(canvas);view.draw(s,0,{active:true,reducedMotion:true});return canvas.digest();};
 const surface=state({lureDepth:.5,paidLineMeters:3,fishMotion:{headShake:.9,lateralMps:.6}});
 assert.equal(render({...surface,stamina:0}),render({...surface,stamina:100}));
 assert.notEqual(render(surface),render({...surface,fishMotion:{headShake:0,lateralMps:0}}));
 const deep={...surface,lureDepth:20,paidLineMeters:25};
 assert.equal(render(deep),render({...deep,fishMotion:{headShake:0,lateralMps:0}}),'a submerged fish cannot splash above itself');
});

test('surface fish scale is proportional to actual centimetres and camera distance',()=>{
 const atSurface=state({lureDepth:.2,paidLineMeters:4,boatX:0,boatZ:0,bobber:{x:0,z:2}});
 const small=fightFishProjection(390,{...atSurface,fish:{length:20}}),large=fightFishProjection(390,{...atSurface,fish:{length:80}});
 assert.equal(large.lengthPixels/small.lengthPixels,4,'a four-times longer fish occupies four-times the visible length');
 const distant=fightFishProjection(390,{...atSurface,bobber:{x:0,z:6}});
 const near=fightFishProjection(390,atSurface);
 assert.ok(distant.lengthPixels<near.lengthPixels);
 assert.ok(Math.abs(distant.lengthPixels/near.lengthPixels-near.distanceMeters/distant.distanceMeters)<1e-12);
 const wider=fightFishProjection(780,atSurface);assert.equal(wider.lengthPixels,near.lengthPixels*2);
 const tiny=fightFishProjection(390,{...atSurface,fish:{length:.01}});assert.ok(tiny.lengthPixels<1,'no minimum icon size inflates small fish');
 const huge=fightFishProjection(390,{...atSurface,fish:{length:500}});assert.ok(huge.lengthPixels>390,'large fish are not shrunk to fit a slot');
 for(const changes of[{fish:null},{fish:{length:0}},{lureDepth:2},{paidLineMeters:10},{fishState:'waiting'},{fishState:'landed'}])assert.equal(fightFishProjection(390,{...atSurface,...changes}),null);
});

test('surface artwork crops transparent padding, retains species proportions and meets the line at its head',()=>{
 const asset=fishAsset(),canvas=recordingCanvas(),view=createFightView(canvas,{sprites:{fish:{rockfish:asset}}});
 const s=state({lureDepth:.3,paidLineMeters:4});view.resize(390,844);view.draw(s,0,{active:true,reducedMotion:true,bottomInset:180});
 const draw=canvas.calls.find(call=>call[0]==='drawImage');assert.ok(draw,'actual near-surface fish uses its species sprite');
 const [, ,image,sx,sy,sw,sh,dx,dy,dw,dh]=draw;assert.strictEqual(image,asset);
 assert.deepEqual([sx,sy,sw,sh],[4,8,40,8],'transparent sprite margins do not change nose-to-tail length');
 assert.equal(dh/dw,8/40,'source species aspect ratio survives projection');
 const g=fightViewGeometry(canvas.width,canvas.height,s,{bottomInset:180*canvas.height/844});
 assert.ok(Math.abs(dx+dw-g.waterEntry.x)<1e-9);assert.ok(Math.abs(dy+dh*.5-g.waterEntry.y)<1e-9);
 const shot=view.snapshot();assert.equal(shot.fishVisible,true);assert.equal(shot.fishLengthCm,30);
 assert.ok(Math.abs(shot.fishLengthPixels-fightFishProjection(390,s).lengthPixels)<1e-9);
 canvas.reset();view.draw({...s,lureDepth:20},0,{active:true,reducedMotion:true});assert.ok(!canvas.calls.some(call=>call[0]==='drawImage'));assert.equal(view.snapshot().fishVisible,false);
 canvas.reset();view.draw(s,0,{active:false});assert.equal(view.snapshot().fishVisible,false);
});


test('close tackle matches the approved portrait scale and crank hit target tracks the visible handle',()=>{
 for(const [w,h] of [[320,568],[390,844],[844,390]]){
  const canvas=recordingCanvas(),view=createFightView(canvas);view.resize(w,h);view.draw(state(),0,{active:true});
  const shot=view.snapshot(),distance=Math.hypot(shot.reelKnob.x-shot.reelCenter.x,shot.reelKnob.y-shot.reelCenter.y);
  assert.ok(distance<shot.reelTouchRadius);
  if(w<h)assert.ok(shot.rearGrip.y>shot.reelCenter.y);
  if(w<h){assert.ok(shot.rearGrip.y>h*.83&&shot.rearGrip.y<h*.96);assert.ok(shot.reelTouchRadius>w*.16);}
 }
});


test('handle, reel seat and lower blank share one straight axis at every pose and load',()=>{
 for(const [w,h] of [[320,568],[390,844],[844,390]])for(const rodMount of ['hand','port','starboard'])for(const rodElevation of [5,45,85])for(const rodAzimuth of [-110,0,70,110])for(const rodBend of [0,.5,1]){
  const g=fightViewGeometry(w,h,state({rodMount,rodElevation,rodAzimuth,rodBend,rodTipMotion:{x:4,y:-6}}));
  const dx=g.base.x-g.butt.x,dy=g.base.y-g.butt.y,length=Math.hypot(dx,dy);
  for(const p of [g.grip,...g.points.slice(0,4)]){
   const perpendicular=Math.abs(dx*(p.y-g.butt.y)-dy*(p.x-g.butt.x))/length;
   assert.ok(perpendicular<1e-8,`${w}x${h} ${rodElevation}/${rodAzimuth}: handle-to-blank has no corner`);
  }
 }
});
