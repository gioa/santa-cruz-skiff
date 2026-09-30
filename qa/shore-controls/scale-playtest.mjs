import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/pacifica-game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
window.scaleReview={place(mode='walk'){
 closeDialog();sim.clearLine();const s=sim.state,x=scene.id==='benicia'?1900:2440;Object.assign(s.player,{x,y:scene.shoreY(x)+4});s.onPier=false;s.regular=null;s.crowd=[];s.inspection=null;s.seaState={waveHeightM:.4,tideM:1.2};
 s.rodSupplies[s.activeRod]={id:'carolina_rig',condition:1,bait:{kind:'sandcrab',condition:1}};sim.setFishingControls({rodLift:.35,rodSweep:0});
 if(mode!=='walk'){sim.cast({power:mode==='far'?1:0,aim:.1});for(let t=0;t<8&&s.phase==='casting';t+=.025)sim.update(.025);}
 focused=false;resetInput();world.focus(null);updateUI();resize();
},inspect(){return{camera:lastWorldFrame.camera,player:lastWorldFrame.player,phase:sim.state.phase,tackle:lastWorldFrame.tackle,cast:sim.state.cast,scaleCSS:lastWorldFrame.camera.scale*innerWidth/document.querySelector('#world').width};}};`});});
try{for(const scene of ['pacifica','half-moon-bay','benicia']){
 await page.goto('http://127.0.0.1:4213/dist/'+scene+'.html');await page.locator('#start-btn').click();
 for(const mode of ['walk','near','far']){await page.evaluate(mode=>window.scaleReview.place(mode),mode);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const f=await page.evaluate(()=>window.scaleReview.inspect());
 assert.ok(f.player.visible);if(mode==='walk')assert.ok(5.6*f.scaleCSS>=24);else{assert.ok(f.tackle);assert.ok(f.cast.distance>0);}
 results.push({scene,mode,playerHeightCSS:5.6*f.scaleCSS,castDistanceM:f.cast?.distance});await page.screenshot({path:'qa/shore-controls/'+scene+'-scale-'+mode+'.png',style:'#toast{visibility:hidden!important}'});
 }}assert.deepEqual(errors,[]);await fs.writeFile('qa/shore-controls/scale-results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));}finally{await browser.close();}
