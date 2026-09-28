// Local component QA: production controls, simulation and artwork; no saved trip.
import {PixelSimulation} from '../../dist/pixel-sim.js';
import {mountFishingConsole} from '../../dist/pixel-fishing-ui.js';
import {boatActions} from '../../dist/pixel-boat-actions.js';
import {createFishSprite} from '../../dist/pixel-sprites.js';
import {drawFishArt} from '../../dist/pixel-fish-art.js';
const $=id=>document.getElementById(id),sim=new PixelSimulation(),s=sim.state;
sim.start();Object.assign(s,{mode:'boat',rentalPaid:true,launchStage:'afloat',rodMount:'hand',fishState:'waiting',reelMode:'brake',paidLineMeters:12,lureDepth:10,speed:0,throttle:0,paused:false});
for(const id of ['loading','intro','intro-location','world','guide-btn'])$(id).hidden=true;
for(const id of ['controls','boat-console','boat-fishing','boat-panel-tabs'])$(id).hidden=false;
$('app').className='is-aboard';$('boat-console').className='actions-only fishing-open';
const notice=document.createElement('p');notice.textContent='本地生产组件测试 · 48 in 标尺';notice.style='position:absolute;top:100px;left:16px;font-size:12px';$('app').append(notice);
const boards=document.createElement('section');boards.style='position:absolute;top:145px;left:16px;right:16px;overflow:hidden';$('app').append(boards);
for(const inches of [24,60]){const label=document.createElement('div');label.textContent=inches+' in';const canvas=document.createElement('canvas');canvas.style='display:block;margin-bottom:14px;max-width:100%';boards.append(label,canvas);drawFishArt(canvas,createFishSprite('lingcod'),{length:inches*2.54},{width:innerWidth-32,height:100});}
const ui=mountFishingConsole($('boat-fishing'),{sim,getActions:()=>boatActions(s),onFeedback(){},onMount:v=>sim.setRodMount(v),onRetrieve(){}});
function frame(){ui.update();ui.draw(1/60);$('game-state').textContent=JSON.stringify({rodMount:s.rodMount,reelMode:s.reelMode,fixture:true});requestAnimationFrame(frame);}frame();
