import {GAME_TIME_SCALE} from '../dist/game-clock.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {getShoreScene,shoreProfile,sampleShore,shoreWaveCrests,shoreSurfField} from '../dist/shore-data.js';
import {crestFactor,CREST_SECTION_M} from '../dist/shore-surf.js';

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
  // A typical winter swell at the SF Bar buoy (NDBC 46237 January median ≈ 2.1 m, 14 s).
  const sea={waveHeightM:2.1,wavePeriodS:14,tideM:.6,waveDirectionDeg:0};
  const p=shoreProfile(scene,x,0,sea),inside=water(p.troughDistance,0,sea),bar=water(p.barDistance,0,sea);
  const channelX=3240,channelProfile=shoreProfile(scene,channelX,0,sea),channel=water(channelProfile.barDistance,0,sea,channelX);
  assert.equal(inside.habitat,'trough');assert.equal(bar.habitat,'bar');assert.equal(channel.habitat,'channel');
  assert.ok(bar.breakStrength>channel.breakStrength+.25,'waves break on the bar, not in the deeper rip gap');
  assert.ok(bar.meanWhitewater>inside.meanWhitewater,'the deeper trough is calmer than the bar');
  assert.ok(channel.currentY<bar.currentY&&channel.currentY<-.1,'a rip jet leaves the beach through the gap');
  // Depth-limited: broken waves never exceed the (slope-dependent) breaker index.
  for(const sample of [inside,bar,channel])assert.ok(sample.localWaveHeight<=1.15*sample.depth+1e-9);
});

test('wave dispersion and bottom orbital motion use depth and period rather than an independent animation sine',()=>{
  for(const period of [5,9,16,24])for(const distance of [3,30,90,300,1200]){
    const s=water(distance,23,{waveHeightM:1.1,wavePeriodS:period,tideM:.8});
    const omega=2*Math.PI/period,k=s.waveNumber;
    // Wave numbers are memoised on a 1 cm depth grid: dispersion holds to 0.1%.
    assert.ok(Math.abs(9.81*k*Math.tanh(k*s.depth)/(omega*omega)-1)<1e-3);
    close(s.orbitalVelocity,s.localWaveHeight*omega/(2*Math.sinh(k*s.depth))*(1+.5*s.breakStrength),1e-9);
    close(Math.hypot(s.waveVelocityX,s.waveVelocityY),s.orbitalVelocity*Math.abs(Math.cos(s.wavePhase)),1e-9);
    close(s.flowX,s.currentX+s.waveVelocityX);close(s.flowY,s.currentY+s.waveVelocityY);
    assert.ok(s.waveLoad>=0&&s.waveLoad<=1);
  }
  // In ~28 m of water a 5 s wave barely stirs the bed while an 18 s swell does.
  const short=water(1200,0,{wavePeriodS:5,tideM:.8}),long=water(1200,0,{wavePeriodS:18,tideM:.8});
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
  // Individual waves differ (Rayleigh heights grouped into sets).
  const heights=Array.from({length:240},(_,time)=>water(100,time,sea).crestHeight);
  assert.ok(Math.max(...heights)>2*Math.min(...heights.filter(h=>h>0)));
  const p=shoreProfile(scene,x),low=water(p.barDistance,0,{...sea,tideM:.1}),high=water(p.barDistance,0,{...sea,tideM:2});
  close(high.depth-low.depth,1.9,1e-6);
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

test('waves are short-crested: one wave breaks at different distances along its crest, without single-column flicker',()=>{
  let sum=0,n=0;for(let i=0;i<400;i++)for(let a=0;a<2000;a+=37){sum+=crestFactor(i,a);n++;}
  close(sum/n,1,.02);
  const along=[0,.25,.5].map(k=>crestFactor(12,1000+k*CREST_SECTION_M));
  assert.ok(Math.max(...along)-Math.min(...along)>.02,'height changes along a crest');
  const sea={waveHeightM:2.4,wavePeriodS:14,waveDirectionDeg:0},outer=new Set(),rows=[];
  for(let at=2000;at<3600;at+=8){const f=shoreSurfField(scene,at,400,sea);outer.add(f.foamReach);const r=[];for(let d=10;d<200;d+=5)r.push(f.foamAt(d));rows.push(r);}
  assert.ok(outer.size>3,'the outermost break moves along the beach');
  // A visible artifact is a narrow block: one column unlike both neighbours
  // over 15 m or more of cross-shore distance (not a break point 1 m further in).
  let blocks=0;
  for(let i=1;i<rows.length-1;i++){let run=0,longest=0;
    rows[i].forEach((v,k)=>{const odd=Math.abs(v-(rows[i-1][k]+rows[i+1][k])/2)>.3&&Math.sign(v-rows[i-1][k])===Math.sign(v-rows[i+1][k]);run=odd?run+1:0;longest=Math.max(longest,run);});
    if(longest>=3)blocks++;}
  assert.ok(blocks<=1,`${blocks} single-column foam blocks`);
});

test('whitewater reaches the real waterline at every tide, and dry sand gets none',()=>{
  const cases=[['pacifica',2440,1.6,[.1,.65,1.25]],['half-moon-bay',3000,2.6,[.65,1.25]]];
  for(const [id,at,hs,tides] of cases)for(const tideM of tides){
    const sea={waveHeightM:hs,wavePeriodS:13,waveDirectionDeg:0,tideM},beach=getShoreScene(id);
    let inner=0,dry=0,n=0;
    for(let t=300;t<420;t+=3){const f=shoreSurfField(beach,at,t,sea),wl=-f.waterlineMeters;
      // Mean foam over the 6 m of water next to the waterline, and on the sand above it.
      for(let d=wl+.5;d<wl+6;d+=1)inner+=f.foamAt(d)/6;dry+=f.foamAt(wl-3);n++;}
    assert.ok(inner/n>.35,`${id} tide ${tideM}: foam at the waterline ${(inner/n).toFixed(2)}`);
    assert.equal(dry,0,`${id} tide ${tideM}: no foam on dry sand`);
  }
  // At low tide Half Moon Bay's bar is ~0.5 m deep: waves dump on it and only
  // small re-formed waves reach a sheltered runnel, so the inner foam is light.
  const low=shoreSurfField(getShoreScene('half-moon-bay'),3000,300,{waveHeightM:2.6,wavePeriodS:13,waveDirectionDeg:0,tideM:.1});
  assert.ok(low.foamReach>70,'the break has moved out to the bar');
});
