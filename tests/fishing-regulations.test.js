import test from 'node:test';
import assert from 'node:assert/strict';
import {RULESET_2026,REGULATED_SPECIES,MPA_AREAS,identifyRegulatedSpecies,marineProtectionAt,assessCatch,assessCatchLedger} from '../dist/fishing-regulations.js';
const GPS={lat:36.9595,lon:-122.0233};
const evidence={caughtAt:'2026-09-27T13:00:00Z',caughtGPS:GPS,hookCount:1,lineCount:1,hasDescendingDevice:true,landingNetDiameterInches:18};
const fish=(speciesId='blue_rockfish',extra={})=>({...evidence,speciesId,length:60,kept:true,...extra});
const has=(result,code)=>result.violations.some(v=>v.code===code);
const ledger=(id,n,extra={})=>Array.from({length:n},(_,i)=>fish(id,{catchId:`${id}-${i}`,caughtAt:`2026-09-27T13:${String(i).padStart(2,'0')}:00Z`,...extra}));

test('five existing game species resolve by exact Chinese/scientific names without treating unspecified halibut as California halibut',()=>{
 const names=[['蓝岩鱼','blue_rockfish'],['铜岩鱼','copper_rockfish'],['Paralichthys californicus','california_halibut'],['Scomber japonicus','pacific_mackerel'],['Ophiodon elongatus','lingcod']];for(const [name,id]of names)assert.equal(identifyRegulatedSpecies(name)?.id,id);assert.equal(identifyRegulatedSpecies('halibut'),null);assert.equal(RULESET_2026.live,false);
});

test('22 inch total length is exactly 55.88cm for California halibut and lingcod; rockfish have no minimum',()=>{
 for(const id of['california_halibut','lingcod']){assert.equal(has(assessCatch(fish(id,{length:55.87})),'undersize'),true);assert.equal(has(assessCatch(fish(id,{length:55.88})),'undersize'),false);assert.equal(has(assessCatch(fish(id,{length:54,kept:false})),'undersize'),false);}assert.equal(assessCatch(fish('blue_rockfish',{length:14})).status,'supported');assert.equal(assessCatch(fish('copper_rockfish',{length:14})).status,'supported');
});

test('2026 Central boat groundfish season opens April1, remains all-depth through Dec31, and excludes Jan-March',()=>{
 for(const id of['blue_rockfish','copper_rockfish','lingcod']){for(const date of['2026-01-01','2026-03-31'])assert.equal(has(assessCatch(fish(id,{caughtAt:date})),'closed_groundfish_season'),true);for(const date of['2026-04-01','2026-12-31'])assert.equal(assessCatch(fish(id,{caughtAt:date,depth:250})).status,'supported');}assert.equal(assessCatch(fish('pacific_mackerel',{caughtAt:'2026-02-01'})).status,'supported');
});

test('copper one, RCGcombinedten, halibuttwo and lingcodtwo are separate retained-day limits',()=>{
 assert.equal(has(assessCatchLedger(ledger('copper_rockfish',2)),'daily_species_bag'),true);const rcg=[...ledger('blue_rockfish',10),fish('copper_rockfish',{catchId:'copper-last',caughtAt:'2026-09-27T14:00:00Z'})];assert.equal(has(assessCatchLedger(rcg),'daily_rcg_bag'),true);for(const id of['california_halibut','lingcod']){assert.equal(has(assessCatchLedger(ledger(id,2)),'daily_species_bag'),false);assert.equal(has(assessCatchLedger(ledger(id,3)),'daily_species_bag'),true);}assert.equal(assessCatchLedger(ledger('pacific_mackerel',30)).status,'supported');
});

test('trading or confiscating catches does not reset their dailybag; a new local calendar day does',()=>{
 const day=ledger('california_halibut',3);day[0].settled=true;day[1].confiscated=true;let result=assessCatchLedger(day);assert.equal(has(result,'daily_species_bag'),true);assert.equal(result.possession.species.california_halibut,1);day[2].caughtAt='2026-09-28T13:02:00Z';result=assessCatchLedger(day);assert.equal(has(result,'daily_species_bag'),false);assert.equal(result.daily['2026-09-27'].species.california_halibut,2);assert.equal(result.daily['2026-09-28'].species.california_halibut,1);
});

test('daily bag and present possession remain distinct across overnight storage, and releasedfish do not consume bags',()=>{
 const stored=[...ledger('california_halibut',2),fish('california_halibut',{catchId:'nextday',caughtAt:'2026-09-28T13:00:00Z'})],r=assessCatchLedger(stored);assert.equal(has(r,'daily_species_bag'),false);assert.equal(has(r,'species_possession'),true);assert.equal(assessCatchLedger(ledger('california_halibut',5,{kept:false,length:30})).status,'supported');
});

