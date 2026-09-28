import {knownShoreZones,ANGLERS} from './shore-lore.js?v=coast-6';
import {inspectionReportMarkup} from './pixel-inspection-report.js?v=species-1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const habitatName=id=>({swash:'近岸浪脚',bar:'浅沙坝',trough:'深沙槽',channel:'沙坝缺口',offshore:'外侧深水',surf:'浪区'}[id]||'浪区');
export function createShoreNavigation({scene,sim,openDialog,closeDialog,feedback,walkTo}){
 const $=id=>document.getElementById(id);
 function openMap(){
  const s=sim.state,notes=s.shoreLore.notes,zones=knownShoreZones(scene,s.shoreLore);
  if(!notes.length){openDialog('map',`<div class="eyebrow">WORDS BY THE WATER</div><h2 id="modal-title">沿岸手记</h2><p class="journal-empty">还没有记下钓点。<br>沿海走走，偶遇愿意聊天的老钓友时，听听他们的经验。</p>`);return;}
  openDialog('map',`<div class="eyebrow">WORDS BY THE WATER</div><h2 id="modal-title">${esc(scene.shortName)} · 沿岸手记</h2><p class="modal-desc">只记下听来的片段。空白处还没有打听到，浪线仍要自己观察。</p><canvas id="shore-chart" role="img" aria-label="沿岸手绘草图：仅标出已听说的局部，空白区域未知"></canvas><div class="gear-grid shore-destinations">${zones.map(z=>`<article class="gear-card"><strong>${esc(z.name)}</strong>${notes.filter(n=>n.zoneId===z.id).map(n=>`<p><b>${esc(n.title)}</b><br>${esc(n.text)}<br><small>听${esc(ANGLERS[n.angler].name)}说</small></p>`).join('')}<button data-zone="${esc(z.id)}" ${s.phase!=='walk'?'disabled':''}>沿岸去看看</button></article>`).join('')}</div><p class="credits-note">钓友的草图与经验只供找水，不提供实时水深或定位。</p>`);
  const canvas=$('shore-chart'),g=canvas.getContext('2d');canvas.width=720;canvas.height=200;g.fillStyle='#eadfbd';g.fillRect(0,0,720,200);g.font='22px monospace';g.textAlign='center';
  for(const z of zones){const x=z.x/scene.width*680+20;g.fillStyle='#708b82';g.fillRect(x-20,100,40,3);g.fillStyle='#3c6262';g.fillRect(x-3,96,6,9);g.fillText(z.name,Math.max(70,Math.min(630,x)),142,190);if(notes.some(n=>n.zoneId===z.id&&n.topic==='terrain')){g.fillStyle='#7caaa6';g.fillRect(x-22,70,44,20);g.fillStyle='#dce3c9';g.fillRect(x-18,72,35,2);}}
  $('modal-content').querySelectorAll('[data-zone]').forEach(button=>button.onclick=()=>{const z=zones.find(z=>z.id===button.dataset.zone);if(!z)return;closeDialog();const p=z.id==='pier'&&scene.pier?scene.pier.gate:{x:z.x,y:scene.shoreY(z.x)+57};walkTo(p.x,p.y);});
 }
 function openConversation(id){const result=sim.talkAngler(id);if(!result.ok){feedback(result);return;}openDialog('conversation',`<div class="eyebrow">A WORD ON THE BEACH</div><h2 id="modal-title">${esc(result.name)}</h2><div class="staff-banner"><p>「${esc(result.text)}」</p></div>${result.fresh?'<p class="credits-note">这一条，记进沿岸手记了。</p>':result.known?'<p class="credits-note">这段经验已经记过了。</p>':''}<div class="button-row"><button id="angler-goodbye" class="primary">谢谢，祝你上鱼</button></div>`);$('angler-goodbye').onclick=closeDialog;}

 function openPier(){
  if(!scene.pier)return;
  if(!sim.nearPier){feedback({message:'先走到栈桥入口。'});walkTo(scene.pier.gate.x,scene.pier.gate.y);return;}
  openDialog('pier',`<div class="eyebrow">PACIFICA MUNICIPAL PIER</div><h2 id="modal-title">栈桥封闭</h2><div class="staff-banner"><p><b>维修围栏 · 禁止进入</b>风化的混凝土桥面向海里延伸，受损栏杆旁挂着封闭告示。</p></div><p class="modal-desc">可以越栏进去钓鱼，但在桥上逗留可能遇到鱼警巡查。被查后罚 <b>80 潮汐点</b>、没收携带的全部鱼获并遣返入口；点数不足会留下待缴罚款。</p><div class="button-row"><button id="pier-enter" class="primary">翻越围栏进入</button><button id="pier-cancel" class="secondary">留在沙滩</button></div><p class="credits-note">巡查概率和罚款属于本游戏设定。</p>`);
  $('pier-enter').onclick=()=>{const r=sim.enterPier();if(r.ok)closeDialog();feedback(r);};$('pier-cancel').onclick=closeDialog;
 }
 function openInspection(){
  const i=sim.state.inspection;if(!i)return;
  openDialog('inspection',`<div class="eyebrow">PIER PATROL</div><h2 id="modal-title">鱼警巡查</h2>${inspectionReportMarkup({...i,debt:sim.state.fineDebt})}<div class="button-row"><button id="inspection-ok" class="primary">回到沙滩</button></div>`);
  $('inspection-ok').onclick=closeDialog;
 }
 return{openMap,openPier,openInspection,openConversation};
}
