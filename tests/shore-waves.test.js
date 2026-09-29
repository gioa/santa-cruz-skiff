import {GAME_TIME_SCALE} from '../dist/game-clock.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {getShoreScene,shoreProfile,sampleShore,shoreWaveCrests} from '../dist/shore-data.js';

const scene=getShoreScene('pacifica'),x=2440;
const water=(offshore,time=0,sea={},at=x)=>sampleShore(scene,at,scene.shoreY(at)-offshore*3.2,time,sea);
const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);

test('authored sea state is deterministic, accepts zero height, and does not invent surf currents',()=>{
  const sea=Object.freeze({waveHeightM:0,wavePeriodS:12,tideM:.6,waveDirectionDeg:18});
  for(const at of [760,2440,3240])for(const distance of [1,20,40,100,400]){
    const sample=water(distance,91,sea,at);
    assert.equal(sample.seaStateSource,'authored');
    for(const key of ['waveHeight','localWaveHeight','orbitalVelocity','waveLoad','whitewater','breakStrength','currentX','currentY','flowX','flowY','flowSpeed','surfaceElevation','runupMeters'])close(sample[key],0);
    assert.deepEqual(sample,water(distance,91,sea,at));
    assert.deepEqual(shoreWaveCrests(scene,at,91,sea),[]);
  }
});

test('depth-limited breaking dissipates energy over the bar and preserves the sheltered trough and rip gap',()=>{
  const p=shoreProfile(scene,x),inside=water(p.troughDistance),bar=water(p.barDistance);
  const channelX=3240,channelProfile=shoreProfile(scene,channelX),channel=water(channelProfile.barDistance,0,{},channelX);
  assert.equal(inside.habitat,'trough');assert.equal(bar.habitat,'bar');assert.equal(channel.habitat,'channel');
  assert.ok(bar.breakStrength>channel.breakStrength+.5);
  assert.ok(bar.whitewater>inside.whitewater);
  assert.ok(inside.orbitalVelocity<bar.orbitalVelocity*.65,'bar dissipation is carried through into the deeper inside trough');
  assert.ok(inside.localWaveHeight<=bar.depth*.78+1e-8);
  assert.ok(Math.abs(channel.currentY)>Math.abs(bar.currentY)*5);
  assert.ok(channel.currentY<0,'channel mean flow leaves the beach');
  for(const sample of [inside,bar,channel])assert.ok(sample.localWaveHeight<=.78*sample.depth+1e-9);
});

test('wave dispersion and bottom orbital motion use depth and period rather than an independent animation sine',()=>{
  for(const period of [5,9,16,24])for(const distance of [3,30,90,300,1200]){
    const s=water(distance,23,{waveHeightM:1.1,wavePeriodS:period,tideM:.8});
    const omega=2*Math.PI/period,k=s.waveNumber;
    close(9.81*k*Math.tanh(k*s.depth),omega*omega,1e-9);
    close(s.orbitalVelocity,s.localWaveHeight*omega/(2*Math.sinh(k*s.depth)),1e-9);
    close(Math.hypot(s.waveVelocityX,s.waveVelocityY),s.orbitalVelocity*Math.abs(Math.cos(s.wavePhase)),1e-9);
    close(s.flowX,s.currentX+s.waveVelocityX);close(s.flowY,s.currentY+s.waveVelocityY);
    assert.ok(s.waveLoad>=0&&s.waveLoad<=1);
  }
  const short=water(300,0,{wavePeriodS:5,tideM:.8}),long=water(300,0,{wavePeriodS:18,tideM:.8});
  assert.ok(long.orbitalVelocity/long.localWaveHeight>short.orbitalVelocity/short.localWaveHeight*3,'long-period swell reaches the bed more strongly');
});

test('the same crest roots advance shoreward with the configured period and phase',()=>{
  const sea={waveHeightM:1.2,wavePeriodS:13,tideM:.7,waveDirectionDeg:14},time=28;
  const first=shoreWaveCrests(scene,x,time,sea,300),later=shoreWaveCrests(scene,x,time+1,sea,300);
  assert.ok(first.length>2);
  for(const distance of first){
    const s=water(distance,time,sea),cycle=Math.round(s.wavePhase/(2*Math.PI));
    assert.ok(Math.cos(s.wavePhase)>.999999);
    close(water(distance,time+sea.wavePeriodS,sea).wavePhase-s.wavePhase,2*Math.PI,1e-9);
    if(distance>80){const slack=water(distance,time+sea.wavePeriodS/4,sea);assert.ok(s.waveLoad>slack.waveLoad+.01,'crest drag exceeds the intervening orbital slack');}
    const next=later.find(d=>Math.round(water(d,time+1,sea).wavePhase/(2*Math.PI))===cycle);
    if(next!==undefined)assert.ok(next<distance,'positive time propagates this crest toward shore');
  }
});

test('sets, period, direction and tide affect physically connected outputs',()=>{
  const sea={waveHeightM:1.5,wavePeriodS:12,tideM:.6,waveDirectionDeg:0};
  const sets=Array.from({length:180},(_,time)=>water(100,time,sea).setFactor);
  assert.ok(Math.max(...sets)-Math.min(...sets)>.5);
  const p=shoreProfile(scene,x),low=water(p.barDistance,0,{...sea,tideM:.1}),high=water(p.barDistance,0,{...sea,tideM:2});
  close(high.depth-low.depth,1.9);
  assert.ok(low.breakStrength>high.breakStrength);
  assert.ok(Math.abs(low.currentY)>Math.abs(high.currentY),'submerging a bar reduces setup-driven surf circulation');
  const right=water(50,0,{...sea,waveDirectionDeg:25}),left=water(50,0,{...sea,waveDirectionDeg:-25});
  assert.ok(right.currentX>0&&left.currentX<0);
  const calm=water(90,0,{...sea,waveHeightM:.2}),rough=water(90,0,{...sea,waveHeightM:2});
  assert.ok(rough.waveLoad>calm.waveLoad);assert.ok(rough.turbidity>calm.turbidity);
  // Tide follows the shared 10× game clock: one 12.42 h cycle is 4471.2 active seconds.
  const start=shoreProfile(scene,x,0),cycle=shoreProfile(scene,x,44712/GAME_TIME_SCALE),half=shoreProfile(scene,x,22356/GAME_TIME_SCALE);
  close(start.tide,cycle.tide);close((start.tide+half.tide)/2,.65);
});

test('all public wave outputs stay finite for malformed scenarios and extreme coordinates',()=>{
  const scenarios=[null,{}, {waveHeightM:NaN,wavePeriodS:0,tideM:Infinity,waveDirectionDeg:NaN},
    {waveHeightM:1000,wavePeriodS:Infinity,tideM:-1000,waveDirectionDeg:-1000}];
  for(const id of ['pacifica','half-moon-bay'])for(const sea of scenarios)for(const value of [NaN,Infinity,-1e300,1e300,0]){
    const result=sampleShore(id,value,value,value,sea);
    for(const [key,number] of Object.entries(result))if(typeof number==='number')assert.ok(Number.isFinite(number),`${key} is finite`);
    assert.ok(result.waveLoad>=0&&result.waveLoad<=1);assert.ok(result.turbidity>=0&&result.turbidity<=1);
    for(const crest of shoreWaveCrests(id,value,value,sea))assert.ok(Number.isFinite(crest));
  }
});
