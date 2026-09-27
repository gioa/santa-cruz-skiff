import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFightView,fightViewGeometry} from '../dist/pixel-fight-view.js';

const state=(overrides={})=>({fishState:'fight',rodMount:'hand',rodElevation:45,rodAzimuth:70,rodBend:.45,rodLoadN:12,paidLineMeters:18,lureDepth:12,lineSlackMeters:0,rig:'bottom',reelMode:'brake',crankRate:0,heading:0,rodTip:{x:2,z:0,height:1.8},lineEntry:{x:2.3,z:-1},...overrides});
function recordingCanvas(){
 let calls=[];const context={fillStyle:'',imageSmoothingEnabled:true};
 for(const name of['fillRect','beginPath','moveTo','lineTo','closePath','fill'])context[name]=(...args)=>calls.push([name,context.fillStyle,...args]);
 return{width:0,height:0,getContext:()=>context,reset(){calls=[];},digest(){return createHash('sha256').update(JSON.stringify(calls)).digest('hex');},get count(){return calls.length;}};
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
