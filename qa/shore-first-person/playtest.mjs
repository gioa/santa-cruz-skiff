import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../..',import.meta.url)),out=root+'/qa/shore-first-person',base=process.argv.includes('--public')?'https://joyx.design/santa-cruz-skiff/':'http://127.0.0.1:4197/';
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
if(!process.argv.includes('--public'))await page.route('**/pacifica-game.js?*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await fs.readFile(root+'/qa/shore-first-person/fixture.js','utf8')});});
const state=()=>page.locator('#beach-state').textContent().then(JSON.parse);
const shot=name=>page.screenshot({path:out+'/'+(process.argv.includes('--public')?'public-':'')+name+'.png',style:'#fight-view{filter:none!important} #toast{visibility:hidden!important}'});
const wait=async phase=>{await page.waitForFunction(p=>JSON.parse(document.getElementById('beach-state').textContent).phase===p,phase);};
async function setup(scene,{pier=false}={}){await page.goto(base+scene+'.html');await page.locator('#start-btn').click();await page.evaluate(pier=>window.shoreQA.setup({pier}),pier);await wait('bite');await page.locator('#beach-cast').click();await wait('fighting');await page.waitForTimeout(100);assert.equal((await state()).focusView.active,true);}
if(process.argv.includes('--natural')){
 await page.goto(base+'half-moon-bay.html');await page.locator('#start-btn').click();await page.locator('#walk-surf').click();await page.waitForFunction(()=>JSON.parse(document.getElementById('beach-state').textContent).canCast);
 await page.locator('#beach-cast').click();await wait('waiting');await wait('bite');await page.locator('#beach-cast').click();await wait('fighting');await shot('natural-phone');
 let held=false,begin=Date.now(),samples=0;
 while((await state()).phase==='fighting'&&Date.now()-begin<150000){
  const s=await state(),want=s.tension<.72&&(held||s.tension<.35);
  if(want&&!held){const b=await page.locator('#beach-reel').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();held=true;}
  else if(!want&&held){await page.mouse.up();held=false;}
  samples++;await page.waitForTimeout(120);
 }
 if(held)await page.mouse.up();assert.equal((await state()).phase,'landed');await shot('natural-catch');await page.locator('#catch-keep').click();await wait('walk');assert.equal((await state()).view,'overhead');
 const s=await state();assert.equal(s.stats.caught,1);assert.equal(s.stats.kept,1);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/'+(process.argv.includes('--public')?'public-':'')+'natural-results.json',JSON.stringify({fightWallMs:Date.now()-begin,samples,checks:['Natural walk/cast/wait/strike with no fixture invocation','Pointer hold/release controls tension and first-person reel','Catch kept and overhead view restored'],errors},null,2));
 console.log('PASS natural fight',Date.now()-begin);await browser.close();process.exit(0);
}
for(const scene of ['pacifica','half-moon-bay']){
 await setup(scene);
 for(const [name,width,height] of [['phone',390,844],['small-phone',320,568],['landscape',844,390],['desktop',1440,1000]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(80);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(60);
  const s=await state();assert.ok(s.paused);assert.ok(s.focusView.active);assert.equal(s.focusView.ground,'sand');
  assert.equal(await page.locator('#world').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  for(const id of ['beach-reel','beach-tension','settings-btn','fish-status']){
   const b=await page.locator('#'+id).boundingBox();assert.ok(b&&b.width>0&&b.height>0&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${scene} ${name} ${id} ${JSON.stringify(b)}`);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#app').evaluate(e=>e.classList.remove('focus-muted'));await shot(scene+'-'+name);
  await page.waitForTimeout(120);const after=await state();assert.equal(after.elapsed,s.elapsed);assert.equal(after.focusView.crankAngle,s.focusView.crankAngle);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
 const before=await state();await page.keyboard.down('f');await page.waitForTimeout(500);await page.keyboard.up('f');const held=await state();assert.notEqual(held.focusView.crankAngle,before.focusView.crankAngle);assert.ok(held.lineDistance<before.lineDistance);
 const stopped=held.focusView.crankAngle;await page.waitForTimeout(160);assert.equal((await state()).focusView.crankAngle,stopped);
 await page.locator('#settings-btn').click();const menu=await state();await page.waitForTimeout(160);assert.equal((await state()).elapsed,menu.elapsed);assert.ok((await state()).focusView.active);await page.keyboard.press('Escape');
 // Existing landing and release logic, with the fight brought to its final tick.
 await page.evaluate(()=>{const s=window.shoreQA.sim.state;s.lineDistance=2.6;s.fish.stamina=.1;});await page.keyboard.down('f');await wait('landed');await page.keyboard.up('f');await page.locator('#catch-release').waitFor();assert.ok((await state()).focusView.active);await shot(scene+'-landed');await page.locator('#catch-release').click();await wait('walk');assert.equal((await state()).focusView.active,false);assert.equal(await page.locator('#fight-view').isVisible(),false);
 // A break clears the input, so the next fish does not inherit a held reel.
 await page.evaluate(()=>window.shoreQA.setup());await wait('bite');await page.locator('#beach-cast').click();await wait('fighting');await page.keyboard.down('f');await page.evaluate(()=>{window.shoreQA.sim.state.tension=1;window.shoreQA.sim.state.lineStress=2;});await wait('walk');await page.keyboard.up('f');assert.equal((await state()).focusView.active,false);
 checks.push(scene+': 4 viewport bounds, pause/focus, F reel and release, menu freeze, landed/release, break exit');
}
await setup('pacifica',{pier:true});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(50);assert.equal((await state()).focusView.ground,'pier');await shot('pacifica-pier');
await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.shoreQA.sim.rng=()=>0;window.shoreQA.sim.checkPier(30);});await wait('walk');await page.locator('#modal-layer').waitFor();assert.equal((await state()).focusView.active,false);assert.ok((await state()).inspection);checks.push('Pier uses concrete and rail; inspection immediately exits first person');
assert.deepEqual(errors,[]);await fs.writeFile(out+'/local-results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));await browser.close();
