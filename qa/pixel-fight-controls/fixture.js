
// Isolated local QA fixture; never shipped in dist.
import {syncVessel} from './vessel-physics.js?v=20260928-pixel-v77';
import {rodTipPosition} from './pixel-fishing-physics.js?v=20260928-pixel-v77';
import {createFishFight} from './pixel-fish-fight.js?v=20260928-pixel-v77';
import {createHookHold} from './pixel-hooking.js?v=20260928-pixel-v77';
import {getRigProfile} from './fishing-rigs.js?v=20260928-pixel-v77';
start(false);sim.randomWeather=false;sim.conditions={windKnots:0,waveHeight:0,currentX:0,currentZ:0};const s=sim.state;
Object.assign(s,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,rodMount:'hand',fishState:'fight',reelMode:'brake',rodElevation:24,rodAzimuth:70,boatX:1300,boatZ:-320,heading:0,drag:.65,paidLineMeters:40,lureDepth:30,lineSlackMeters:0,fish:{name:'加州比目鱼',latin:'Paralichthys californicus',fightKind:'halibut',length:81.28,kg:6.1},paused:false});
syncVessel(sim.vessel,{x:1300,z:-320,heading:0,clearMotion:true});s.rodTip=rodTipPosition(s);s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:s.rodTip.height-40};s.fishFight=createFishFight(s.fish,.5);s.hookHold=createHookHold(s.fish,getRigProfile(s.rig),.5);s.hookHold.threshold=Infinity;
world.setConditions(sim.conditions);updateUI();
const qaOutput=document.createElement('output');qaOutput.id='qa-input';qaOutput.hidden=true;document.body.append(qaOutput);const qaTrace={requestedReel:0,actualCrank:0,retrieve:0,lift:0,recover:0};const qaStep=sim.step.bind(sim);sim.step=(dt,input)=>{const r=qaStep(dt,input);qaTrace.requestedReel=Math.max(qaTrace.requestedReel,input?.reel||0);qaTrace.actualCrank=Math.max(qaTrace.actualCrank,sim.state.crankRate||0);qaTrace.retrieve=Math.max(qaTrace.retrieve,sim.state.retrieveRate||0);if(input?.fightPump==='lift')qaTrace.lift++;if(input?.fightPump==='recover')qaTrace.recover++;qaOutput.textContent=JSON.stringify(qaTrace);return r;};
