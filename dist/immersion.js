const paths={menu:'M4 6h16M4 12h16M4 18h16',bag:'M8 7V5a4 4 0 0 1 8 0v2M6 7h12l2 14H4L6 7zm2 7h8v4H8z',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5zm6-2v16m6-14v16',view:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6'};
export function setupImmersionControls(){
 for(const[id,type,label]of[['tools-btn','menu','菜单'],['inventory-btn','bag','装备'],['field-map-btn','map','海图'],['camera-btn','view','视角'],['touch-menu','menu','菜单'],['touch-map','map','海图']]){
  const button=document.getElementById(id);if(!button)continue;
  button.innerHTML=`<svg class="control-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[type]}"/></svg><span class="icon-label">${label}</span>`;button.setAttribute('aria-label',label);button.title=label;
 }
 const center=document.getElementById('touch-center');center.textContent='⌖';center.setAttribute('aria-label','视角回正');center.title='视角回正';
}
const prompts={'与码头值班员交谈':'交谈','登上小木船':'登船','等候吊艇下水':'吊艇中','解开缆绳':'解缆','靠泊、系缆并上岸':'靠泊','抓住船尾梯，重新登船':'抓住船梯'};
export function concisePrompt(text){return prompts[text]||text;}
export function immersiveMessage(text){
 if(/^(小屋就在|航程已恢复|已经坐稳|站起后|已回到驾驶座|缆绳已解开|发动机已启动|发动机已关闭|锚已抓底|钓组入水|咬钩了|中鱼！|钓组已收回|钓组已整理好|沿栈道步行|船内视角|船后视角|空艇已下水|空艇已经系妥|吊臂正在|木艇已吊回|双手扶稳|抵达水面|抵达浮码头)/.test(text))return '';
 if(text.startsWith('辅助操舵：'))return '辅助操舵已接管';
 if(text.startsWith('落水！'))return '';
 if(text.startsWith('断线了'))return '断线';
 if(text.startsWith('鱼脱钩了'))return '脱钩';
 return text.split(/[。！]/)[0];
}
