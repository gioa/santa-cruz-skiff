// Local, labelled component fixture. No production entry point or saved trip
// imports this file; the UI, rod rendering and line physics are production code.
import {PixelSimulation} from '../../dist/pixel-sim.js?v=reel-touch-1';
import {createFightView} from '../../dist/pixel-fight-view.js?v=reel-touch-1';
import {mountFishingConsole} from '../../dist/pixel-fishing-ui.js?v=reel-touch-1';
import {boatActions} from '../../dist/pixel-boat-actions.js?v=reel-touch-1';
import {bindFocusRod} from '../../dist/pixel-focus-input.js';
import {bindPointer} from '../../dist/input.js';
import {stepFishingLine,rodTipPosition} from '../../dist/pixel-fishing-physics.js';
import {stepFishFight,createFishFight,canLandFish} from '../../dist/pixel-fish-fight.js';
import {stepRodTip} from '../../dist/pixel-rod-response.js';
const $=id=>document.getElementById(id),sim=new PixelSimulation(),s=sim.state;
sim.start();
Object.assign(s,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,rodMount:'hand',fishState:'fight',reelMode:'brake',rodElevation:45,rodAzimuth:70,rig:'bottom',rigWeightGrams:85,boatX:0,boatZ:0,heading:0,drag:.85,paidLineMeters:6.5,lureDepth:4,lineSlackMeters:0,fish:{name:'加州比目鱼',latin:'Paralichthys californicus',fightKind:'halibut',length:81.28,kg:6.1},paused:false});
s.rodTip=rodTipPosition(s);s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:-4};s.fishFight=createFishFight(s.fish,.5);
for(const id of ['loading','intro','intro-location','world','guide-btn'])$(id).hidden=true;
for(const id of ['fight-view','controls','boat-console','boat-fishing','fish-status'])$(id).hidden=false;
$('app').className='is-aboard is-fishing-focus';$('boat-console').className='actions-only';$('fish-title').textContent='本地测试 · 32 in Halibut';
const view=createFightView($('fight-view'));view.resize(innerWidth,innerHeight);
const getActions=()=>boatActions(s),ui=mountFishingConsole($('boat-fishing'),{sim,getActions,getFocusView:()=>view.snapshot(),onFeedback(){},onMount:value=>sim.setRodMount(value),onRetrieve(){}});
let hold=false,autoWind=false;const testButton=document.createElement('button');testButton.textContent='测试：持续收线';testButton.style='position:absolute;top:8px;right:8px;z-index:50';document.getElementById('app').append(testButton);testButton.onclick=()=>{autoWind=!autoWind;testButton.textContent=autoWind?'测试：停止收线':'测试：持续收线';};
const held=bindPointer($('reel-btn'),{start:()=>{if(!getActions().reel)return false;hold=true;},end:()=>hold=false,cancel:()=>hold=false});
const pose=bindFocusRod($('fight-view'),{enabled:()=>getActions().adjustPose,getPose:()=>({elevation:s.rodElevation,azimuth:s.rodAzimuth}),onPose:p=>sim.setRodPose(p)});
function reset(){ui.reset();held.reset();pose.reset();hold=false;}
window.addEventListener('blur',reset);window.addEventListener('resize',()=>{reset();view.resize(innerWidth,innerHeight);});
let last=performance.now(),time=0;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;
 s.crankRate=Math.max(ui.input(dt).reel,hold||autoWind?1.2:0);
 if(s.fishState==='landed'){requestAnimationFrame(frame);return;}
 const result=stepFishFight(s.fish,s.fishFight,{...s,time,dt});s.fishFight=result.fight;s.fishPullN=result.pullN;s.fishMotion=result.motion;
 Object.assign(s,stepFishingLine(s,{dt,environment:{bottomDepth:30},fishPullN:s.fishPullN,fishMotion:s.fishMotion}));
 s.rodTipMotion=stepRodTip(s,dt);s.time=time;
 view.draw(s,dt,{active:true,bottomInset:innerHeight<500?120:180,reducedMotion:false});ui.update();ui.draw(dt);
 $('game-state').textContent=JSON.stringify({fixture:true,phase:s.fishMotion?.phase,energy:s.fishFight.energy,depth:s.lureDepth,rodBend:s.rodBend,surfaceStartleUsed:s.fishFight.surfaceStartleUsed,drag:s.drag,crankRate:s.crankRate,paidLineMeters:s.paidLineMeters,retrieveRate:s.retrieveRate,payoutRate:s.payoutRate,reelMode:s.reelMode,rodElevation:s.rodElevation,focus:view.snapshot()});
 if(canLandFish(s)){s.fishState='landed';testButton.textContent='测试完成：鱼已到船边';testButton.disabled=true;}
 requestAnimationFrame(frame);
}
frame(performance.now());
