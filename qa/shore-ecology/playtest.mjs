import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/shaoshuai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=new URL('./',import.meta.url),base=process.env.SHORE_QA_BASE||'http://127.0.0.1:4198/';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page=await context.newPage(),errors=[],checks=[],castChecks=[],discoveryChecks=[];page.on('pageerror',e=>errors.push(e.message));
// Test-only closure access, appended by the local response route; not shipped.
await page.route('**/pacifica-game.js',async route=>{
 const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
 window.shoreQA={sim,refresh:updateUI,project:point=>world.worldToScreen(point),
  points(){return{shop:scene.shop.door,shore:{x:940,y:scene.shoreY(940)+25},pier:scene.pier?.gate};},
  quiet(){sim.state.shoreLore.nextAt=sim.state.elapsed+3600;},
  discovery(kind){
   closeDialog();resetInput();sim.clearLine();const s=sim.state;s.onPier=false;s.leavingPier=false;s.inspection=null;s.walkTarget=null;s.walkRoute=[];
   s.shoreLore.encounter=null;s.shoreLore.nextAt=s.elapsed+3600;
   if(kind==='angler'){
    const x=2440,y=scene.shoreY(x)+75;
    s.shoreLore.encounter={id:9001,x,y,expiresAt:s.elapsed+600,angler:0,clueId:scene.zones[0].id+':terrain',talked:false};
    Object.assign(s.player,{x:x-115,y,walking:false});
   }else if(kind==='pier')Object.assign(s.player,{x:scene.pier.gate.x,y:scene.pier.gate.y+105,walking:false});
   sim.refreshSample();interactions.reset(s);updateUI();
  },leavePier(){sim.ejectFromPier();interactions.reset(sim.state);updateUI();},
  setup({seaState=null,power=.5,noFish=true}={}){
  closeDialog();sim.clearLine();sim.state.inspection=null;sim.state.onPier=false;sim.state.pierVisit=null;sim.state.warden=null;sim.state.wardenNextAt=1e9;
  sim.state.seaState=seaState;sim.state.elapsed=0;
  // An empty stretch of beach: no schools arrive, so the 30 s check is about the UI, not luck.
  if(noFish){sim.population.groups=[];sim.population.maintainAt=Infinity;sim.population.center={x:sim.state.player.x/3.2,y:35};}
  sim.state.rodSupplies[sim.state.activeRod]={id:'carolina_rig',condition:1,bait:{kind:'sandcrab',condition:1}};
  const x=2440;Object.assign(sim.state.player,{x,y:scene.shoreY(x)+25});sim.refreshSample();clearTimeout(toastTimer);$('toast').classList.remove('show');
  const result=sim.cast({power});if(!result.ok)throw new Error(result.message);updateUI();
 },school(species){const w=sim.fishWorld(),t=sim.toPlane(sim.state.cast.target.x,sim.state.cast.target.y);sim.population.groups=[];
   return window.shoreQA.placeSchool(sim.population,w,species,t.x+.5,t.y,{hunger:1,count:12}).id;},
  advance(seconds){for(let t=0;t<seconds;t+=.025)sim.update(.025);updateUI();}};
 import('./fish-population.js').then(m=>{window.shoreQA.placeSchool=m.placeSchool;});
 `});
});
const viewports=[['phone',390,844],['small-phone',320,568],['landscape',844,390],['desktop',1440,1000]];
const state=()=>page.locator('#beach-state').textContent().then(JSON.parse);
// Fixture geometry only projects genuine scene coordinates; every discovery
// transition below is produced by pointer walking or WASD through the game UI.
const clickGround=async point=>{
 const p=await page.evaluate(point=>window.shoreQA.project(point),point);
 assert.ok(p.visible,`ground point is outside camera: ${JSON.stringify({point,p})}`);
 assert.equal(await page.evaluate(p=>document.elementFromPoint(p.clientX,p.clientY)?.id,p),'world','ground click must reach the canvas');
 await page.mouse.click(p.clientX,p.clientY);
};
const walkGround=async point=>{
 await clickGround(point);
 await page.waitForFunction(point=>{const s=JSON.parse(document.getElementById('beach-state').textContent);return !s.walkTarget&&Math.hypot(s.player.x-point.x,s.player.y-point.y)<4;},point,{timeout:10000});
};
const walkUntilModal=async(key,selector)=>{
 await page.locator('#world').focus();await page.keyboard.down(key);
 try{await page.locator(selector).first().waitFor({state:'visible',timeout:5000});}finally{await page.keyboard.up(key);}
};
try{
 for(const scene of ['pacifica','half-moon-bay']){
  await page.goto(base+scene+'.html');await page.locator('#start-btn').click();
  await page.evaluate(()=>window.shoreQA.quiet());
  assert.equal(await page.locator('#walk-surf,#walk-shop,#pier-btn,#angler-talk').count(),0);
  await page.waitForTimeout(250);assert.equal(await page.locator('#modal-layer').isVisible(),false,'arrival must not open a modal');
  // The first position is outside the doorway event radius. E must not route
  // the player to a distant landmark even though the wider shop radius overlaps.
  const initial=await state();await page.locator('#world').focus();await page.keyboard.press('e');await page.waitForTimeout(120);
  const afterE=await state();assert.equal(afterE.walkTarget,null);assert.deepEqual(afterE.player,initial.player);assert.equal(await page.locator('#modal-layer').isVisible(),false);
  for(const [name,width,height] of viewports){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   assert.equal(await page.locator('#boat-console').isVisible(),false,`${scene} ${name}: walking must leave no empty bottom panel`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:new URL(`${scene}-discovery-${name}.png`,out).pathname});
  }
  await page.setViewportSize({width:390,height:844});
  // Walk into the doorway using only WASD; closing does not reopen in place.
  await walkUntilModal('w','.inventory-slot');
  const firstShop=(await state()).player;await page.locator('#close-modal').click();await page.waitForTimeout(250);
  assert.equal(await page.locator('#modal-layer').isVisible(),false);assert.deepEqual((await state()).player,firstShop);
  await page.locator('#world').focus();await page.keyboard.down('s');await page.waitForTimeout(850);await page.keyboard.up('s');
  const shopPoint=await page.evaluate(()=>window.shoreQA.points().shop),away=(await state()).player;
  assert.ok(Math.hypot(away.x-shopPoint.x,away.y-shopPoint.y)>64);
  await walkUntilModal('w','.inventory-slot');await page.locator('#close-modal').click();
  // Clicking the shop from afar begins walking, while manual movement cancels
  // that route. There is no delayed store-opening callback after cancellation.
  await walkGround({x:940,y:865});await clickGround(shopPoint);
  await page.waitForFunction(()=>Boolean(JSON.parse(document.getElementById('beach-state').textContent).walkTarget));
  await page.locator('#world').focus();await page.keyboard.down('a');await page.waitForTimeout(250);await page.keyboard.up('a');
  assert.equal((await state()).walkTarget,null);await page.waitForTimeout(250);assert.equal(await page.locator('#modal-layer').isVisible(),false);
  // Actual ground clicks walk around the building to the wet sand, with no
  // navigation shortcut and no simulation walkTo call in the fixture.
  await walkGround({x:940,y:650});await walkGround(await page.evaluate(()=>window.shoreQA.points().shore));
  assert.equal((await state()).canCast,true);
  const castsBefore=(await state()).stats.casts;
  await page.locator('#beach-cast').click();await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='casting');
  const tap=(await state()).cast;assert.ok(tap.distance>=3&&tap.distance<7);assert.ok(tap.offshoreDistance>0&&tap.offshoreDistance<5);
  assert.equal((await state()).stats.casts,castsBefore+1);
  await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='waiting');
  assert.ok((await state()).presentation);await page.locator('#beach-retrieve').click();assert.equal((await state()).phase,'walk');
  // Pointer, focused-button Space and global Space use one charge curve.
  const b=await page.locator('#beach-cast').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(900);
  assert.match(await page.locator('#charge-label').textContent(),/ft/);
  const chargeBox=await page.locator('#cast-charge').boundingBox();assert.ok(chargeBox&&chargeBox.width>200&&chargeBox.height>=18&&chargeBox.y>0&&chargeBox.y+chargeBox.height<844,`charge preview bounds: ${JSON.stringify(chargeBox)}; ${await page.locator('#cast-charge').evaluate(e=>JSON.stringify({hidden:e.hidden,css:getComputedStyle(e).cssText,display:getComputedStyle(e).display,width:getComputedStyle(e).width,height:getComputedStyle(e).height,parent:e.parentElement.getBoundingClientRect().toJSON()}))}`);
  await page.mouse.up();
  await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='casting');
  const held=(await state()).cast;assert.ok(held.distance>tap.distance*3);assert.ok(held.distance<28);await page.locator('#beach-retrieve').click();
  // Capture feedback separately so screenshot latency cannot lengthen the measured hold.
  await page.locator('#beach-cast').focus();await page.keyboard.down('Space');await page.waitForTimeout(900);
  await page.screenshot({path:new URL(`${scene}-charge.png`,out).pathname});await page.locator('#world').focus();await page.keyboard.up('Space');
  assert.equal((await state()).phase,'walk');
  const keyboardRanges=[];
  for(const focus of ['#beach-cast','#world']){
   await page.locator(focus).focus();const before=(await state()).stats.casts;
   await page.keyboard.down('Space');await page.waitForTimeout(900);await page.keyboard.up('Space');
   await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='casting');
   const s=await state();assert.equal(s.stats.casts,before+1);keyboardRanges.push(s.cast.distance);assert.ok(Math.abs(s.cast.distance-held.distance)<3);
   await page.locator('#beach-retrieve').click();
  }
  // Blur cancels a charge; a native accessibility click is also a short lob.
  await page.locator('#beach-cast').focus();const beforeCancel=(await state()).stats.casts;
  await page.keyboard.down('Space');await page.waitForTimeout(100);await page.locator('#world').focus();await page.keyboard.up('Space');
  assert.equal((await state()).stats.casts,beforeCancel);assert.equal((await state()).phase,'walk');
  await page.locator('#beach-cast').evaluate(el=>el.click());await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='casting');
  assert.ok((await state()).cast.distance<7);await page.locator('#beach-retrieve').click();
  // Existing inland saves can miss water; the actual UI never snaps them offshore.
  await page.evaluate(()=>{const s=window.shoreQA.sim.state;s.player.y=window.shoreQA.sim.world.shoreY(s.player.x)+100;window.shoreQA.refresh();});
  await page.locator('#beach-cast').click();await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='casting');
  assert.equal((await state()).cast.landing,'sand');await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='walk');
  assert.match((await state()).message,/沙上/);assert.equal((await state()).fish,null);
  castChecks.push({scene,tapMetres:tap.distance,tapOffshoreMetres:tap.offshoreDistance,heldMetres:held.distance,keyboardRanges,checks:['short pointer tap','900ms pointer and two keyboard paths agree','no duplicate casts','blur cancels','accessibility click is short','dry cast lands on sand']});
  // Fixtures place an NPC and the player outside its trigger radius. Actual
  // walking discovers it, awards a note, and exposes a read-only local map.
  await page.evaluate(()=>window.shoreQA.discovery('angler'));await page.waitForTimeout(200);
  assert.equal(await page.locator('#modal-layer').isVisible(),false);
  const notesBefore=(await state()).shoreLore.notes.length;await walkUntilModal('d','#angler-goodbye');
  assert.equal((await state()).shoreLore.notes.length,notesBefore+1);await page.locator('#angler-goodbye').click();await page.waitForTimeout(250);
  assert.equal(await page.locator('#modal-layer').isVisible(),false);
  await page.keyboard.press('e');await page.locator('#angler-goodbye').waitFor({state:'visible'});await page.locator('#angler-goodbye').click();
  const beforeMap=await state();await page.locator('#map-btn').click();await page.locator('#shore-chart').waitFor({state:'visible'});
  assert.equal(await page.locator('#modal-content [data-zone],#modal-content button').count(),0,'notes must not offer destination buttons');
  assert.deepEqual((await state()).player,beforeMap.player);assert.equal((await state()).walkTarget,null);
  await page.screenshot({path:new URL(`${scene}-discovery-notes.png`,out).pathname});await page.keyboard.press('Escape');
  if(scene==='pacifica'){
   await page.evaluate(()=>window.shoreQA.discovery('pier'));await page.waitForTimeout(200);
   assert.equal(await page.locator('#modal-layer').isVisible(),false);
   // Walking up to the gate shows nothing; a brief push is just a closed gate.
   await page.locator('#world').focus();await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.up('w');
   assert.equal(await page.locator('#modal-layer').isVisible(),false,'no notice at the gate');
   await page.screenshot({path:new URL(`${scene}-discovery-gate.png`,out).pathname});
   // Leaning on it long enough finds the gap: the easter egg, with no warning.
   await page.keyboard.down('w');await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).onPier,null,{timeout:6000});await page.keyboard.up('w');
   assert.equal(await page.locator('#modal-layer').isVisible(),false);assert.doesNotMatch(await page.locator('#toast').textContent(),/巡查|罚款|风险/);
   await page.screenshot({path:new URL(`${scene}-discovery-pier.png`,out).pathname});
   await page.evaluate(()=>window.shoreQA.leavePier());assert.equal((await state()).onPier,false);
  }
  discoveryChecks.push({scene,checks:['no navigation shortcut buttons or arrival modal','distant E never starts a route','four walking viewports have no empty bottom panel','WASD doorway entry opens shop','close stays closed until walk out and reenter','manual WASD cancels pointer route without delayed opening','ground clicks around shop reach surf','walk into NPC starts conversation and note','nearby E can interact again','notes have no destination buttons',...(scene==='pacifica'?['silent pier gate; leaning on it is the hidden way on']:[])]});
  await page.evaluate(()=>{window.shoreQA.setup();window.shoreQA.advance(30);});
  assert.equal((await state()).phase,'waiting');assert.equal((await state()).fish,null);
  for(const [name,width,height] of viewports){
   await page.setViewportSize({width,height});await page.waitForTimeout(120);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   for(const id of ['beach-retrieve','fish-status','settings-btn']){
    const b=await page.locator('#'+id).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${scene} ${name} ${id} bounds ${JSON.stringify(b)}`);
   }
   assert.match(await page.locator('#fish-detail').textContent(),/离岸.*ft/);
   await page.screenshot({path:new URL(`${scene}-${name}.png`,out).pathname});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#settings-btn').click();const before=await state();await page.waitForTimeout(200);const after=await state();
  assert.equal(after.elapsed,before.elapsed,'menus pause the beach and its fish');
  assert.match(await page.locator('#modal-content').textContent(),/没有咬口|空竿|保证/);await page.keyboard.press('Escape');
  const presentations=[];
  for(const [name,seaState] of [['calm',{waveHeightM:.4,wavePeriodS:8}],['rough',{waveHeightM:2.8,wavePeriodS:16}]]){
   await page.evaluate(seaState=>{window.shoreQA.setup({seaState});window.shoreQA.advance(30);},seaState);
   const s=await state();presentations.push(s.presentation);assert.equal(s.phase,'waiting');
   await page.screenshot({path:new URL(`${scene}-${name}.png`,out).pathname});
  }
  assert.ok(presentations[0].stability>presentations[1].stability);
  // A real school beside the bait still has to find, inspect and take it; then the UI strike.
  await page.evaluate(()=>{window.shoreQA.setup({seaState:{waveHeightM:.4,wavePeriodS:8}});for(let t=0;t<3&&window.shoreQA.sim.state.phase==='casting';t+=.025)window.shoreQA.sim.update(.025);window.shoreQA.school('surfperch');for(let t=0;t<90&&window.shoreQA.sim.state.phase!=='bite';t+=.025)window.shoreQA.sim.update(.025);window.shoreQA.refresh();});
  assert.equal((await state()).phase,'bite');await page.locator('#beach-cast').click();
  await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='fighting');
  const fight=await state();assert.equal(fight.fish.id,fight.biteSpeciesId);assert.equal(fight.focusView.active,true);
  await page.screenshot({path:new URL(`${scene}-fight.png`,out).pathname});
  checks.push(`${scene}: ordinary walk/cast/retrieve; empty-beach 30s no bite; four responsive viewports; menu pauses fish; calm/rough stability; school finds bait, bites, UI strike and first-person fight`);
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(new URL('browser-results.json',out),JSON.stringify({base,checks,castChecks,discoveryChecks,errors,fixture:'Test-only response route; no public game debug controls',verifiedAt:new Date().toISOString()},null,2));
 console.log(JSON.stringify({checks,castChecks,discoveryChecks,errors}));
}finally{await browser.close();}
