import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/shaoshuai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=new URL('./',import.meta.url),base=process.env.SHORE_QA_BASE||'http://127.0.0.1:4198/';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:320,height:568},deviceScaleFactor:1});
const page=await context.newPage(),errors=[],checks=[],captures=[];
page.on('pageerror',e=>errors.push(e.message));
// Test-only response fixture: controls seed, sea state, position and elapsed
// updates. It never inserts a fish or changes phase to bite/fighting/landed.
await page.route('**/pacifica-game.js',async route=>{
 const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
 window.smallfishQA={sim,refresh:updateUI,project:point=>world.worldToScreen(point),points(){return{shop:scene.shop.door,shore:{x:940,y:scene.shoreY(940)+25}};},prepare(target=null){
  if(sim.state.phase!=='walk')throw new Error('Fixture requires an idle angler');
  closeDialog();resetInput();sim.state.seaState={waveHeightM:.35,wavePeriodS:8};
  sim.state.fishingDate='2026-06-15';sim.state.elapsed=0;sim.state.warden=null;sim.state.wardenNextAt=1e9;
  sim.state.onPier=false;sim.state.pierVisit=null;sim.state.walkTarget=null;sim.state.walkRoute=[];
  const x=1100;Object.assign(sim.state.player,{x,y:scene.shoreY(x)+25});sim.refreshSample();
  window.smallfishQA.quiet();window.smallfishQA.target=target;
  clearTimeout(toastTimer);$('toast').classList.remove('show');updateUI();
 },quiet(){sim.population.groups=[];sim.population.maintainAt=Infinity;sim.population.center={x:sim.state.player.x/3.2,y:35};},
 advance(seconds,stopAtBite=false){
  // A target school is placed beside the bait once it lands; it must still find,
  // inspect and take the bait through the model. Nothing forces the bite.
  let placed=false;
  for(let t=0;t<seconds&&(!stopAtBite||sim.state.phase!=='bite');t+=.025){
   if(window.smallfishQA.target&&!placed&&sim.state.phase==='waiting'){const w=sim.fishWorld(),p=sim.toPlane(sim.state.cast.target.x,sim.state.cast.target.y);window.smallfishQA.placeSchool(sim.population,w,window.smallfishQA.target,p.x+.5,p.y,{hunger:1,count:14});placed=true;}
   sim.update(.025);
  }
  updateUI();
 },land(){
  if(sim.state.phase!=='fighting')throw new Error('Land fixture requires a UI-hooked fish');
  for(let t=0;t<90&&sim.state.phase==='fighting';t+=.025)sim.update(.025,{reel:sim.state.tension<.7});
  updateUI();
 }};
 import('./fish-population.js').then(m=>{window.smallfishQA.placeSchool=m.placeSchool;});
 `});
});
const state=()=>page.locator('#beach-state').textContent().then(JSON.parse);
// Scene projection is test-only; navigation still uses actual canvas clicks.
const clickGround=async point=>{
 const p=await page.evaluate(point=>window.smallfishQA.project(point),point);
 assert.ok(p.visible,`ground point outside camera: ${JSON.stringify({point,p})}`);
 assert.equal(await page.evaluate(p=>document.elementFromPoint(p.clientX,p.clientY)?.id,p),'world');
 await page.mouse.click(p.clientX,p.clientY);
};
const walkGround=async point=>{
 await clickGround(point);
 await page.waitForFunction(point=>{const s=JSON.parse(document.getElementById('beach-state').textContent);return !s.walkTarget&&Math.hypot(s.player.x-point.x,s.player.y-point.y)<4;},point,{timeout:10000});
};
const shot=async name=>{await page.screenshot({path:new URL(name+'.png',out).pathname});captures.push(name+'.png');};
const visibleWithin=async id=>{
 const b=await page.locator('#'+id).boundingBox(),{width,height}=page.viewportSize();
 assert.ok(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${id} out of bounds: ${JSON.stringify(b)}`);
};
const configure=async rig=>{
 await page.locator('#rod-config-btn').click();
 if(rig&&(await state()).rodSupplies.starter_rod.id!==rig)await page.locator(`[data-part="${rig}"]`).click();
 await page.locator('[data-supply-slot="bait"]').click();await page.locator('[data-part="squid"]').click();
 await page.locator('#close-modal').click();
};
const castHalf=async()=>{
 await page.locator('#beach-cast').focus();await page.keyboard.down('Space');await page.waitForTimeout(900);await page.keyboard.up('Space');
 await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='casting');
};
const portrait=async selector=>page.locator(selector).evaluate(canvas=>{
 const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();let hash=2166136261;
 for(let i=0;i<pixels.length;i+=4){colors.add(Array.from(pixels.slice(i,i+3)).join(','));for(let n=0;n<4;n++)hash=Math.imul(hash^pixels[i+n],16777619)>>>0;}
 return{label:canvas.getAttribute('aria-label'),colors:colors.size,hash,width:canvas.width,height:canvas.height};
});
try{
 for(const scene of ['pacifica','half-moon-bay']){
  await page.setViewportSize({width:320,height:568});await page.goto(base+scene+'.html');await page.locator('#start-btn').click();
  await clickGround(await page.evaluate(()=>window.smallfishQA.points().shop));await page.locator('.inventory-slot').first().waitFor({state:'visible'});
  await page.locator('.inventory-slot').filter({hasText:'小钩浮钓组'}).click();await page.locator('#item-buy').click();
  await page.locator('.inventory-slot').filter({hasText:'鱿鱼条'}).click();await page.locator('#item-buy').click();
  assert.equal((await state()).rigStock.float_rig.length,1);assert.equal((await state()).inventory.squid,8);
  await shot(scene+'-shop-small');
  await page.locator('[data-tab="rig"]').click();await page.locator('[data-part="float_rig"]').click();
  await page.locator('[data-supply-slot="bait"]').click();await page.locator('[data-part="squid"]').click();
  assert.equal((await state()).rig,'float');assert.equal((await state()).inventory.squid,7);
  await shot(scene+'-float-assembly-small');await page.locator('#close-modal').click();
  // This initial walk and cast use the ordinary mobile controls end-to-end.
  await walkGround({x:940,y:865});await walkGround({x:940,y:650});await walkGround(await page.evaluate(()=>window.smallfishQA.points().shore));assert.equal((await state()).canCast,true);
  await page.evaluate(()=>window.smallfishQA.quiet());await castHalf();
  await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='waiting');
  await page.evaluate(()=>window.smallfishQA.advance(10));
  const floating=await state();assert.equal(floating.phase,'waiting');assert.equal(floating.presentation.mode,'float');assert.equal(floating.presentation.bottomContact,0);
  assert.ok(floating.presentation.depth>0&&floating.presentation.depth<=1);assert.match(await page.locator('#fish-detail').textContent(),/钩深/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const id of ['beach-retrieve','fish-status','settings-btn'])await visibleWithin(id);
  await shot(scene+'-float-waiting-small');await page.locator('#beach-retrieve').click();
  await page.setViewportSize({width:390,height:844});const caught=[],portraits=[];
  for(const [id,rig,name] of [['white_croaker','carolina_rig','White croaker'],['jacksmelt','float_rig','Jacksmelt']]){
   await configure(rig);await page.evaluate(target=>window.smallfishQA.prepare(target),id);await castHalf();
   await page.evaluate(()=>window.smallfishQA.advance(180,true));const bite=await state();
   assert.equal(bite.phase,'bite');assert.equal(bite.biteSpeciesId,id);
   await page.locator('#beach-cast').click();await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).phase==='fighting');
   assert.equal((await state()).fish.id,id);await shot(scene+'-'+id+'-fight');
   await page.evaluate(()=>window.smallfishQA.land());await page.locator('#catch-keep').waitFor({state:'visible'});
   const landed=await state();assert.equal(landed.phase,'landed');assert.equal(landed.fish.id,id);assert.match(await page.locator('#modal-content').textContent(),new RegExp(name,'i'));
   const art=await portrait('#catch-art');assert.ok(art.colors>=8);assert.ok(art.width>=120&&art.height>=100,JSON.stringify({w:art.width,h:art.height}));assert.match(art.label,new RegExp(landed.fish.name));
   portraits.push(art);await shot(scene+'-'+id+'-catch');await page.locator('#catch-keep').click();
   assert.ok((await state()).catches.some(f=>f.id===id));caught.push({id,name:landed.fish.name,nameEn:landed.fish.nameEn,weightKg:landed.fish.weightKg,offshoreMetres:bite.shoreSample.offshore,hookDepthMetres:bite.presentation.depth,portrait:art});
  }
  assert.notEqual(portraits[0].hash,portraits[1].hash,'species portraits must be visibly distinct');
  await page.locator('#journal-btn').click();
  assert.match(await page.locator('#modal-content').textContent(),/White croaker/i);assert.match(await page.locator('#modal-content').textContent(),/Jacksmelt/i);
  assert.equal(await page.locator('.catch-row').count(),2);
  for(let i=0;i<2;i++){const art=await portrait('#journal-fish-'+i);assert.ok(art.colors>=8);assert.equal(art.width,96);assert.equal(art.height,48);}
  await shot(scene+'-both-fish-journal');await page.setViewportSize({width:320,height:568});await shot(scene+'-both-fish-journal-small');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await visibleWithin('close-modal');
  checks.push({scene,ui:['purchase float rig and squid','equip float and bait','walk to surf and half-power cast','float waiting and small-screen controls','real encounter plus UI strike for each species','normal tension-controlled fight and landing','keep both fish and show distinct catch and journal portraits'],caught});
 }
 assert.deepEqual(errors,[]);
 const report={base,verifiedAt:new Date().toISOString(),checks,captures,errors,fixture:'Test-only response route; deterministic RNG, environment and time stepping; no injected fish or phase changes'};
 await fs.writeFile(new URL('browser-results.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