test('dates are interpreted in Santa Cruz local time and not reset by a six-am game display',()=>{
 const r=assessCatchLedger([fish('lingcod',{catchId:'a',caughtAt:'2026-09-28T06:59:00Z'}),fish('lingcod',{catchId:'b',caughtAt:'2026-09-28T07:01:00Z'})]);assert.equal(r.results[0].date,'2026-09-27');assert.equal(r.results[1].date,'2026-09-28');assert.equal(assessCatch(fish('lingcod',{caughtAt:'2026-09-27T06:00:00'})).status,'unsupported');
});

test('groundfish hook/line and release-device rules use recorded tackle evidence, including mackerelwithgroundfishaboard',()=>{
 const ground=assessCatch(fish('blue_rockfish',{hookCount:6,lineCount:2,hasDescendingDevice:false}));for(const code of['groundfish_hook_limit','groundfish_line_limit','descending_device_required'])assert.equal(has(ground,code),true);assert.equal(assessCatch(fish('pacific_mackerel',{hookCount:6,lineCount:2})).status,'supported');assert.equal(has(assessCatch(fish('pacific_mackerel',{hookCount:6,groundfishAboardAtCapture:true})),'groundfish_hook_limit'),true);assert.equal(has(assessCatch(fish('california_halibut',{landingNetDiameterInches:12})),'landing_net_required'),true);const missing=assessCatch({speciesId:'blue_rockfish',length:30,caughtAt:evidence.caughtAt,caughtGPS:GPS,kept:true});assert.equal(missing.status,'unsupported');assert.equal(missing.violations.length,0);
});

test('nearshorewireandlargehookfindings require actual recorded distance and measurements',()=>{
 const input=fish('pacific_mackerel',{shoreDistanceMeters:100,wireLeader:true,hookGapInches:2});assert.equal(has(assessCatch(input),'nearshore_wire_leader'),true);assert.equal(has(assessCatch(input),'nearshore_hook_gap'),true);assert.equal(assessCatch({...input,shoreDistanceMeters:1000}).status,'supported');assert.equal(has(assessCatch({...input,shoreDistanceMeters:undefined}),'nearshore_wire_leader'),false);
});

test('emergency nearshore tackle restriction begins on July3 rather than the June adoption date',()=>{
 const input=fish('pacific_mackerel',{shoreDistanceMeters:914.4,wireLeader:true,hookGapInches:2});
 for(const caughtAt of ['2026-01-01','2026-06-17','2026-07-02'])assert.equal(assessCatch({...input,caughtAt}).status,'supported');
 for(const caughtAt of ['2026-07-03','2026-12-31'])for(const code of ['nearshore_wire_leader','nearshore_hook_gap'])assert.equal(has(assessCatch({...input,caughtAt}),code),true);
 assert.equal(has(assessCatch({...input,shoreDistanceMeters:-1}),'nearshore_wire_leader'),false);
 assert.equal(assessCatch({...input,wireLeader:false,hookGapInches:1.5}).status,'supported');
});

test('Natural Bridges is no-take; Soquel permits Pacific mackerel but not rockfish; actual game spots are outside',()=>{
 const natural={lat:36.9544,lon:-122.1},soquel={lat:36.83,lon:-122.0};assert.equal(marineProtectionAt(natural).areas[0].id,'natural_bridges_smr');assert.equal(has(assessCatch(fish('pacific_mackerel',{caughtGPS:natural})),'protected_area_take'),true);assert.equal(assessCatch(fish('pacific_mackerel',{caughtGPS:soquel})).status,'supported');assert.equal(has(assessCatch(fish('blue_rockfish',{caughtGPS:soquel})),'protected_area_take'),true);for(const [lon,lat]of[[-122.0233,36.9595],[-122.0288,36.9505],[-122.0118,36.9585],[-121.9845,36.9515]])assert.deepEqual(marineProtectionAt({lat,lon}).areas,[]);
});

test('static GIS boundary uncertainty is unsupported rather than a false geographic violation',()=>{
 const vertex=MPA_AREAS[0].rings[0][0],caughtGPS={lon:vertex[0],lat:vertex[1]},r=assessCatch(fish('blue_rockfish',{caughtGPS}));assert.equal(has(r,'protected_area_take'),false);assert.ok(r.unsupported.some(x=>x.code==='mpa_boundary_uncertain'));assert.ok(MPA_AREAS[0].rings[0].length>1000,'retain official detailed coastal polygon');
});

