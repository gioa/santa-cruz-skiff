import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCatchLedger} from '../dist/fishing-regulations.js';
import {inspectionFindings,inspectionReportMarkup} from '../dist/pixel-inspection-report.js';
const fish=(extra={})=>({name:'长蛇齿单线鱼',latin:'Ophiodon elongatus',catchId:'1',length:40,kg:1,kept:true,caughtAt:'2026-03-10T20:00:00Z',caughtGPS:{lat:36.9505,lon:-122.0288},hookCount:4,lineCount:2,hasDescendingDevice:false,landingNetDiameterInches:12,...extra});
test('inspection explanations use the actual fish evidence for size, season and each gear offense',()=>{
 const ledger=[fish()],report=assessCatchLedger(ledger),findings=inspectionFindings(report.violations,ledger),details=Object.fromEntries(findings.map(f=>[f.code,f.detail]));
 assert.match(findings[0].fishName,/Lingcod/);assert.match(details.undersize,/15.7 in.*22 in/);
 assert.match(details.closed_groundfish_season,/2026-03-10.*2026-04-01.*2026-12-31/);
 assert.match(details.groundfish_hook_limit,/实际 4 个钩.*2 个钩/);assert.match(details.groundfish_line_limit,/实际 2 条钓线.*1 条钓线/);
 assert.match(details.landing_net_required,/12 in.*18 in/);assert.match(details.descending_device_required,/未携带/);
 assert.equal(findings.length,report.violations.length);
});
test('each surplus fish identifies the date and the actual count against its species limit',()=>{
 const ledger=Array.from({length:3},(_,i)=>fish({catchId:String(i),length:70,caughtAt:'2026-09-27T19:00:00Z',hookCount:1,lineCount:1,hasDescendingDevice:true,landingNetDiameterInches:20}));
 const findings=inspectionFindings(assessCatchLedger(ledger).violations,ledger);
 assert.match(findings.find(f=>f.code==='daily_species_bag').detail,/2026-09-27.*3 尾.*2 尾/);
 assert.match(findings.find(f=>f.code==='species_possession').detail,/3 尾.*2 尾/);
});
test('inspection notice includes every finding, whole-catch confiscation and credit debt with escaped text',()=>{
 const html=inspectionReportMarkup({fine:100,paid:25,debt:75,findings:[{fishName:'Lingcod <img>',detail:'40 in < 50 in'},{fishName:'Salmon',detail:'使用了带倒刺钩'}],confiscated:[{name:'Lingcod'},{name:'Blue Rockfish'}]});
 assert.match(html,/全部鱼获已没收 · 2 尾/);assert.match(html,/Blue Rockfish/);assert.match(html,/合规尺寸鱼/);assert.match(html,/100/);assert.match(html,/75/);assert.match(html,/带倒刺钩/);assert.match(html,/&lt;img&gt;/);assert.ok(!html.includes('<img>'));
});
