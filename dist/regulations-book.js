// 加州休闲捕鱼规定：a purchasable paper reference shared by every destination.
// It is read-only text for the player to consult. It never inspects the current
// catch, hooked fish or location to pick a species or decide whether a fish may
// be kept; the reader chooses the area and species themselves.
// Source: CDFW 2026 Ocean Sport Fishing Regulations booklet (last updated
// 2026-07-17) and CDFW web summaries used by fishing-regulations.js. It is a game
// snapshot, not live trip guidance.
import {drawItemIcon} from './pixel-item-icons.js';
export const REGULATIONS_BOOK_ID='ca_fishing_regulations';
export const BOOK_EDITION=Object.freeze({
 title:'加州休闲捕鱼规定',subtitle:'2026 海洋休闲钓 · 游戏简明本',
 source:'CDFW《2026 Ocean Sport Fishing Regulations》（2026-07-17 更新版）及 CDFW 分区网页摘要',
 booklet:'https://wildlife.ca.gov/Fishing/Ocean/Regulations',
 disclaimer:'游戏内参考资料，整理自 2026 年版本。规定会在年内调整，真实出钓前请以 CDFW 当期原文、热线和临时公告为准。',
});

export const BOOK_AREAS=Object.freeze([
 {id:'santa_cruz',name:'Santa Cruz · 蒙特雷湾北岸',lat:'36°57′ N',gma:'central',southOfPigeonPoint:true,
  facts:['属于 Central 底栖鱼管理区（Pigeon Point 37°11′ N 至 Point Conception）。','位于 Point Sur 以北：加州比目鱼每日 2 条。','位于 Pigeon Point 以南：从岸边、码头或平均高潮线 1,000 码内钓鱼时，禁止金属线/金属前导，钩的最大内宽不得超过 1.5 in。','Santa Cruz Wharf 是公共码头：16 岁以上在公共码头上钓鱼可免钓鱼执照，每人最多 2 根竿。离开码头上船或在沙滩钓鱼仍需执照。','附近有 Natural Bridges SMR（西侧岸线）和 Soquel Canyon SMCA（外海峡谷）等保护区，边界与允许事项以 CDFW 保护区地图为准。']},
 {id:'pacifica',name:'Pacifica · Sharp Park',lat:'37°38′ N',gma:'sf',southOfPigeonPoint:false,
  facts:['属于 San Francisco 底栖鱼管理区（Point Arena 至 Pigeon Point）。','位于 Point Sur 以北：加州比目鱼每日 2 条。','位于 Pigeon Point 以北：不适用南部岸钓 1.5 in 钩宽和金属前导限制，其余通用规定照常。','沙滩岸钓：16 岁以上需持有效钓鱼执照。','现实中的 Pacifica Municipal Pier 是公共码头，开放时可免执照、每人最多 2 根竿。游戏中栈桥被设定为关闭，翻越围栏与巡查罚款均为虚构玩法，不代表真实执法。']},
 {id:'half_moon_bay',name:'Half Moon Bay · Dunes–Venice–Francis',lat:'37°28′ N',gma:'sf',southOfPigeonPoint:false,
  facts:['属于 San Francisco 底栖鱼管理区（Point Arena 至 Pigeon Point）。','位于 Point Sur 以北：加州比目鱼每日 2 条。','位于 Pigeon Point 以北：不适用南部岸钓 1.5 in 钩宽和金属前导限制。','沙滩岸钓：16 岁以上需持有效钓鱼执照。','北面 Pillar Point 一带有 Montara SMR 与 Pillar Point SMCA；前往其他海岸前先查 CDFW 保护区地图。']},
]);

