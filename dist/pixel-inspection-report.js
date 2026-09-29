import {fishDisplayName} from './pixel-fish-names.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=value=>Number(value).toFixed(1).replace(/\.0$/,'');
const rigValue=(fish,key)=>fish?.[key]??fish?.rig?.[key];
export function violationDetail(v,fish={}){
 const prefix=v.message||'检查确认违规。',actual=v.actual,maximum=v.maximum;
 if(v.code==='undersize')return `实测全长 ${n(v.actualCm/2.54)} in；最低允许 ${n(v.minimumInches??v.minimumCm/2.54)} in。`;
 if(v.code==='protected_area_take')return `捕获地点：${v.areaName||v.areaId}。${prefix}`;
 if(v.seasonOpens)return `捕获日期：${(Number.isFinite(Date.parse(fish.caughtAt))?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date(fish.caughtAt)):'未记录')}；开放日期：${v.seasonOpens} 至 ${v.seasonCloses}。${prefix}`;
 if(v.category==='bag')return `${prefix}${v.date?`日期 ${v.date}；`:''}已计入 ${actual} 尾，限额 ${maximum} 尾。`;
 const required={salmon_barbless_required:'使用了带倒刺钩；要求无倒刺钩。',salmon_single_point_required:'使用了多钩尖钩；要求单钩尖。',salmon_single_shank_required:'使用了非单钩柄钩；要求单钩柄。',salmon_circle_hook_required:'非拖钓天然饵使用了非圆形钩；要求圆形钩。',salmon_hard_tied_required:'非拖钓饵钓的双钩未固定绑结；要求双钩固定绑结。',descending_device_required:'船上未携带可立即使用的降鱼器；捕捞该底栖鱼种需要降鱼器。',salmon_fillet_on_vessel:'鲑鱼在上岸前已切成鱼片；要求完整带回岸上。'};
 if(required[v.code])return required[v.code];
 if(v.code==='landing_net_required'){const size=rigValue(fish,'landingNetDiameterInches');return `${size===false?'未携带可用抄网':Number.isFinite(size)?`抄网开口 ${n(size)} in`:'无符合要求的可用抄网'}；要求开口至少 ${n(v.minimumInches)} in。`;}
 if(v.code==='salmon_sinker_limit')return `坠重 ${n(rigValue(fish,'sinkerLb'))} lb，超过 4 lb 且没有独立脱离装置。`;
 if(v.code==='nearshore_hook_gap')return `钩内最宽距离 ${n(actual)} in；距岸 1,000 yd 内最多 ${n(v.maximumInches)} in。`;
 if(Number.isFinite(actual)&&Number.isFinite(maximum)){
  const unit=v.code.includes('spacing')?'in':v.code.includes('hook_limit')?'个钩':v.code.includes('rod_limit')?'支竿':'条钓线';
  return `${prefix}实际 ${n(actual)} ${unit}，最多 ${n(maximum)} ${unit}。`;
 }
 return prefix;
}
export function inspectionFindings(violations,catches){
 return violations.map(v=>{const fish=catches[v.index]||{};return{catchId:fish.catchId,catchNumber:v.index+1,fishName:fishDisplayName(fish)||'本次捕捞',code:v.code,detail:violationDetail(v,fish)};});
}
export function inspectionReportMarkup(report){
 const findings=report.findings||[],count=report.confiscated?.length||0;
 return `<div class="staff-banner"><p><b>鱼警检查结果</b>${findings.length?'以下行为违反本游戏采用的规则，现开具处罚记录。':'本次没有查出违规。'}</p></div>`+
 (findings.length?`<h3>具体违规</h3><ol class="inspection-findings">${findings.map(f=>`<li><b>${f.catchNumber?`第 ${Number(f.catchNumber)} 尾 · `:''}${esc(f.fishName?fishDisplayName(f.fishName):f.location||'本次捕捞')}</b><p>${esc(f.detail)}</p></li>`).join('')}</ol>`:'')+
 `<div class="catch-stats"><div><strong>${report.fine||0}</strong><small>罚款 · 潮汐点</small></div><div><strong>${report.paid||0}</strong><small>已扣点数</small></div><div><strong>${report.debt||0}</strong><small>待缴罚款</small></div></div>`+
 `<h3>${findings.length?`全部鱼获已没收 · ${count} 尾`:'鱼获检查完毕'}</h3>`+
 (count?`<p class="credits-note">包括合规尺寸鱼在内，当前携带的全部鱼获均已没收，不能兑换积分。</p><ul>${report.confiscated.map(f=>`<li>${esc(fishDisplayName(f.displayName||f)||'鱼获')}</li>`).join('')}</ul>`:findings.length?'<p class="credits-note">当前没有携带鱼获。</p>':'')+
 `<p class="credits-note">${report.debt?'未缴罚款会从之后的收入中抵扣。':''}罚款与整批没收为游戏处罚设定。</p>`;
}
