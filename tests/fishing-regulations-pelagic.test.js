import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCatch,assessCatchLedger,identifyRegulatedSpecies} from '../dist/fishing-regulations.js';

const GPS={lat:36.9595,lon:-122.0233};
const rig={hookCount:1,lineCount:1,rodCount:1,barbless:true,singlePoint:true,singleShank:true,bait:false,trolling:false,hasDescendingDevice:true,landingNetDiameterInches:18};
const fish=(speciesId,extra={})=>({speciesId,caughtAt:'2026-09-27T13:00:00Z',caughtGPS:GPS,length:80,weight:5,kept:true,rig:{...rig},...extra});
const has=(r,code)=>r.violations.some(v=>v.code===code);
const unknown=(r,code)=>r.unsupported.some(v=>v.code===code);
const catches=(speciesId,n,extra={})=>Array.from({length:n},(_,i)=>fish(speciesId,{catchId:`${speciesId}-${i}`,caughtAt:`2026-09-27T13:${String(i).padStart(2,'0')}:00Z`,...extra}));

test('new species resolve by scientific name without conflating salmon species',()=>{
 for(const [name,id]of [['Sebastes miniatus','vermilion_rockfish'],['Oncorhynchus tshawytscha','chinook_salmon'],['Atractoscion nobilis','white_seabass'],['Sarda chiliensis lineolata','pacific_bonito'],['Sarda lineolata','pacific_bonito']])assert.equal(identifyRegulatedSpecies(name)?.id,id);
 assert.equal(identifyRegulatedSpecies('salmon'),null);
});

test('vermilion and sunset share the Central two-fish bag and remain in RCG total',()=>{
 const mixed=[fish('vermilion_rockfish',{catchId:'v'}),fish('sunset_rockfish',{catchId:'s'}),fish('vermilion_rockfish',{catchId:'v2'})];
 assert.equal(has(assessCatchLedger(mixed.slice(0,2)),'daily_species_bag'),false);
 const r=assessCatchLedger(mixed);assert.equal(has(r,'daily_species_bag'),true);assert.equal(r.possession.rcg,3);
 assert.equal(r.violations.find(v=>v.code==='daily_species_bag').group,'vermilion_sunset');
 assert.equal(has(assessCatch(fish('vermilion_rockfish',{caughtAt:'2026-03-31'})),'closed_groundfish_season'),true);
});

test('salmon date and changing size minimum use the verified Monterey 2026 calendar',()=>{
 for(const date of ['2026-04-10','2026-10-01'])assert.equal(has(assessCatch(fish('chinook_salmon',{caughtAt:date})),'closed_salmon_season'),true);
 for(const date of ['2026-04-11','2026-08-31','2026-09-01','2026-09-30'])assert.equal(has(assessCatch(fish('chinook_salmon',{caughtAt:date})),'closed_salmon_season'),false);
 assert.equal(has(assessCatch(fish('chinook_salmon',{caughtAt:'2026-05-15',length:55})),'undersize'),true);
 assert.equal(has(assessCatch(fish('chinook_salmon',{caughtAt:'2026-05-16',length:55})),'undersize'),false);
 assert.equal(has(assessCatch(fish('chinook_salmon',{length:50.8})),'undersize'),false);
 assert.equal(has(assessCatch(fish('chinook_salmon',{length:50.79})),'undersize'),true);
});

test('salmon missing hook details remain unsupported rather than fabricated violations',()=>{
 const r=assessCatch(fish('chinook_salmon',{rig:{hookCount:1,lineCount:1,landingNetDiameterInches:18}}));
 assert.equal(r.status,'unsupported');assert.equal(r.violations.length,0);
 for(const field of ['barbless_not_recorded','singlePoint_not_recorded','singleShank_not_recorded','rodCount_not_recorded'])assert.equal(unknown(r,field),true);
 const bad=assessCatch(fish('chinook_salmon',{rig:{...rig,barbless:false,rodCount:2,hookCount:3}}));
 for(const code of ['salmon_barbless_required','salmon_rod_limit','salmon_hook_limit'])assert.equal(has(bad,code),true);
});

test('non-trolled salmon bait distinguishes circle hooks from artificial lure and trolling methods',()=>{
 const f=fish('chinook_salmon',{rig:{...rig,bait:true,trolling:false,circleHook:false}});
 assert.equal(has(assessCatch(f),'salmon_circle_hook_required'),true);
 for(const extra of [{bait:false},{trolling:true}])assert.equal(has(assessCatch({...f,rig:{...f.rig,...extra}}),'salmon_circle_hook_required'),false);
 const missing=assessCatch({...f,rig:{...f.rig,trolling:undefined,circleHook:undefined}});assert.equal(has(missing,'salmon_circle_hook_required'),false);assert.equal(unknown(missing,'salmon_bait_or_trolling_not_recorded'),true);
 const paired={...f,rig:{...f.rig,circleHook:true,hookCount:2,hardTied:false,hookSpacingInches:5.1}};
 assert.equal(has(assessCatch(paired),'salmon_hard_tied_required'),true);assert.equal(has(assessCatch(paired),'salmon_hook_spacing'),true);
 assert.equal(assessCatch({...paired,rig:{...paired.rig,hardTied:true,hookSpacingInches:5}}).status,'supported');
});

