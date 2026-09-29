import test from 'node:test';
import assert from 'node:assert/strict';
import {createPacificaMenus} from '../dist/pacifica-menus.js';
import {createPacificaWorld} from '../dist/pacifica-world.js';
import {shoreFightPose,createShoreFightView} from '../dist/shore-fight-view.js';
import {getShoreScene} from '../dist/shore-data.js';

function canvas(){
  const calls=[],attrs={};
  const ctx=new Proxy({fillStyle:'',fillRect(...args){calls.push(['fillRect',this.fillStyle,...args]);},drawImage(...args){calls.push(['drawImage',...args]);}},{get:(value,key)=>key in value?value[key]:()=>{}});
  return{width:900,height:600,parentElement:{clientWidth:280},style:{},calls,attrs,getContext:()=>ctx,
    setAttribute:(key,value)=>attrs[key]=value,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})};
}
function state(overrides={}){
  const scene=getShoreScene('pacifica'),x=2440,shore=scene.shoreY(x);
  return{phase:'fighting',elapsed:3,player:{x,y:shore+25},rig:'float',presentation:{mode:'float',depth:1},
    cast:{origin:{x,y:shore+7},target:{x,y:shore-192},distance:62.2,fightDistance:62.2},lineDistance:62.2,tension:.4,...overrides};
}

test('float fight view keeps the hook in its simulated upper-water layer and draws the float at the line entry',()=>{
  const s=state(),before=JSON.stringify(s),pose=shoreFightPose('pacifica',s),surface=pose.visual.lineEntry;
  assert.ok(pose.sample.depth>1);
  assert.equal(pose.depth,1);
  assert.equal(pose.visual.rig,'float');
  assert.equal(surface.z,(pose.fishWorld.y-s.cast.origin.y)/3.2);
  const art=canvas(),view=createShoreFightView(art);view.draw(s,0,{active:true});
  assert.equal(view.snapshot().floatVisible,true);
  assert.ok(art.calls.some(call=>call[1]==='#e26e50'),'visible float tip is rendered');
  assert.equal(JSON.stringify(s),before);
  const landed={...s,phase:'landed'};art.calls.length=0;view.draw(landed,0,{active:true});
  assert.equal(view.snapshot().floatVisible,false);
  assert.equal(art.calls.some(call=>call[1]==='#e26e50'),false);
});

test('returning float hook is limited by the shallow water and bottom rigs retain bottom presentation',()=>{
  const near=state({lineDistance:1}),nearPose=shoreFightPose('pacifica',near);
  assert.equal(nearPose.depth,Math.max(.05,Math.min(1,nearPose.sample.depth*.75)));
  const bottom=state({rig:'carolina',presentation:{depth:1}}),pose=shoreFightPose('pacifica',bottom),art=canvas(),view=createShoreFightView(art);
  assert.equal(pose.visual.rig,'bottom');
  assert.equal(pose.depth,Math.max(.05,pose.sample.depth*.72));
  view.draw(bottom,0,{active:true});
  assert.equal(view.snapshot().floatVisible,false);
  assert.equal(art.calls.some(call=>call[1]==='#e26e50'),false);
});

test('overhead waiting and bite views connect a float and dip its tip at the bite',()=>{
  globalThis.document={createElement:canvas};
  const art=canvas(),world=createPacificaWorld(art),s=state({phase:'waiting',elapsed:0});
  world.resize(900,600);world.draw(s,0);
  const tip=art.calls.find(call=>call[1]==='#e26e50');assert.ok(tip);
  art.calls.length=0;world.draw({...s,phase:'bite'},0);
  const dippedTip=art.calls.find(call=>call[1]==='#e26e50');assert.ok(dippedTip);
  assert.equal(dippedTip[2],tip[2]);assert.equal(dippedTip[3],tip[3]+2);
  art.calls.length=0;world.draw({...s,rig:'carolina',presentation:{mode:'bottom'}},0);
  assert.equal(art.calls.some(call=>call[1]==='#e26e50'),false);
});

test('both new fish have distinct catch and journal portraits without the generic unknown sprite',()=>{
  const portraits=[];
  for(const [id,name] of [['white_croaker','白石首鱼'],['jacksmelt','加州似银汉鱼']]){
    const art=canvas(),thumbnail=canvas(),elements={'catch-art':art,'journal-fish-0':thumbnail,'catch-keep':{},'catch-release':{}};
    globalThis.document={getElementById:id=>elements[id]||null,createElement:canvas};
    const fish={id,name,nameEn:id,weightKg:.3,value:4};
    const sim={state:{phase:'landed',fish,catches:[fish],credits:0,stats:{casts:1,caught:1,released:0,sold:0},fightElapsed:5}};
    const menus=createPacificaMenus({sim,scene:getShoreScene('pacifica'),openDialog(){},closeDialog(){},feedback(){}});
    menus.openCatch();menus.openJournal();
    for(const image of [art,thumbnail]){
      assert.ok(image.calls.length>15);
      assert.equal(image.calls.some(call=>call[0]==='drawImage'),false,'a new species is not painted with the unknown sprite');
      assert.match(image.attrs['aria-label'],new RegExp(name));
    }
    portraits.push(art.calls);
  }
  assert.notDeepEqual(portraits[0],portraits[1],'croaker body and slender smelt cannot share one silhouette');
});
