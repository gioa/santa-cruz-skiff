import test from 'node:test';
import assert from 'node:assert/strict';
import {shorePresentation,stepShorePresentation,shoreBaitLoad,SHORE_RIG_PHYSICS} from '../dist/shore-presentation.js';

const calm={depth:2,currentX:0,currentY:0,orbitalVelocity:0,waveVelocityX:0,waveVelocityY:0};
const rough={...calm,currentX:.25,currentY:-.3,orbitalVelocity:1.8,waveVelocityX:.1,waveVelocityY:.8};
test('tackle must sink to the local bed before a bottom presentation is effective',()=>{
  let p=shorePresentation(calm,'carolina_rig');
  assert.equal(p.bottomContact,0);
  p=stepShorePresentation(p,calm,'carolina_rig',1);
  assert.ok(p.depth>0&&p.depth<calm.depth);assert.equal(p.bottomContact,0);
  for(let i=0;i<20;i++)p=stepShorePresentation(p,calm,'carolina_rig',.5);
  assert.equal(p.depth,calm.depth);assert.equal(p.bottomContact,1);
  assert.equal(p.mode,'bottom');assert.equal(p.targetDepth,calm.depth);
});
test('single-hook float settles only to its leader length and stays off shallow and deep bottoms',()=>{
  for(const waterDepth of [.4,2,8]){
    const sample={...calm,depth:waterDepth},target=Math.min(1,waterDepth*.75);
    let p=shorePresentation(sample,'float_rig');
    assert.equal(p.mode,'float');assert.equal(p.depth,0);assert.equal(p.targetDepth,target);
    p=stepShorePresentation(p,sample,'float_rig',.5);
    assert.ok(p.depth>0&&p.depth<target);
    for(let i=0;i<100;i++)p=stepShorePresentation(p,sample,'float_rig',.5);
    assert.equal(p.depth,target);assert.equal(p.bottomContact,0);assert.ok(p.depth<waterDepth);
    const shallower=stepShorePresentation(p,{...sample,depth:.2},'float_rig',1);
    assert.equal(shallower.depth,.2*.75);assert.equal(shallower.bottomContact,0);
  }
});
test('float drifts with current and wave direction while breaking surf lowers stability',()=>{
  const steady={...calm,currentX:.3,currentY:-.2};
  const float=shorePresentation(steady,'float_rig',1),bottom=shorePresentation(steady,'carolina_rig',2);
  assert.equal(float.driftX,.3);assert.equal(float.driftY,-.2);
  assert.ok(Math.abs(float.driftX)>Math.abs(bottom.driftX));assert.ok(float.stability>.95);
  const turbulent=shorePresentation(rough,'float_rig',1);
  assert.ok(turbulent.stability<float.stability*.3);assert.equal(turbulent.bottomContact,0);
  const incoming=shorePresentation({...rough,currentY:0,waveVelocityY:1},'float_rig',1);
  const outgoing=shorePresentation({...rough,currentY:0,waveVelocityY:-1},'float_rig',1);
  assert.equal(incoming.driftY,-outgoing.driftY);
});
test('floating small hooks trim fish and squid portions without changing bottom-rig bait load',()=>{
  assert.equal(SHORE_RIG_PHYSICS.float_rig.sinkerGrams+SHORE_RIG_PHYSICS.float_rig.floatGrams,14);
  for(const [kind,grams] of [['sandcrab',4],['squid',7],['anchovy',10]]){
    for(const rig of ['carolina_rig','fishfinder_rig']){
      const bait=shoreBaitLoad(rig,kind);assert.equal(bait.grams,grams);assert.equal(bait.portion,1);
    }
    if(kind==='sandcrab')continue;
    const small=shoreBaitLoad('float_rig',kind),full=shoreBaitLoad('carolina_rig',kind);
    assert.equal(small.grams,2.5);assert.ok(small.dragArea<full.dragArea);assert.ok(small.portion<1);
  }
});
test('heavier rig settles faster and holds stronger surf, but calm water moves neither rig',()=>{
  const light=shorePresentation(rough,'carolina_rig',2),heavy=shorePresentation(rough,'fishfinder_rig',2);
  assert.ok(heavy.sinkSpeed>light.sinkSpeed);
  assert.ok(heavy.stability>light.stability);assert.ok(heavy.bottomContact>light.bottomContact);
  assert.ok(Math.abs(heavy.driftY)<Math.abs(light.driftY));
  for(const id of ['carolina_rig','fishfinder_rig']){
    const p=shorePresentation(calm,id,2);assert.equal(p.driftX,0);assert.equal(p.driftY,0);assert.equal(p.stability,1);
  }
});
test('a deeper drifting target requires settling again and waves move tackle both ways',()=>{
  const p=shorePresentation(calm,'carolina_rig',2);
  const dropped=stepShorePresentation(p,{...calm,depth:4},'carolina_rig',.1);
  assert.equal(dropped.bottomContact,0);assert.ok(dropped.depth<4);
  const a=shorePresentation({...rough,currentY:0,waveVelocityY:1},'carolina_rig',2);
  const b=shorePresentation({...rough,currentY:0,waveVelocityY:-1},'carolina_rig',2);
  assert.equal(a.driftY,-b.driftY);
});
