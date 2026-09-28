import {rigHookLabel} from './pixel-hook-label.js?v=20260928-pixel-v65';
import {formatSinker} from './units.js?v=20260928-pixel-v65';
import {GEAR_CATALOG} from './equipment.js?v=20260928-pixel-v65';
import {RIG_PROFILES,getRigProfile} from './fishing-rigs.js?v=20260928-pixel-v65';
import {drawItemIcon} from './pixel-item-icons.js?v=20260928-pixel-v65';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const baits=[['squid','鱿鱼条','bait'],['anchovy','鳀鱼饵','bait_anchovy'],['shrimp','虾饵','bait_shrimp'],['sardine','沙丁鱼饵','bait_sardine'],['jig','软饵','bait_soft']];
const rodName=id=>GEAR_CATALOG.find(g=>g.id===id)?.name||id;
export const supplyCondition=(condition,bait=false)=>!(condition>.08)?(bait?'需换饵':'需要更换'):condition>.7?(bait?'新鲜':'完好'):condition>.3?(bait?'已使用':'有磨损'):(bait?'残饵':'磨损严重');

/** Whole premade rigs are inventory objects. Every replacement is an explicit
 * player action; opening the panel or selecting a rod consumes nothing. */
export function mountRodWorkbench(root,{sim,selectedRod,onResult,onSave,onSound}){
 let rod=selectedRod||sim.state.profile.loadout.rod||'rod',selectedSlot='rig';
 const result=r=>{onResult?.(r);if(r.ok){onSave?.();onSound?.();}return r.ok;};
 function render(){
  const s=sim.state,rods=GEAR_CATALOG.filter(g=>g.slot==='rod'),owned=rods.filter(g=>s.profile.owned.includes(g.id));
  if(!owned.some(g=>g.id===rod))rod=owned[0]?.id;
  if(!rod){root.innerHTML='<p class="modal-desc">背包里还没有鱼竿。</p>';return;}
  const config=sim.rodAssembly(rod),supply=sim.rodConsumableStatus(rod),active=s.profile.loadout.rod===rod&&sim.hasGear(rod),busy=s.fishState!=='idle';
  const rig=getRigProfile(config.rig),bait=baits.find(([id])=>id===supply.bait?.kind),hasRig=supply.rig.present&&supply.rig.condition>.08;
  root.innerHTML=`<div class="rod-rack" role="group" aria-label="预组装鱼竿">${owned.map(g=>{return`<button data-rod="${g.id}" class="rod-card ${g.id===rod?'selected':''}" aria-pressed="${g.id===rod}"><canvas data-rod-art="${g.id}" width="32" height="32"></canvas><span>${esc(g.name.replace('与绕线轮',''))}<small>${s.profile.loadout.rod===g.id&&sim.hasGear(g.id)?(s.rodMount==='hand'?'手持中':'竿架中'):'已组装'}</small></span></button>`;}).join('')}</div><div class="rod-editor-heading"><div><small>整套鱼竿 · 竿、轮与主线已配好</small><strong>${esc(rodName(rod))}</strong></div><button id="hold-rod" class="${active?'secondary':'primary'}" ${active||busy?'disabled':''}>${active?'正在使用':'换用这根竿'}</button></div><div class="rod-workbench premade-workbench"><div class="rod-assembly-grid" role="group" aria-label="这根鱼竿的消耗品"><button data-supply-slot="rig" class="assembly-slot ${selectedSlot==='rig'?'selected':''}" aria-pressed="${selectedSlot==='rig'}"><span>预组装钓组</span>${hasRig?`<canvas data-rod-art="${rig.item}" width="32" height="32"></canvas>`:'<span class="rod-slot-empty" aria-hidden="true">＋</span>'}<strong>${hasRig?esc(rig.name):'未装钓组'}</strong>${hasRig?`<span class="hook-spec">${esc(rigHookLabel(rig))}</span>`:''}<small class="supply-condition ${hasRig?'':'empty'}">${hasRig?(supply.rig.hookDamage>0?'鱼钩变形 · 建议更换':supplyCondition(supply.rig.condition)):'需要备用钓组'}</small></button><button data-supply-slot="bait" class="assembly-slot ${selectedSlot==='bait'?'selected':''}" aria-pressed="${selectedSlot==='bait'}"><span>${supply.requiresBait?'钩上的鱼饵':'附加饵'}</span><canvas data-rod-art="${bait?.[2]||'bait'}" width="32" height="32"></canvas><strong>${esc(bait?.[1]||(!hasRig||supply.requiresBait?'未装鱼饵':'未挂附加饵'))}</strong><small class="supply-condition ${supply.bait?.condition>.08?'':'empty'}">${!hasRig?'先装钓组':supply.bait?supplyCondition(supply.bait.condition,true):supply.requiresBait?'需要装饵':'可挂附加饵'}</small></button></div><aside class="rod-parts-picker"><div class="parts-heading"><strong>${selectedSlot==='rig'?'备用钓组':'鱼饵盒'}</strong><small>${selectedSlot==='rig'?'整套更换':'每次更换使用 1 份'}</small></div><div id="rod-part-options" class="rod-part-options"></div></aside></div><p class="rod-technique">${selectedSlot==='rig'?hasRig?`${esc(rigHookLabel(rig))} · ${esc(rig.technique)} 配重 ${formatSinker(config.weightGrams)}；钩、子线与铅坠整套更换，可用的旧组会收回。`:'':'更换鱼饵会弃掉原饵；收回再下放不会重复扣库存。'}</p>${busy?'<p class="rod-busy">先收回水中的钓组，再更换消耗品。</p>':''}`;
  root.querySelectorAll('[data-rod]').forEach(el=>el.onclick=()=>{rod=el.dataset.rod;render();});
  root.querySelectorAll('[data-supply-slot]').forEach(el=>el.onclick=()=>{selectedSlot=el.dataset.supplySlot;render();});
  root.querySelector('#hold-rod').onclick=()=>{if(result(sim.selectRod(rod)))render();};
  const holder=root.querySelector('#rod-part-options');
  const choices=selectedSlot==='rig'?Object.values(RIG_PROFILES).map(r=>({id:r.id,name:r.name,icon:r.item,stock:supply.rigStock[r.id]||0,selected:hasRig&&supply.rig.id===r.id,blocked:false})).filter(o=>o.stock>0||o.selected):
   baits.map(([id,name,icon])=>({id,name,icon,stock:supply.baitStock[id]||0,selected:supply.bait?.kind===id,blocked:!hasRig||supply.bait?.kind===id&&supply.bait.condition>=.999}));
  holder.innerHTML=choices.map((o,i)=>`<button data-supply="${i}" class="rod-part ${o.selected?'selected':''}" ${busy||o.stock<=0||o.blocked?'disabled':''}><canvas data-rod-art="${o.icon}" width="32" height="32"></canvas><strong>${esc(o.name)}</strong>${selectedSlot==='rig'?`<span class="hook-spec">${esc(rigHookLabel(o.id))}</span>`:''}<small>${selectedSlot==='rig'?'备用':'库存'} × ${o.stock}</small><span class="supply-action">${selectedSlot==='rig'?o.stock>0?(o.selected?'更换同款':'换装'):(o.selected?'已装':'已用完'):!hasRig?'先装钓组':o.blocked?'已装 · 新鲜':o.stock>0?(o.selected?'换新饵':'装饵'):'已用完'}</span></button>`).join('')||'<p class="modal-desc">没有备用钓组。</p>';
  holder.querySelectorAll('[data-supply]').forEach(el=>el.onclick=()=>{const o=choices[Number(el.dataset.supply)];if(result(selectedSlot==='rig'?sim.replaceRig(rod,o.id):sim.replaceBait(rod,o.id)))render();});
  root.querySelectorAll('[data-rod-art]').forEach(canvas=>drawItemIcon(canvas,canvas.dataset.rodArt));
 }
 render();
}