test('unknownspecies, future rules, absentcapturehistory and unstudied MPA areas never silently become illegal',()=>{
 for(const f of[fish('unknown',{name:'mysteryfish'}),fish('lingcod',{length:1,caughtAt:'2027-01-01'}),fish('blue_rockfish',{caughtAt:undefined})]){const r=assessCatch(f);assert.equal(r.status,'unsupported');assert.equal(r.violations.length,0);}const legacy=assessCatchLedger([fish('lingcod',{caughtAt:undefined})],{date:'2026-01-01'});assert.ok(legacy.unsupported.some(u=>u.code==='missing_capture_date'));assert.equal(legacy.violations.length,0);assert.equal(marineProtectionAt({lat:36.3,lon:-122}).supported,false);assert.equal(assessCatch(fish('lingcod',{caughtAt:new Date('invalid')})).status,'unsupported');
});

test('prohibited rockfish are correctly separate species, results do not mutate catches, and duplicateIDs do not inflate limits',()=>{
 for(const s of REGULATED_SPECIES.filter(s=>s.prohibited))assert.equal(has(assessCatch(fish(s.id)),'prohibited_species'),true);const a=fish('copper_rockfish',{catchId:'same'}),before=structuredClone(a),r=assessCatchLedger([a,a]);assert.deepEqual(a,before);assert.equal(r.daily['2026-09-27'].species.copper_rockfish,1);assert.ok(r.unsupported.some(u=>u.code==='duplicate_catch_id'));assert.equal(has(r,'daily_species_bag'),false);
});

test('white croaker has no minimum, a ten-fish bag and its own classification; sanddab is unlimited and exempt from RCG season/gear',()=>{
 for(const [name,id]of[['白石首鱼','white_croaker'],['Genyonemus lineatus','white_croaker'],['太平洋沙鲽','pacific_sanddab'],['Citharichthys sordidus','pacific_sanddab']])assert.equal(identifyRegulatedSpecies(name)?.id,id);
 for(const id of['white_croaker','pacific_sanddab'])for(const caughtAt of['2026-01-01','2026-03-31','2026-12-31'])assert.equal(assessCatch(fish(id,{length:8,caughtAt,hookCount:6,lineCount:2,depth:300})).status,'supported');
 const croaker=assessCatchLedger(ledger('white_croaker',11));assert.equal(has(croaker,'daily_species_bag'),true);assert.equal(has(croaker,'species_possession'),true);assert.equal(has(croaker,'daily_rcg_bag'),false);assert.equal(has(croaker,'daily_general_bag'),false);
 const sanddab=assessCatchLedger(ledger('pacific_sanddab',30));assert.equal(sanddab.status,'supported');assert.equal(sanddab.possession.general,0);assert.equal(sanddab.possession.rcg,0);
 assert.equal(assessCatch(fish('white_croaker',{hasDescendingDevice:false})).status,'supported');
 assert.equal(has(assessCatch(fish('pacific_sanddab',{hasDescendingDevice:false})),'descending_device_required'),true);
 const restricted=assessCatch(fish('pacific_sanddab',{hookCount:6,lineCount:2,groundfishAboardAtCapture:true}));assert.equal(has(restricted,'groundfish_hook_limit'),true);assert.equal(has(restricted,'groundfish_line_limit'),true);
 for(const id of['white_croaker','pacific_sanddab'])assert.equal(has(assessCatch(fish(id,{caughtGPS:{lat:36.83,lon:-122.0}})),'protected_area_take'),true);
});

test('general twenty-fish limit counts white croaker independently from species/RCG bags and excludes sanddab and mackerel',()=>{
 const twenty=[...ledger('white_croaker',10),...ledger('blue_rockfish',10)],unlimited=[...ledger('pacific_sanddab',30),...ledger('pacific_mackerel',30)];
 const allowed=assessCatchLedger([...twenty,...unlimited]);assert.equal(allowed.status,'supported');assert.equal(allowed.possession.general,20);assert.equal(allowed.daily['2026-09-27'].general,20);assert.equal(allowed.possession.rcg,10);
 const halibut=fish('california_halibut',{catchId:'twenty-first',caughtAt:'2026-09-27T15:00:00Z'}),excess=assessCatchLedger([...twenty,...unlimited,halibut]);
 assert.equal(has(excess,'daily_general_bag'),true);assert.equal(has(excess,'general_possession'),true);assert.equal(has(excess,'daily_species_bag'),false);assert.equal(has(excess,'daily_rcg_bag'),false);
 const last=excess.results.find(r=>r.catchId==='twenty-first');assert.deepEqual(last.violations.map(v=>v.code).sort(),['daily_general_bag','general_possession']);
 const traded=assessCatchLedger([...twenty.map(f=>({...f,settled:true})),halibut]);assert.equal(has(traded,'daily_general_bag'),true);assert.equal(has(traded,'general_possession'),false);
});
