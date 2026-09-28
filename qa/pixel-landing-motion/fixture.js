import {beginFishLanding,stepFishLanding} from './pixel-fish-landing.js?v=20260928-pixel-v77';

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

const qp=document.createElement('div');qp.style='position:fixed;top:70px;right:10px;z-index:55;display:flex;gap:4px';qp.innerHTML='<button id="qa-lift">拉杆</button><button id="qa-release">放杆</button><button id="qa-raise">提鱼</button><button id="qa-aboard">入船</button>';document.body.append(qp);
document.querySelector('#qa-lift').onclick=()=>focusRod.setHeld(true);
document.querySelector('#qa-release').onclick=()=>focusRod.setHeld(false);
function qaLanding(fraction){closeModal();Object.assign(s,{paused:false,fishState:'fight',rodMount:'hand',rodElevation:45,fish:{name:'蓝岩鱼',latin:'Sebastes mystinus',fightKind:'rockfish',length:32,kg:.7},lureDepth:.3,paidLineMeters:3,bobber:{x:s.boatX+1.4,z:s.boatZ,height:-.3},fishLanding:null});s.fishLanding=beginFishLanding(s);for(let t=0;t<s.fishLanding.duration*fraction;t+=.05)Object.assign(s,stepFishLanding(s,.05));s.paused=true;updateUI();}
document.querySelector('#qa-raise').onclick=()=>qaLanding(.5);
document.querySelector('#qa-aboard').onclick=()=>qaLanding(.97);
