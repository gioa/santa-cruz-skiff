import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('.',import.meta.url)),base=process.env.SHORE_QA_URL||'http://127.0.0.1:4213/dist/';
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/pacifica-game.js*',async route=>{
 const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
const interactionTick=sim.tick.bind(sim);
window.interactionReview={placeLocal(onDeck=true){
 closeDialog();resetInput();sim.clearLine();const s=sim.state,n={...s.crowd[0]};
 if(!n.name)throw new Error('Existing local fixture missing');
 const p=scene.pier;
 Object.assign(n,{x:onDeck?p.x:1900,y:onDeck?p.tip.y+16:scene.shoreY(1900)+SHORE_MOVEMENT.stand,mode:'watching',walking:false});
 Object.assign(s,{phase:'walk',onPier:onDeck,inspection:null,warden:null,regular:null,crowd:[n],walkTarget:null,walkRoute:[]});s.shoreLore.encounter=null;
 Object.assign(s.player,{x:n.x+shoreWorldMetres(1.5),y:n.y,walking:false});
 // Keep this existing person's controlled position through the real pointer
 // handler; ordinary crowd motion and population encounters have other tests.
 sim.tick=()=>{};interactions.reset(s);world.focus(null);sim.refreshSample();updateUI();return{name:n.name,onDeck:onPier(scene,n.x,n.y),playerOnDeck:onPier(scene,s.player.x,s.player.y),distanceMetres:Math.hypot(s.player.x-n.x,s.player.y-n.y)/3.2};
},point(){
 const n=sim.state.crowd[0],deck=onPier(scene,n.x,n.y)?3.5:0;
 // Independently project a torso 0.9 m above the rendered foot, including the
 // deck elevation that the old ground-coordinate hit test omitted.
 return{body:world.worldToScreen({x:n.x,y:n.y-(deck+.9)*3.2}),groundBody:world.worldToScreen({x:n.x,y:n.y-.9*3.2}),foot:world.worldToScreen({x:n.x,y:n.y-deck*3.2})};
},shopPoint(){return world.worldToScreen(scene.shop.door);},status(){return{modalType,onPier:sim.onPier,walkTarget:sim.state.walkTarget,nearShop:sim.nearShop};}};`});
});
async function settle(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForTimeout(250);}
async function screenshot(name){await page.screenshot({path:out+name+'.png',style:'#toast{visibility:hidden!important}'});}
try{
 await page.goto(base+'benicia.html');await page.locator('#start-btn').click();
 for(const onDeck of [true,false]){
  const fixture=await page.evaluate(onDeck=>window.interactionReview.placeLocal(onDeck),onDeck);await settle();
  assert.ok(Math.abs(fixture.distanceMetres-1.5)<1e-8);assert.equal(fixture.onDeck,onDeck);assert.equal(fixture.playerOnDeck,onDeck);
  const points=await page.evaluate(()=>window.interactionReview.point());assert.ok(points.body.visible);
  if(onDeck)assert.ok(Math.abs(points.groundBody.clientY-points.body.clientY)>18,'the old ground-only hit area must miss this elevated body');
  await screenshot(onDeck?'benicia-pier-local-before':'benicia-bank-local-before');
  await page.mouse.click(points.body.clientX,points.body.clientY);await settle();
  assert.equal((await page.evaluate(()=>window.interactionReview.status())).modalType,'conversation');
  assert.equal(await page.locator('#modal-title').textContent(),fixture.name);
  await screenshot(onDeck?'benicia-pier-local-conversation':'benicia-bank-local-conversation');
  checks.push({scenario:onDeck?'pier local at deck height':'bank local',...fixture,points,conversationOpened:true});
  await page.locator('#close-modal').click();
 }
 // A fresh beach arrival is within 2.5 m of the doorway: a real world click
 // must walk those last steps and open the actual shop interaction.
 for(const scene of ['pacifica','half-moon-bay']){
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();await settle();
  const before=await page.evaluate(()=>window.interactionReview.status());assert.equal(before.modalType,'');assert.equal(before.nearShop,true);
  const door=await page.evaluate(()=>window.interactionReview.shopPoint());assert.ok(door.visible);
  await page.mouse.click(door.clientX,door.clientY);await page.waitForFunction(()=>window.interactionReview.status().modalType==='gear',{},{timeout:5000});
  assert.equal(await page.locator('#modal-title').textContent(),'装备兑换');
  await screenshot(scene+'-arrival-shop');checks.push({scenario:scene+' fresh arrival shop',openedByWorldClick:true,door});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'interaction-results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