test('salmon aboard extends gear requirements to other captures, and filleting is checked explicitly',()=>{
 const f=fish('pacific_mackerel',{salmonAboardAtCapture:true,rig:{...rig,barbless:false}});
 assert.equal(has(assessCatch(f),'salmon_barbless_required'),true);
 assert.equal(has(assessCatch({...f,caughtAt:'2026-10-01'}),'salmon_closed_area_gear'),true);
 assert.equal(has(assessCatch(fish('chinook_salmon',{filleted:true})),'salmon_fillet_on_vessel'),true);
 assert.equal(has(assessCatch(fish('chinook_salmon',{rig:{...rig,sinkerLb:5}})),'salmon_sinker_limit'),false);
 assert.equal(has(assessCatch(fish('chinook_salmon',{rig:{...rig,sinkerLb:5,breakawayWeight:false}})),'salmon_sinker_limit'),true);
});

test('white seabass uses current 28 inch total limit and three-fish local bag, not a proposed limit',()=>{
 assert.equal(has(assessCatch(fish('white_seabass',{length:71.12})),'undersize'),false);
 assert.equal(has(assessCatch(fish('white_seabass',{length:71.11})),'undersize'),true);
 assert.equal(has(assessCatch(fish('white_seabass',{length:undefined,alternateLengthCm:50.8})),'undersize'),false);
 assert.equal(has(assessCatchLedger(catches('white_seabass',3,{caughtAt:'2026-04-01'})),'daily_species_bag'),false);
 assert.equal(has(assessCatchLedger(catches('white_seabass',4)),'daily_species_bag'),true);
 assert.equal(has(assessCatchLedger(catches('chinook_salmon',3)),'daily_species_bag'),true);
});

test('small bonito are legal within the five-fish allowance while regular bonito can fill the ten-fish bag',()=>{
 const small=catches('pacific_bonito',6,{forkLengthCm:45,weight:1.4});
 assert.equal(assessCatchLedger(small.slice(0,5)).status,'supported');
 assert.equal(has(assessCatchLedger(small),'daily_small_bonito_bag'),true);
 const fiveLarge=catches('pacific_bonito',5,{forkLengthCm:61,weight:2,catchId:undefined,caughtAt:'2026-09-27T14:00:00Z'});
 assert.equal(assessCatchLedger([...small.slice(0,5),...fiveLarge]).status,'supported');
 assert.equal(has(assessCatchLedger([...small.slice(0,5),...fiveLarge,fish('pacific_bonito')]),'daily_species_bag'),true);
});

test('bonito fork length and weight alternatives never substitute total length or invent missing evidence',()=>{
 const totalOnly=assessCatchLedger(catches('pacific_bonito',6,{length:45,weight:1.4}));
 assert.equal(totalOnly.violations.length,0);assert.equal(unknown(totalOnly,'bonito_fork_length_or_weight_not_recorded'),true);
 assert.equal(assessCatch(fish('pacific_bonito',{weight:5*.45359237})).status,'supported');
 assert.equal(assessCatch(fish('pacific_bonito',{forkLengthCm:60.96,weight:undefined})).status,'supported');
 assert.equal(assessCatchLedger(catches('pacific_bonito',5,{lengthType:'fork',length:40,weight:.9})).status,'supported');
});

test('bonito daily retained allowance survives sale and possession survives the local midnight',()=>{
 const small=catches('pacific_bonito',6,{forkLengthCm:45,weight:1.4});small[0].settled=true;
 const sold=assessCatchLedger(small);assert.equal(has(sold,'daily_small_bonito_bag'),true);assert.equal(has(sold,'small_bonito_possession'),false);
 small[0].settled=false;small[5].caughtAt='2026-09-28T13:00:00Z';const stored=assessCatchLedger(small);
 assert.equal(has(stored,'daily_small_bonito_bag'),false);assert.equal(has(stored,'small_bonito_possession'),true);
});

test('salmon and bonito have legal pelagic MPA classification but white seabass does not',()=>{
 const caughtGPS={lat:36.83,lon:-122};
 for(const id of ['chinook_salmon','pacific_bonito'])assert.equal(has(assessCatch(fish(id,{caughtGPS})),'protected_area_take'),false);
 assert.equal(has(assessCatch(fish('white_seabass',{caughtGPS})),'protected_area_take'),true);
});

test('live catches use actual kg before the catalog reference weight',()=>{
 const live=catches('pacific_bonito',6,{lengthType:'fork',length:45,kg:1.4,weight:5});assert.equal(has(assessCatchLedger(live),'daily_small_bonito_bag'),true);
 const big=catches('pacific_bonito',6,{lengthType:'fork',length:55,kg:2.5,weight:1.8});assert.equal(has(assessCatchLedger(big),'daily_small_bonito_bag'),false);
});
