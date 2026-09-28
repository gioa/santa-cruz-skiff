import {syncVessel} from './vessel-physics.js?v=20260928-pixel-v64';
// Synthetic test voyage; independent storage key, local-only QA controls.
start(false);sim.randomWeather=false;Object.assign(sim.conditions,{waveHeight:.6,swellHeight:.6,period:6,windKnots:6});
Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',loaded:true,moored:false,boatX:HARBOR.boatX-100,boatZ:HARBOR.boatZ-150,heave:0});syncVessel(sim.vessel,{x:sim.state.boatX,z:sim.state.boatZ,heading:0,clearMotion:true});sim.state.profile.credits=100;sim.state.stability.waterLitres=70;sim.vessel.stability=sim.state.stability;updateUI();
const qa=document.createElement('div');qa.style.cssText='position:fixed;top:135px;left:12px;z-index:110;display:flex;gap:4px';
for(const [label,action] of [['QA:翻覆',()=>{sim.state.stability.waterLitres=410;sim.pause(false);}],['QA:救援定格',()=>{sim.beginCapsize();sim.state.capsize.elapsed=3;sim.pause(true);updateUI();}],['QA:继续',()=>sim.pause(false)]]){const b=document.createElement('button');b.textContent=label;b.style.cssText='font-size:10px;min-height:24px;padding:4px';b.onclick=action;qa.appendChild(b);}document.body.appendChild(qa);