export const GENERAL_RULES=Object.freeze([
 {title:'执照',text:'16 岁及以上钓鱼需持加州钓鱼执照，并随身携带。例外：在海洋或海湾的公共码头（public pier）上钓鱼。'},
 {title:'通用每日限额',text:'未单列限额的鱼：每人每日合计 20 条，同一种不超过 10 条。单列鱼种的专门限额另行适用，并仍受此总限额约束（明确列为“无限额”的鱼种除外）。'},
 {title:'无限额鱼种（节选）',text:'北方鳀鱼、jacksmelt、topsmelt、太平洋沙鲽等沙鲽类、太平洋鲭鱼、竹筴鱼、太平洋沙丁鱼、queenfish、petrale sole、starry flounder 等。'},
 {title:'尺寸量法',text:'全长（total length）：嘴闭合，从吻端量到尾鳍末端。叉长（fork length）：从吻端量到尾叉中央。量尺寸时保持鱼体完整；在船上切鱼片须另行遵守鱼片尺寸与留皮规定（§27.65）。'},
 {title:'每日限额与持有量',text:'每日限额按钓获当天计；已卖出、转交或被没收的鱼仍计入当天的限额。除另有规定外，持有量与每日限额相同。放流的鱼不占限额。'},
 {title:'公共码头',text:'每人最多使用 2 根竿线（或 2 个捕蟹器具）。'},
 {title:'底栖鱼船钓装备',text:'船上有岩鱼、灵鳕、cabezon、greenling 等底栖鱼时，只能用 1 根线、最多 2 枚钩。船上捕捞或持有底栖鱼时，须备有可立即使用的降鱼器（descending device）。'},
 {title:'放流要领',text:'尽快、轻柔地起鱼；尽量在水中摘钩；不挤压鱼身、不碰眼睛和鳃；吞钩太深时在嘴边剪线。深水岩鱼用降鱼器送回深处。'},
 {title:'保护区（MPA）',text:'州级海洋保护区内的捕捞限制因区而异，从全面禁捕到只许特定鱼种或钓法。进入前查看 CDFW 保护区地图与各区条文。'},
 {title:'自行判断',text:'本手册不会替你识别鱼种。请根据外形特征自行比对，拿不准就放流。'},
]);

const GROUNDFISH_SEASON='1/1–3/31 关闭；4/1–12/31 开放，无深度限制（2026 年 Central 与 San Francisco 管理区相同）。';
const RCG='岩鱼、cabezon、greenling 合计（RCG）每日 10 条。';
const salmonSeason=area=>area.southOfPigeonPoint
 ?'Pigeon Point 以南：4/11–9/30 开放（CDFW 2026 公告；5/15 前最小 24 in），11/1 起全州关闭至 2027 年开放日。'
 :'Point Arena–Pigeon Point：6/27–7/22、8/1–8/31 开放；38°02′ N 至 Pigeon Point 另有 9/1–10/31 开放；11/1 起全州关闭。5/16 之前的开放日见 CDFW 鲑鱼公告。';

