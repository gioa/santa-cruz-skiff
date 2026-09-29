import test from 'node:test';
import assert from 'node:assert/strict';
const {playPixelStrategy,PIXEL_STRATEGIES}=await import('../scripts/calibrate-pixel-population.mjs');
const {readFile}=await import('node:fs/promises');
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation}=await import('../dist/pixel-sim.js');
const {serializePopulation}=await import('../dist/fish-population.js');

const SEEDS=Array.from({length:8},(_,i)=>2000+i*7919);
const play=id=>SEEDS.map(seed=>playPixelStrategy(PIXEL_STRATEGIES.find(s=>s.id===id),seed));
const within=(results,seconds)=>results.filter(r=>r.time!==null&&r.time<=seconds).length;

test('Santa Cruz bites come from schools: habitat decides the species, soaking beats recasting',()=>{
 const reef=play('reef · squid · single-hook bottom'),sand=play('sand · squid · single-hook bottom'),recast=play('reef · squid · recast every 30 s');
 assert.ok(within(reef,600)>=6&&within(sand,600)>=6,'bait on the bottom usually finds fish within ten minutes');
 assert.ok(reef.filter(r=>r.species).some(r=>/岩鱼|单线鱼/.test(r.species)),'reef bait meets rockfish or lingcod');
 assert.ok(sand.filter(r=>r.species).every(r=>!/岩鱼/.test(r.species)),'no rockfish on open sand');
 assert.ok(within(reef,300)>within(recast,300),'repeatedly pulling the bait out costs bites');
});

test('the population is saved with the trip and restored exactly',()=>{
 const sim=new PixelSimulation({rng:()=>.5,weatherSeed:5,dailyWeather:true});sim.start();
 for(let i=0;i<200;i++)sim.step(.25);
 const saved=sim.snapshot();assert.ok(saved.population.groups.length>0);
 const restored=new PixelSimulation({saved,rng:()=>{throw new Error('reload rerolled fish');}});
 assert.deepEqual(serializePopulation(restored.population).groups,saved.population.groups);
});
