// Local-only test fixture; removed from production module before commit.
start(false);
if(new URLSearchParams(location.search).get('fixture')==='cast'){
 sim.randomWeather=false;sim.conditions={windKnots:0,waveHeight:0,currentX:0,currentZ:0};
 const {syncVessel}=await import('./vessel-physics.js?v=20260928-pixel-v76');
 const qs=sim.state;Object.assign(qs,{mode:'boat',boatX:1300,boatZ:-320,heading:0,launchStage:'afloat',rentalPaid:true,moored:false,loaded:true,rodMount:'hand',rodElevation:45,paused:false,fishState:'idle',throttle:0});syncVessel(sim.vessel,{x:1300,z:-320,heading:0,clearMotion:true});world.setConditions(sim.conditions);updateUI();
 const info=document.createElement('pre');info.id='qa-result';info.style='position:fixed;top:150px;left:8px;right:8px;z-index:90;pointer-events:none;background:#fff1d5e8;font:11px monospace;padding:6px;white-space:pre-wrap';info.textContent='QA: tap distant water';document.body.append(info);
 let requested,expected;const cast=sim.castTo.bind(sim);sim.castTo=target=>{requested=target;const r=cast(target);expected=qs.castFlight?.end;return r;};
 const step=sim.step.bind(sim);sim.step=(dt,input)=>{const before=qs.fishState,r=step(dt,input);if(before==='flight'&&qs.fishState==='sinking'){info.textContent=JSON.stringify({requested,expected,splash:qs.bobber,paid:qs.paidLineMeters,casts:qs.casts});qs.paused=true;}return r;};
}else{
 const qs=sim.state;Object.assign(qs,{mode:'walk',playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});qs.profile.stock={squid:0,anchovy:1,shrimp:0,sardine:0,jig:0};qs.profile.rigStock.bottom=[];qs.profile.sinkerStock={1:0,2:2,3:0,4:0};openGear('rig','all','rod');
}