// Each species entry is a page in the book. Values that depend on the chosen
// area are functions of that area.
export const BOOK_SPECIES=Object.freeze([
 {id:'barred_surfperch',group:'岸钓',name:'横带海鲫',en:'Barred surfperch',latin:'Amphistichus argenteus',
  look:'银白色高体型，体侧有 8–10 条断续的古铜或黄褐色竖斑纹，斑纹间常夹杂小圆斑；嘴小，尾鳍分叉。',
  season:()=>'全年开放（仅旧金山湾与 San Pablo 湾 4/1–7/31 关闭，外海沙滩不受影响）。',size:()=>'无最小尺寸。',
  bag:()=>'海鲫类合计每日 20 条（不含 shiner perch），同一种不超过 10 条；计入通用 20 条总限额。',
  gear:()=>'常规钩钓。',law:'T14 CCR §28.59'},
 {id:'redtail_surfperch',group:'岸钓',name:'红尾海鲫',en:'Redtail surfperch',latin:'Amphistichus rhodoterus',
  look:'体型与横带海鲫相似，但尾鳍和腹鳍带明显的红/粉红色，体侧为较窄的红褐色竖纹。',
  season:()=>'全年开放（旧金山湾与 San Pablo 湾 4/1–7/31 关闭）。',size:()=>'最小 10.5 in 全长（26.7 cm）。',
  bag:()=>'计入海鲫类合计 20 条，同一种不超过 10 条。',gear:()=>'常规钩钓。',law:'T14 CCR §28.59'},
 {id:'striped_bass',group:'岸钓',name:'条纹鲈',en:'Striped bass',latin:'Morone saxatilis',
  look:'银色流线体，体侧有 7–8 条连续的黑色纵纹；两个背鳍分开，第一背鳍带硬棘。',
  season:()=>'全年开放。',size:()=>'Point Conception 以北最小 18 in 全长（45.7 cm）。',bag:()=>'每日 2 条。',
  gear:()=>'只能用钩钓（及鱼枪、弓箭）；铅坠不得超过 4 lb；禁止机械绞车；禁止拉钩（snagging）。',law:'T14 CCR §27.85'},
 {id:'california_halibut',group:'岸钓/船钓',name:'加州比目鱼',en:'California halibut',latin:'Paralichthys californicus',
  look:'扁平鱼，双眼可在左或右侧；大嘴，上颌延伸到眼睛后缘之后；侧线在胸鳍上方明显拱起；齿尖利。',
  season:()=>'全年开放。',size:()=>'最小 22 in 全长（55.9 cm）。',bag:()=>'Point Sur 以北每日 2 条（以南为 5 条）。',
  gear:area=>area.southOfPigeonPoint?'岸边或近岸 1,000 码内：钩宽 ≤1.5 in、无金属前导。':'常规钩钓。',
  note:'不要与太平洋沙鲽、Pacific halibut 混淆：它们适用不同规定。',law:'T14 CCR §28.15'},
 {id:'white_croaker',group:'岸钓/船钓',name:'白石首鱼',en:'White croaker',latin:'Genyonemus lineatus',
  look:'体长多在 30 cm 以下，银灰至淡褐色；下颌有一簇细小须孔/短须；胸鳍基部常有小黑斑。',
  season:()=>'全年开放。',size:()=>'无最小尺寸。',bag:()=>'无单列限额：适用通用限额，同种每日 10 条，合计不超过 20 条。',
  gear:()=>'常规钩钓。',law:'T14 CCR §27.60(a)'},
 {id:'jacksmelt',group:'岸钓',name:'加州似银汉鱼',en:'Jacksmelt',latin:'Atherinopsis californiensis',
  look:'细长银色鱼，体侧有一条明亮的银色纵带；两个背鳍间隔较远；常成群在上层活动。与 topsmelt 相似。',
  season:()=>'全年开放。',size:()=>'无最小尺寸。',bag:()=>'无限额（jacksmelt、topsmelt 均无限额）。',gear:()=>'常规钩钓。',law:'T14 CCR §27.60(b)'},
 {id:'pacific_sanddab',group:'船钓',name:'太平洋沙鲽',en:'Pacific sanddab',latin:'Citharichthys sordidus',
  look:'小型扁平鱼，双眼在左侧；有眼侧褐色带橙/白色斑点；侧线平直，胸鳍上方不拱起。',
  season:()=>'全年开放，不受底栖鱼季节关闭影响。',size:()=>'无最小尺寸。',bag:()=>'无限额。',gear:()=>'不受底栖鱼“1 线 2 钩”限制；联邦降鱼器规定仍适用于船钓。',law:'T14 CCR §27.60(b)、§28.48'},
 {id:'blue_rockfish',group:'船钓 · 底栖鱼',name:'蓝岩鱼',en:'Blue rockfish',latin:'Sebastes mystinus',
  look:'蓝灰色至深蓝色，体侧有不规则深色斑驳；嘴较小，上颌末端不超过眼睛中线；常在礁石上方中层游动。',
  season:()=>GROUNDFISH_SEASON,size:()=>'无最小尺寸。',bag:()=>RCG,gear:()=>'1 线最多 2 钩；船上须备降鱼器。',law:'T14 CCR §28.55'},
 {id:'copper_rockfish',group:'船钓 · 底栖鱼',name:'铜岩鱼',en:'Copper rockfish',latin:'Sebastes caurinus',
  look:'铜褐、橙褐色，常带粉色调；侧线后半段有一片明显的浅色区域；头部自眼后有放射状深色条纹。',
  season:()=>GROUNDFISH_SEASON,size:()=>'无最小尺寸。',bag:()=>'每日 1 条，计入 RCG 合计 10 条。',gear:()=>'1 线最多 2 钩；船上须备降鱼器。',law:'T14 CCR §28.55(b)(3)'},
 {id:'vermilion_sunset_rockfish',group:'船钓 · 底栖鱼',name:'朱红岩鱼 / 夕阳岩鱼',en:'Vermilion / Sunset rockfish',latin:'Sebastes miniatus / S. crocotulus',
  look:'全身鲜红至朱红色，鳍缘常为深色；口内红色。两种外形几乎相同，按同一组计算。',
  season:()=>GROUNDFISH_SEASON,size:()=>'无最小尺寸。',bag:()=>'两种合计每日 2 条，计入 RCG 合计 10 条。',gear:()=>'1 线最多 2 钩；船上须备降鱼器。',law:'T14 CCR §28.55(b)(2)'},
 {id:'lingcod',group:'船钓 · 底栖鱼',name:'长蛇齿单线鱼（灵鳕）',en:'Lingcod',latin:'Ophiodon elongatus',
  look:'长形大头，大嘴布满尖牙；体表褐、灰或偏绿，带深色斑块；背鳍长而连续，中间有缺刻。',
  season:()=>GROUNDFISH_SEASON,size:()=>'最小 22 in 全长（55.9 cm）。',bag:()=>'每日 2 条（不计入 RCG）。',gear:()=>'1 线最多 2 钩；船上须备降鱼器。',law:'T14 CCR §28.27'},
 {id:'prohibited_rockfish',group:'禁捕',name:'黄眼岩鱼、刺背岩鱼、牛岩鱼、铜斑岩鱼',en:'Yelloweye, Quillback, Cowcod, Bronzespotted',latin:'Sebastes ruberrimus / maliger / levis / gilli',
  look:'黄眼岩鱼：橙红色、亮黄色眼睛；刺背岩鱼：褐色、背鳍棘很高且前半身色浅；牛岩鱼、铜斑岩鱼多为深水鱼。',
  season:()=>'全年禁止捕捞和持有。',size:()=>'—',bag:()=>'0 条：误钓须立即放流，深水鱼使用降鱼器。',gear:()=>'—',law:'T14 CCR §28.55(b)(1)'},
 {id:'chinook_salmon',group:'船钓 · 鲑鱼',name:'帝王鲑',en:'Chinook (king) salmon',latin:'Oncorhynchus tshawytscha',
  look:'银色，背部和尾鳍上下两叶都有黑色小斑点；牙龈（下颌齿根）为黑色。银鲑（coho）牙龈为白色，尾鳍只有上半部有斑点。',
  season:salmonSeason,size:()=>'最小 20 in 全长（50.8 cm），特别时段见季节说明。',bag:()=>'每日 2 条。禁止保留银鲑（coho）。',
  gear:()=>'Point Conception 以北：只许 1 根竿、最多 2 枚单尖无倒刺钩；非拖钓的饵钓须用无倒刺圆钩（两钩间距 ≤5 in）。',law:'T14 CCR §27.80、§1.73'},
 {id:'white_seabass',group:'船钓',name:'白海鲈',en:'White seabass',latin:'Atractoscion nobilis',
  look:'大型银灰色鱼，背部带青铜/蓝色调；腹部中央有一道微隆的棱；下颌略突出。',
  season:()=>'全年开放（Point Conception 以南 3/15–6/15 限 1 条）。',size:()=>'最小 28 in 全长（71.1 cm）。',bag:()=>'每日 3 条。',gear:()=>'常规钩钓。',law:'T14 CCR §28.35'},
 {id:'pacific_bonito',group:'船钓',name:'太平洋狐鲣',en:'Pacific bonito',latin:'Sarda chiliensis lineolata',
  look:'纺锤形，背部蓝绿色，背上有多条向后下方倾斜的深色斜纹；腹部银白无纹。',
  season:()=>'全年开放。',size:()=>'最小 24 in 叉长或 5 lb；每日可另保留 5 条未达此尺寸的鱼。',bag:()=>'每日 10 条。',gear:()=>'常规钩钓。',law:'T14 CCR §28.32'},
 {id:'pacific_mackerel',group:'活饵 · 小型鱼',name:'太平洋鲭鱼',en:'Pacific (chub) mackerel',latin:'Scomber japonicus',
  look:'背部蓝绿色，带波浪状深色斜纹；腹侧有不规则小斑点；两个背鳍间隔明显。',
  season:()=>'全年开放。',size:()=>'无最小尺寸。',bag:()=>'无限额。',gear:()=>'船上同时有底栖鱼时，须遵守 1 线 2 钩限制（多钩 sabiki 不可使用）。',law:'T14 CCR §27.60(b)'},
 {id:'northern_anchovy',group:'活饵 · 小型鱼',name:'北方鳀鱼',en:'Northern anchovy',latin:'Engraulis mordax',
  look:'细小银色鱼，嘴很大、上颌延伸到眼后；吻部突出于下颌之前。',
  season:()=>'全年开放。',size:()=>'无最小尺寸。',bag:()=>'无限额。',gear:()=>'常规钩钓；船上有底栖鱼时注意钩数限制。',law:'T14 CCR §27.60(b)'},
 {id:'pacific_sardine',group:'活饵 · 小型鱼',name:'太平洋沙丁鱼',en:'Pacific sardine',latin:'Sardinops sagax',
  look:'银色圆体，背部蓝绿色，体侧上方常有一列或多列黑色小圆点。',
  season:()=>'全年开放。',size:()=>'无最小尺寸。',bag:()=>'无限额。',gear:()=>'常规钩钓；船上有底栖鱼时注意钩数限制。',law:'T14 CCR §27.60(b)'},
]);

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const bookArea=id=>BOOK_AREAS.find(a=>a.id===id)||BOOK_AREAS[0];

