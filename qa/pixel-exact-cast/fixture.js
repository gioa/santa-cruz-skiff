
// Local QA only: real production pointer handlers, isolated test origin/save.
import {syncVessel} from './vessel-physics.js?v=20260928-pixel-v73';
start(false);sim.randomWeather=false;sim.conditions={windKnots:0,waveHeight:0,currentX:0,currentZ:0};
const qs=sim.state;Object.assign(qs,{mode:'boat',boatX:1300,boatZ:-320,heading:0,launchStage:'afloat',rentalPaid:true,moored:false,loaded:true,rodMount:'hand',rodElevation:45,paused:false,fishState:'idle',throttle:0});syncVessel(sim.vessel,{x:1300,z:-320,heading:0,clearMotion:true});world.setConditions(sim.conditions);updateUI();
const info=document.createElement('pre');info.id='qa-result';info.style='position:fixed;top:180px;left:8px;right:8px;z-index:90;pointer-events:none;background:#fff1d5e8;font:11px monospace;padding:6px;white-space:pre-wrap';info.textContent='QA: tap water. No saved user data.';document.body.append(info);
let qaRequested=null,qaResult=null;
const originalCast=sim.castTo.bind(sim);sim.castTo=target=>{qaRequested=target;qaResult=originalCast(target);info.textContent=JSON.stringify({requested:target,result:qaResult,state:qs.fishState,casts:qs.casts});return qaResult;};
const stepQA=sim.step.bind(sim);sim.step=(dt,input)=>{const before=qs.fishState;const result=stepQA(dt,input);if(before==='flight'&&qs.fishState==='sinking'){info.textContent=JSON.stringify({requested:qaRequested,splash:{x:qs.bobber.x,z:qs.bobber.z},error:Math.hypot(qs.bobber.x-qaRequested.x,qs.bobber.z-qaRequested.z),state:qs.fishState,casts:qs.casts});qs.paused=true;}return result;};
const dot=document.createElement('div');dot.style='position:fixed;width:10px;height:10px;border:2px solid #ffcc60;border-radius:50%;pointer-events:none;z-index:10';document.body.append(dot);
function mark(){const p=world.fishingWorldToScreen(1294,-320,qs);dot.style.left=(p.x-5)+'px';dot.style.top=(p.y-5)+'px';requestAnimationFrame(mark);}requestAnimationFrame(mark);
