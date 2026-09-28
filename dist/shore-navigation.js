import {sampleShore,shoreProfile} from './shore-data.js?v=coast-3';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const habitatName=id=>({swash:'近岸浪脚',bar:'浅沙坝',trough:'深沙槽',channel:'沙坝缺口',offshore:'外侧深水',surf:'浪区'}[id]||'浪区');
export function createShoreNavigation({scene,sim,openDialog,closeDialog,feedback,walkTo}){
 const $=id=>document.getElementById(id);
 function openMap(){
  const s=sim.state,current=s.shoreSample||sampleShore(scene,s.player.x,scene.shoreY(s.player.x)-90,s.elapsed);
  openDialog('map',`<div class="eyebrow">READ THE WATER</div><h2 id="modal-title">${esc(scene.shortName)} · 沿岸地图</h2><p class="modal-desc">选择钓位后沿沙滩走过去。每个位置的沙坝、沙槽和水流都不同。</p><canvas id="shore-chart" role="img" aria-label="沿岸示意图：白色表示破浪浅坝，深色表示水槽，圆点表示你的位置"></canvas><div class="shore-chart-legend"><span>白沫 · 浅坝破浪</span><span>暗带 · 槽与缺口</span><span>● 你的位置</span></div><p class="credits-note">当前：${esc(current.zoneName)} · ${habitatName(current.habitat)} · ${current.tideLabel}<br>看白浪之间的暗带，短抛可以落进内槽；并非越远越容易中鱼。</p><div class="gear-grid shore-destinations">${scene.zones.map((z,i)=>`<article class="gear-card"><strong>${i+1}. ${esc(z.name)}</strong><p>${esc(z.description)}</p><button data-zone="${esc(z.id)}" ${s.phase!=='walk'?'disabled':''}>${z.id==='pier'?'走到栈桥入口':'沿岸走到这里'}</button></article>`).join('')}</div><p class="credits-note">岸线为缩尺呈现，沙槽是合理生成的地形；不是实时海况图。${s.phase!=='walk'?'先收回钓组，再移动。':''}</p>`);
  const canvas=$('shore-chart'),g=canvas.getContext('2d');canvas.width=720;canvas.height=236;g.imageSmoothingEnabled=false;
  const scale=canvas.width/scene.width,coast=158;
  for(let px=0;px<canvas.width;px+=3){const x=px/scale;
   for(let py=0;py<coast;py+=3){const q=sampleShore(scene,x,scene.shoreY(x)-(coast-py)*2.2,s.elapsed);g.fillStyle=q.breakStrength>.15?'#dee8d1':q.depth>2.1?'#37677a':'#78a69f';g.fillRect(px,py,3,3);}
  }
  g.fillStyle=scene.palette.wet;g.fillRect(0,coast,720,12);g.fillStyle=scene.palette.dry;g.fillRect(0,coast+12,720,66);
  if(scene.pier){const x=scene.pier.x*scale;g.fillStyle='#c4c5b8';g.fillRect(x-3,17,6,coast-4);g.fillRect(x-3,17,20,6);g.fillStyle='#c18051';g.fillRect(x-5,coast+4,10,4);}
  g.font='bold 13px monospace';g.textAlign='center';scene.zones.forEach((z,i)=>{const x=Math.max(12,Math.min(708,z.x*scale));g.fillStyle='#173f46';g.fillRect(x-10,coast+33,20,21);g.fillStyle='#fff0ca';g.fillText(String(i+1),x,coast+48);});
  g.fillStyle='#f7d27f';g.beginPath();g.arc(s.player.x*scale,coast+21,5,0,Math.PI*2);g.fill();g.strokeStyle='#183e45';g.lineWidth=2;g.stroke();
  $('modal-content').querySelectorAll('[data-zone]').forEach(button=>button.onclick=()=>{const z=scene.zones.find(z=>z.id===button.dataset.zone);closeDialog();const p=z.id==='pier'&&scene.pier?scene.pier.gate:{x:z.x,y:scene.shoreY(z.x)+57};walkTo(p.x,p.y);});
 }
 function openPier(){
  if(!scene.pier)return;
  if(!sim.nearPier){feedback({message:'先走到栈桥入口。'});walkTo(scene.pier.gate.x,scene.pier.gate.y);return;}
  openDialog('pier',`<div class="eyebrow">PACIFICA MUNICIPAL PIER</div><h2 id="modal-title">栈桥封闭</h2><div class="staff-banner"><p><b>维修围栏 · 禁止进入</b>风化的混凝土桥面向海里延伸，受损栏杆旁挂着封闭告示。</p></div><p class="modal-desc">可以越栏进去钓鱼，但在桥上逗留可能遇到鱼警巡查。被查后罚 <b>80 潮汐点</b>并遣返入口；点数不足会留下待缴罚款。</p><div class="button-row"><button id="pier-enter" class="primary">翻越围栏进入</button><button id="pier-cancel" class="secondary">留在沙滩</button></div><p class="credits-note">巡查概率和罚款属于本游戏设定。</p>`);
  $('pier-enter').onclick=()=>{const r=sim.enterPier();if(r.ok)closeDialog();feedback(r);};$('pier-cancel').onclick=closeDialog;
 }
 function openInspection(){
  const i=sim.state.inspection;if(!i)return;
  openDialog('inspection',`<div class="eyebrow">PIER PATROL</div><h2 id="modal-title">鱼警巡查</h2><div class="staff-banner"><p><b>「这里仍然封闭，请离开栈桥。」</b>你的钓组已收回，鱼警把你带回了入口。</p></div><div class="catch-stats"><div><strong>${i.fine}</strong><small>罚款 · 潮汐点</small></div><div><strong>${i.paid}</strong><small>已扣点数</small></div><div><strong>${sim.state.fineDebt||0}</strong><small>待缴罚款</small></div></div><p class="credits-note">${sim.state.fineDebt?'下次在小店兑换鱼获时优先补缴，仍可领取应急鱼饵。':'已完成本次处罚。'}沙滩仍然可以正常岸钓。</p><div class="button-row"><button id="inspection-ok" class="primary">回到沙滩</button></div>`);
  $('inspection-ok').onclick=closeDialog;
 }
 return{openMap,openPier,openInspection};
}