// The query filters by text the reader typed; it matches names and printed
// descriptions only and never uses the game's catch or fish state.
export function searchBookSpecies(query=''){
 const q=String(query).trim().toLowerCase();
 if(!q)return BOOK_SPECIES;
 return BOOK_SPECIES.filter(s=>[s.name,s.en,s.latin,s.group,s.look].some(v=>v.toLowerCase().includes(q)));
}

function speciesPage(s,area){
 return`<article class="rules-species" data-rules-species="${s.id}"><header><span class="rules-group">${esc(s.group)}</span><h3>${esc(s.name)}</h3><small>${esc(s.en)} · <i>${esc(s.latin)}</i></small></header><p class="rules-look"><b>外形</b>${esc(s.look)}</p><dl><div><dt>季节</dt><dd>${esc(s.season(area))}</dd></div><div><dt>尺寸</dt><dd>${esc(s.size(area))}</dd></div><div><dt>限额</dt><dd>${esc(s.bag(area))}</dd></div><div><dt>钓法</dt><dd>${esc(s.gear(area))}</dd></div></dl>${s.note?`<p class="rules-note">${esc(s.note)}</p>`:''}<small class="rules-law">${esc(s.law)}</small></article>`;
}

export function regulationsBookMarkup({areaId,tab='species',query=''}={}){
 const area=bookArea(areaId),list=searchBookSpecies(query);
 const tabs=[['species','鱼种'],['area','本区'],['general','通用']];
 const body=tab==='general'
  ?`<ol class="rules-general">${GENERAL_RULES.map(r=>`<li><b>${esc(r.title)}</b><p>${esc(r.text)}</p></li>`).join('')}</ol>`
  :tab==='area'
   ?`<ul class="rules-area-facts">${area.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`
   :`<label class="rules-search"><span>按名称或特征查找</span><input id="rules-query" type="search" value="${esc(query)}" placeholder="例如：海鲫、红色、halibut" autocomplete="off"></label><div class="rules-list">${list.length?list.map(s=>speciesPage(s,area)).join(''):'<p class="rules-empty">没有找到匹配的鱼种。换个名称或外形特征试试。</p>'}</div>`;
 return`<div class="eyebrow">CALIFORNIA · SPORT FISHING</div><h2 id="modal-title">${esc(BOOK_EDITION.title)}</h2><p class="modal-desc">${esc(BOOK_EDITION.subtitle)}</p>`
  +`<div class="rules-book"><label class="rules-area"><span>海域</span><select id="rules-area">${BOOK_AREAS.map(a=>`<option value="${a.id}" ${a.id===area.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>`
  +`<div class="tabs rules-tabs" role="tablist">${tabs.map(([id,label])=>`<button type="button" role="tab" data-rules-tab="${id}" aria-selected="${id===tab}" class="${id===tab?'active':''}">${label}</button>`).join('')}</div>`
  +`<div class="rules-body">${body}</div><footer class="rules-foot"><p>${esc(BOOK_EDITION.disclaimer)}</p><p>资料：${esc(BOOK_EDITION.source)}。<a href="${BOOK_EDITION.booklet}" target="_blank" rel="noopener">CDFW 海洋规定</a></p></footer></div>`;
}

// Renders the book into a modal content element and keeps its own view state
// (area, tab, search) while it is open.
export function mountRegulationsBook(root,{areaId}={}){
 const view={areaId:bookArea(areaId).id,tab:'species',query:''};
 const render=(focusSearch=false)=>{
  root.innerHTML=regulationsBookMarkup(view);
  root.querySelector('#rules-area').onchange=e=>{view.areaId=e.target.value;render();};
  for(const el of root.querySelectorAll('[data-rules-tab]'))el.onclick=()=>{view.tab=el.dataset.rulesTab;render();root.querySelector(`[data-rules-tab="${view.tab}"]`)?.focus();};
  const input=root.querySelector('#rules-query');
  if(input){input.oninput=()=>{view.query=input.value;render(true);};if(focusSearch){input.focus();input.setSelectionRange(input.value.length,input.value.length);}}
 };
 render();
 return view;
}

export function initRegulationsButton(button,onOpen){
 const art=button?.querySelector('canvas');if(art)drawItemIcon(art,REGULATIONS_BOOK_ID);
 if(button)button.onclick=onOpen;
}

// Keep the handbook button in the lower-left corner, lifted above any visible
// bottom control panel so it never covers the rod, reel or helm controls.
export function placeRegulationsButton(button,panels=[]){
 if(!button||button.hidden)return;
 const vh=innerHeight;let bottom=0;
 for(const panel of panels){if(!panel||panel.hidden||!panel.getClientRects().length)continue;const r=panel.getBoundingClientRect();if(r.height>0&&r.width>0&&r.left<button.offsetWidth+40&&r.top<vh)bottom=Math.max(bottom,vh-r.top);}
 button.style.setProperty('--rules-lift',`${Math.round(bottom)}px`);
}
