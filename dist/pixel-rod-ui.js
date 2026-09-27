import {GEAR_CATALOG} from './equipment.js?v=20260927-pixel-v17';
import {getRigProfile} from './fishing-rigs.js?v=20260927-pixel-v17';
import {rodAssemblyOptions} from './pixel-rod-loadouts.js?v=20260927-pixel-v17';
import {drawItemIcon} from './pixel-item-icons.js?v=20260927-pixel-v17';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slots=[['reel','绕线轮','reel_smooth'],['line','主线','line_braid'],['leader','前导','leader_heavy'],['rig','钓组','tackle'],['bait','鱼饵','bait'],['weightGrams','配重','sinker_heavy'],['fishingDepthMeters','饵层','rig_float']];
const rodName=id=>GEAR_CATALOG.find(g=>g.id===id)?.name||id;
const iconFor=(slot,value)=>slot==='rig'?getRigProfile(value).item:slot==='bait'?({squid:'bait',anchovy:'bait_anchovy',shrimp:'bait_shrimp',sardine:'bait_sardine',jig:'bait_soft'}[value]||'bait'):['weightGrams','fishingDepthMeters'].includes(slot)?slots.find(s=>s[0]===slot)[2]:value||slots.find(s=>s[0]===slot)[2];

/** Each editor targets one saved rod. Selecting its card never changes the held rod. */
export function mountRodWorkbench(root,{sim,selectedRod,onResult,onSave,onSound}){
 let rod=selectedRod||sim.state.profile.loadout.rod||'rod',selectedSlot='rig';
 const optionsFor=key=>rodAssemblyOptions(sim.state.profile,rod,key,sim.state.packed);
 const result=r=>{onResult?.(r);if(r.ok){onSave?.();onSound?.();}return r.ok;};
 function render(){
  const s=sim.state,rods=GEAR_CATALOG.filter(g=>g.slot==='rod'),owned=rods.filter(g=>s.profile.owned.includes(g.id));
  if(!owned.some(g=>g.id===rod))rod=owned[0]?.id;
  if(!rod){root.innerHTML='<p class="modal-desc">背包里还没有鱼竿。</p>';return;}
  const config=sim.rodAssembly(rod),active=s.profile.loadout.rod===rod&&sim.hasGear(rod),busy=s.fishState!=='idle';
  const slotLabel=key=>key==='fishingDepthMeters'?(config.rig==='float'?'漂下长度':'参考水层'):slots.find(v=>v[0]===key)[1];
  const slotOption=key=>optionsFor(key).find(o=>o.id===config[key]);
  const slotName=key=>slotOption(key)?.name||(key==='weightGrams'?`${config[key]} g`:key==='fishingDepthMeters'?config[key]==null?'随底':'设定饵层':'基础组件');
  root.innerHTML=`<div class="rod-rack" role="group" aria-label="每根鱼竿的独立装配">${rods.map(g=>{const own=s.profile.owned.includes(g.id);return`<button data-rod="${g.id}" class="rod-card ${g.id===rod?'selected':''}" ${!own?'disabled':''} aria-pressed="${g.id===rod}"><canvas data-rod-art="${g.id}" width="32" height="32"></canvas><span>${esc(g.name.replace('与绕线轮',''))}<small>${!own?'未获得':s.profile.loadout.rod===g.id&&sim.hasGear(g.id)?(s.rodMount==='hand'?'手持中':'竿架中'):'独立钓组'}</small></span></button>`;}).join('')}</div><div class="rod-editor-heading"><div><small>这根竿的装配</small><strong>${esc(rodName(rod))}</strong></div><button id="hold-rod" class="${active?'secondary':'primary'}" ${active||busy?'disabled':''}>${active?'正在使用':'换用这根竿'}</button></div><div class="rod-workbench"><div class="rod-assembly-grid" role="group" aria-label="${esc(rodName(rod))}装配格子">${slots.map(([key,label])=>`<button data-assembly-slot="${key}" class="assembly-slot ${key===selectedSlot?'selected':''}" aria-pressed="${key===selectedSlot}"><span>${slotLabel(key)}</span><canvas data-rod-art="${iconFor(key,config[key])}" width="32" height="32"></canvas><strong>${esc(slotName(key))}</strong></button>`).join('')}</div><aside class="rod-parts-picker"><div class="parts-heading"><strong>${slotLabel(selectedSlot)}</strong><small>点击装入这根竿</small></div><div id="rod-part-options" class="rod-part-options"></div></aside></div><p class="rod-technique">${esc(getRigProfile(config.rig).technique)} ${config.rig==='float'?'挡豆决定浮漂以下的线长。':'参考水层是个人标记；实际沉降由收放线控制。'}</p>${busy?'<p class="rod-busy">先收回水中的钓组，再调整鱼竿。</p>':''}`;
  root.querySelectorAll('[data-rod]').forEach(el=>el.onclick=()=>{rod=el.dataset.rod;render();});
  root.querySelectorAll('[data-assembly-slot]').forEach(el=>el.onclick=()=>{selectedSlot=el.dataset.assemblySlot;render();});
  root.querySelector('#hold-rod').onclick=()=>{if(result(sim.selectRod(rod)))render();};
  const choices=optionsFor(selectedSlot),holder=root.querySelector('#rod-part-options');
  holder.innerHTML=choices.map((o,i)=>`<button data-part="${i}" class="rod-part ${o.id===config[selectedSlot]?'selected':''}" ${busy||!o.available?'disabled':''} aria-pressed="${o.id===config[selectedSlot]}"><canvas data-rod-art="${o.iconId||iconFor(selectedSlot,o.id)}" width="32" height="32"></canvas><strong>${esc(o.name)}</strong><small>${esc(o.mountedOn&&o.mountedOn!==rod?`从${rodName(o.mountedOn).replace('与绕线轮','')}移装`:o.stock!=null?`库存 ${o.stock}`:o.reason||'')}</small></button>`).join('');
  if(!choices.length)holder.innerHTML='<span class="rod-empty-part">当前钓组随底，无需设置饵层。</span>';
  holder.querySelectorAll('[data-part]').forEach(el=>el.onclick=()=>{const o=choices[Number(el.dataset.part)];if(result(sim.setRig({rod,[selectedSlot]:o.id})))render();});
  root.querySelectorAll('[data-rod-art]').forEach(canvas=>drawItemIcon(canvas,canvas.dataset.rodArt));
 }
 render();
}
