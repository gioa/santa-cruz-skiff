import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation}=await import('../dist/pixel-sim.js');
const {mountRodWorkbench}=await import('../dist/pixel-rod-ui.js');
// Minimal DOM surface: execute real workbench rendering and click handlers.
function panel(sim){
 const slots=['rig','bait','sinker'].map(supplySlot=>({dataset:{supplySlot}}));
 const holder={innerHTML:'',classList:{toggle(){}},querySelectorAll(){return [...this.innerHTML.matchAll(/data-supply="(\d+)"/g)].map(m=>({dataset:{supply:m[1]}}));}};
 const hold={};const root={innerHTML:'',querySelectorAll(s){return s==='[data-supply-slot]'?slots:[];},querySelector(s){return s==='#hold-rod'?hold:holder;}};
 mountRodWorkbench(root,{sim});return{root,holder,choose(slot){slots.find(s=>s.dataset.supplySlot===slot).onclick();return holder.innerHTML;}};
}
function ready(){const sim=new PixelSimulation({rng:()=>.5});sim.start();return sim;}
test('rod workbench hides exhausted bait, spare rigs and sinkers but retains mounted equipment in its slots',()=>{
 const sim=ready(),p=sim.state.profile;p.stock={squid:0,anchovy:2,shrimp:0,sardine:0,jig:0};p.rigStock.bottom=[];p.sinkerStock={1:0,2:2,3:0,4:0};
 const ui=panel(sim);assert.match(ui.holder.innerHTML,/没有备用钓组/);assert.match(ui.root.innerHTML,/单钩沉底|沉底组/);
 const bait=ui.choose('bait');assert.match(bait,/鳀鱼饵/);assert.doesNotMatch(bait,/鱿鱼条|虾饵|沙丁鱼饵|软饵|库存 × 0/);assert.match(ui.root.innerHTML,/鱿鱼条/,'installed bait remains visible');
 const weights=ui.choose('sinker');assert.match(weights,/>2 oz</);assert.match(weights,/取下铅坠/);assert.doesNotMatch(weights,/>3 oz<|>1 oz<|库存 × 0/);assert.match(ui.root.innerHTML,/>3 oz</,'mounted weight remains visible in the slot');
});
test('using the last bait removes its replacement option; taking off a sinker makes it available again',()=>{
 const sim=ready(),p=sim.state.profile;p.stock.anchovy=1;
 assert.ok(sim.replaceBait('rod','anchovy').ok);const ui=panel(sim);assert.doesNotMatch(ui.choose('bait'),/鳀鱼饵/);assert.match(ui.root.innerHTML,/鳀鱼饵/);
 p.sinkerStock[3]=0;assert.ok(sim.replaceSinker('rod',null).ok);assert.match(ui.choose('sinker'),/>3 oz</);assert.doesNotMatch(ui.holder.innerHTML,/取下铅坠/);
});
test('empty bait and sinker boxes show honest empty states without listing spent consumables',()=>{
 const sim=ready(),p=sim.state.profile;p.stock={};p.rodSupplies.rod.bait.condition=0;p.rodSupplies.rod.sinkerOz=null;p.sinkerStock={};
 const ui=panel(sim);assert.match(ui.choose('bait'),/没有可用鱼饵/);assert.doesNotMatch(ui.root.innerHTML,/鱿鱼条/);assert.match(ui.root.innerHTML,/未装鱼饵/);
 assert.match(ui.choose('sinker'),/没有备用铅坠/);assert.doesNotMatch(ui.holder.innerHTML,/data-supply=/);
});
