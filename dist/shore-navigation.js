import {knownShoreZones,ANGLERS} from './shore-lore.js';
import {inspectionReportMarkup} from './pixel-inspection-report.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const habitatName=id=>({swash:'近岸浪脚',bar:'浅沙坝',trough:'深沙槽',channel:'沙坝缺口',offshore:'外侧深水',surf:'浪区'}[id]||'浪区');
export function createShoreNavigation({scene,sim,openDialog,closeDialog,feedback}){
 const $=id=>document.getElementById(id);
 function openMap(){
  const s=sim.state,notes=s.shoreLore.notes,zones=knownShoreZones(scene,s.shoreLore);
  if(!notes.length){openDialog('map',`<div class="eyebrow">WORDS BY THE WATER</div><h2 id="modal-title">沿岸手记</h2><p class="journal-empty">还没有记下钓点。<br>沿海走走，偶遇愿意聊天的老钓友时，听听他们的经验。</p>`);return;}
  openDialog('map',`<div class="eyebrow">WORDS BY THE WATER</div><h2 id="modal-title">${esc(scene.shortName)} · 沿岸手记</h2><p class="modal-desc">只记下听来的片段。空白处还没有打听到，浪线仍要自己观察。</p><canvas id="shore-chart" role="img" aria-label="沿岸手绘草图：仅标出已听说的局部，空白区域未知"></canvas><div class="gear-grid shore-destinations">${zones.map(z=>`<article class="gear-card"><strong>${esc(z.name)}</strong>${notes.filter(n=>n.zoneId===z.id).map(n=>`<p><b>${esc(n.title)}</b><br>${esc(n.text)}<br><small>听${esc(ANGLERS[n.angler].name)}说</small></p>`).join('')}</article>`).join('')}</div><p class="credits-note">钓友的草图与经验只供找水，不提供实时水深或定位。</p>`);
  const canvas=$('shore-chart'),g=canvas.getContext('2d');canvas.width=720;canvas.height=200;g.fillStyle='#eadfbd';g.fillRect(0,0,720,200);g.font='22px monospace';g.textAlign='center';
  for(const z of zones){const x=z.x/scene.width*680+20;g.fillStyle='#708b82';g.fillRect(x-20,100,40,3);g.fillStyle='#3c6262';g.fillRect(x-3,96,6,9);g.fillText(z.name,Math.max(70,Math.min(630,x)),142,190);if(notes.some(n=>n.zoneId===z.id&&n.topic==='terrain')){g.fillStyle='#7caaa6';g.fillRect(x-22,70,44,20);g.fillStyle='#dce3c9';g.fillRect(x-18,72,35,2);}}
 }
 function openConversation(id){const result=sim.talkAngler(id);if(!result.ok){feedback(result);return;}openDialog('conversation',`<div class="eyebrow">A WORD ON THE BEACH</div><h2 id="modal-title">${esc(result.name)}</h2><div class="staff-banner"><p>「${esc(result.text)}」</p></div>${result.fresh?'<p class="credits-note">这一条，记进沿岸手记了。</p>':result.known?'<p class="credits-note">这段经验已经记过了。</p>':''}<div class="button-row"><button id="angler-goodbye" class="primary">谢谢，祝你上鱼</button></div>`);$('angler-goodbye').onclick=closeDialog;}

 function openRegular(more=false){
  const result=sim.talkRegular({more});if(!result.ok){feedback(result);return;}
  const gifts=result.gifts.map(g=>`<p>「${esc(g.line)}」</p><p class="credits-note">收到：${esc(g.item)}</p>`).join('');
  openDialog('conversation',`<div class="eyebrow">SHARP PARK REGULAR</div><h2 id="modal-title">${esc(result.name)}</h2><div class="staff-banner"><div>${result.line?`<p>「${esc(result.line)}」</p>`:''}${result.tip?`<p><b>${esc(result.tip.title)}</b>　「${esc(result.tip.text)}」</p>`:''}${gifts}</div></div>${result.fresh?'<p class="credits-note">这一条，记进沿岸手记了。</p>':''}<div class="button-row">${result.more?'<button id="regular-more" class="secondary">再请教一条</button>':''}<button id="angler-goodbye" class="primary">谢谢，祝你上鱼</button></div>`);
  if(result.more)$('regular-more').onclick=()=>openRegular(true);
  $('angler-goodbye').onclick=closeDialog;
  if(result.gifts.length)feedback({ok:true,message:''});
 }
 function openInspection(){
  const i=sim.state.inspection;if(!i)return;
  openDialog('inspection',`<div class="eyebrow">${i.kind==='beach'?'BEACH PATROL':'PIER PATROL'}</div><h2 id="modal-title">${i.kind==='beach'?'海滩鱼警检查':'栈桥巡查'}</h2>${inspectionReportMarkup({...i,debt:sim.state.fineDebt})}<div class="button-row"><button id="inspection-ok" class="primary">回到沙滩</button></div>`);
  $('inspection-ok').onclick=closeDialog;
 }
 return{openMap,openInspection,openConversation,openRegular};
}
