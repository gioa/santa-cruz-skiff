// Local QA: deterministic seed, actual event rolls, accelerated waiting only.
import {createShoreLore} from './shore-lore.js?v=coast-4';
sim.state.shoreLore=createShoreLore(scene,null,sim.state.elapsed,12345);
sim.state.player.y=sim.world.shoreY(sim.state.player.x)+70;
start();
const qa=document.createElement('button');qa.id='qa-encounter';qa.textContent='QA 等待偶遇';qa.style='position:fixed;left:10px;top:100px;z-index:40';document.body.append(qa);
qa.onclick=()=>{for(let t=0;t<1200&&!sim.state.shoreLore.encounter;t+=.1)sim.update(.1);persist();updateUI();qa.remove();};
