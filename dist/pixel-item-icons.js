/* Original inventory illustrations, hand drawn on a transparent 32 × 32 grid.
 * Integer raster primitives keep even the thin leaders crisp at small sizes.
 * The caller supplies the accessible label and CSS display size (48px works).
 */
const C={ink:'#223a46',navy:'#344e68',deep:'#304956',slate:'#4c6872',steel:'#79959a',light:'#b9d0cb',cream:'#fff0ca',ivory:'#e6d9ad',sand:'#c4b17f',wood:'#b87850',woodDark:'#795544',peach:'#e7a36b',gold:'#f3c47d',coral:'#df775b',rust:'#a95345',green:'#418275',jade:'#64a48c',mint:'#98c6a4',greenDark:'#305d59',blue:'#81a8b4',sky:'#a5c7c5',white:'#f5f3de',water:'#508f99',red:'#c65249',yellow:'#ffd789'};
function raster(ctx){
 const r=(x,y,w,h,color)=>{ctx.fillStyle=C[color]||color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const px=(x,y,color)=>r(x,y,1,1,color);
 const l=(x0,y0,x1,y1,color,width=1)=>{x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(;;){r(x0-Math.floor(width/2),y0-Math.floor(width/2),width,width,color);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}};
 const p=(points,color)=>{const min=Math.ceil(Math.min(...points.map(v=>v[1]))),max=Math.floor(Math.max(...points.map(v=>v[1])));for(let y=min;y<=max;y++){const hit=[],scan=y+.5;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))hit.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));}hit.sort((a,b)=>a-b);for(let i=0;i+1<hit.length;i+=2){const x=Math.ceil(hit[i]-.5);r(x,y,Math.ceil(hit[i+1]-.5)-x,1,color);}}};
 const o=(x,y,rx,ry,color)=>{for(let row=Math.ceil(y-ry);row<=Math.floor(y+ry);row++){const half=rx*Math.sqrt(Math.max(0,1-((row-y)/ry)**2)),left=Math.ceil(x-half);r(left,row,Math.floor(x+half)-left+1,1,color);}};
 const hook=(x,y,scale=1,color='steel')=>{l(x,y,x,y+4*scale,color,scale);l(x,y+4*scale,x-2*scale,y+6*scale,color,scale);l(x-2*scale,y+6*scale,x-4*scale,y+4*scale,color,scale);l(x-4*scale,y+4*scale,x-4*scale,y+2*scale,color,scale);l(x-4*scale,y+2*scale,x-3*scale,y+3*scale,color,scale);};
 const shadow=(x=16,y=28,rx=11)=>o(x,y,rx,1,'#223a4620');
 return{r,px,l,p,o,hook,shadow};
}

function rod(a,kind){const {r,l,o,px,shadow}=a,light=kind==='rod_light',boat=kind==='rod_boat',shaft=boat?'coral':light?'jade':'gold';shadow(14,29,11);l(5,27,25,3,'ink',boat?3:2);l(7,24,25,3,shaft);l(6,27,12,19,'woodDark',3);l(6,26,11,20,light?'ivory':'wood',2);for(const [x,y]of[[15,15],[20,9],[24,4]]){r(x,y,3,1,'steel');px(x+2,y+1,'cream');}l(26,5,27,20,'light');l(27,20,24,23,'light');o(14,21,4,4,'ink');o(14,21,3,3,boat?'steel':light?'sky':'sand');r(12,19,4,3,'navy');r(13,19,2,3,'light');l(17,22,19,25,'steel');r(18,25,3,2,'ink');px(12,25,'cream');}
function cooler(a,large=false){const {r,l,shadow}=a,x=large?3:5,w=large?26:22;shadow(16,29,12);r(x,9,w,18,'ink');r(x+1,11,w-2,15,large?'navy':'water');r(x+2,17,w-4,7,large?'water':'blue');r(x,8,w,6,'ink');r(x+1,9,w-2,3,'white');r(x+2,9,w-4,1,'cream');r(x+2,12,w-4,2,'light');r(x+4,14,3,4,'ink');r(x+5,14,1,3,'sand');r(x+w-7,14,3,4,'ink');r(x+w-6,14,1,3,'sand');l(x-1,15,x-1,21,'steel',2);l(x+w,15,x+w,21,'steel',2);if(large){r(9,19,2,5,'blue');r(15,19,2,5,'blue');r(21,19,2,5,'blue');r(7,27,4,2,'ink');r(22,27,4,2,'ink');}else{r(9,20,9,1,'sky');r(9,22,5,1,'light');}}
function packet(a,color='water'){const {r,l}=a;r(5,4,23,25,'ink');r(6,5,21,23,'ivory');r(7,6,19,4,color);r(7,12,19,13,'#b9d0cb');r(8,13,17,11,'cream');r(7,26,19,2,color);l(8,5,8,27,'white');r(18,7,6,1,'light');}
function fish(a,x,y,length=16,kind='anchovy'){const {r,px,l,p}=a,fat=kind==='sardine',body=fat?'blue':'light';p([[x,y],[x+4,y-3],[x+length-3,y-2],[x+length,y],[x+length-3,y+3],[x+4,y+3]],'ink');p([[x+1,y],[x+4,y-2],[x+length-3,y-1],[x+length-1,y],[x+length-3,y+2],[x+4,y+2]],body);p([[x+length-3,y],[x+length+2,y-3],[x+length+2,y+3]],fat?'navy':'steel');l(x+4,y-1,x+length-4,y-1,fat?'navy':'water');r(x+4,y+1,length-7,1,'white');px(x+2,y,'ink');if(fat)for(let i=5;i<length-3;i+=3)px(x+i,y,'navy');}
function drawRig(a,id){const {r,px,l,p,o,hook,shadow}=a;shadow();
 if(id==='rig_slider'){l(3,6,14,10,'steel');l(14,10,22,11,'steel');o(11,9,6,3,'ink');o(11,9,5,2,'steel');l(7,8,14,8,'light');px(11,9,'deep');o(19,11,1,1,'gold');l(20,11,27,13,'blue');l(27,13,27,21,'blue');hook(27,20,1);r(23,23,2,3,'coral');r(24,25,2,2,'peach');return;}
 if(id==='rig_jig'){l(3,6,8,12,'light');o(9,14,4,4,'ink');o(9,14,3,3,'steel');px(8,12,'white');px(10,14,'ink');l(11,12,15,9,'steel');l(15,9,19,9,'steel');l(19,9,20,12,'steel');l(20,12,18,11,'steel');p([[11,14],[17,13],[25,18],[28,18],[29,23],[26,24],[24,21],[16,19],[11,18]],'greenDark');p([[12,14],[17,14],[25,19],[27,19],[28,23],[26,23],[24,20],[16,18],[12,17]],'mint');l(13,16,23,19,'yellow');return;}
 if(id==='rig_float'){l(16,2,16,29,'light');r(15,4,3,4,'ink');r(16,4,1,4,'red');o(16,12,5,7,'ink');o(16,12,4,6,'white');p([[12,8],[14,5],[18,5],[20,9],[20,12],[12,12]],'coral');r(13,10,2,2,'peach');r(14,13,2,3,'cream');r(15,19,3,3,'gold');r(15,24,2,2,'steel');hook(16,25,1);return;}
 if(id==='rig_feather40'){l(9,3,9,23,'steel',2);o(9,3,1,1,'gold');for(const y of[7,17]){l(9,y,25,y+1,'blue');hook(25,y+1,1.3,'ink');p([[24,y],[19,y-2],[20,y+2],[17,y+4],[22,y+5]],y===7?'coral':'white');l(23,y-1,20,y+5,'gold');l(22,y,18,y+4,'cream');}p([[9,23],[14,28],[12,31],[5,31],[4,28]],'ink');p([[9,24],[12,28],[11,30],[6,30]],'slate');l(8,26,7,29,'light');return;}
 const feather=id==='rig_sabiki';l(12,3,12,24,'steel');o(12,4,1,1,'gold');
 for(const [y,end]of[[9,24],[18,23]]){l(12,y,end-1,y+2,'blue');hook(end,y+1,1);if(feather){p([[end-1,y+2],[end-4,y-1],[end-3,y+4],[end-6,y+4],[end-2,y+6]],y===9?'mint':'peach');l(end-2,y,end-2,y+5,'cream');px(end-4,y+3,y===9?'jade':'coral');}else{r(end-4,y+3,3,3,'coral');r(end-4,y+3,2,2,'peach');}}
 p([[12,23],[16,28],[15,30],[9,30],[8,28]],'ink');p([[12,24],[14,28],[13,29],[10,29]],feather?'steel':'slate');px(11,27,'light');
}

const painters={
 pfd(a){const {r,l,p,shadow}=a;shadow();p([[8,4],[12,3],[13,7],[19,7],[20,3],[24,4],[25,12],[28,15],[26,28],[6,28],[4,15],[7,12]],'ink');p([[9,5],[11,5],[12,10],[15,11],[15,26],[7,26],[6,16],[9,13]],'coral');p([[21,5],[23,5],[23,13],[26,16],[25,26],[17,26],[17,11],[20,10]],'rust');r(19,12,5,12,'coral');r(9,12,3,9,'peach');r(7,17,19,3,'navy');r(8,23,18,2,'navy');r(14,16,5,5,'ink');r(15,17,3,3,'gold');r(16,18,1,1,'navy');l(16,11,16,25,'cream');},
 rod:a=>rod(a,'rod'),rod_light:a=>rod(a,'rod_light'),rod_boat:a=>rod(a,'rod_boat'),
 rod_electric(a){rod(a,'rod_boat');const {r,l,o,px}=a;
  // Compact electric reel with a top display and an integrated power pack.
  r(8,17,13,10,'ink');r(9,18,11,8,'slate');r(9,18,3,7,'steel');r(10,19,1,5,'light');
  r(13,16,7,6,'ink');r(14,17,5,3,'mint');r(15,18,3,1,'greenDark');px(18,17,'white');
  o(17,23,3,3,'navy');o(17,23,2,2,'steel');r(16,22,2,3,'light');px(13,23,'gold');
  r(5,25,9,5,'ink');r(6,26,7,3,'navy');r(7,27,3,1,'jade');px(11,27,'mint');l(10,25,10,23,'ink');
  l(20,23,23,25,'steel');r(22,25,4,2,'ink');px(23,25,'light');
 },
 tackle(a){const {r,l,o,hook,shadow}=a;shadow();r(4,5,24,9,'ink');r(5,6,22,7,'water');r(7,7,18,1,'jade');r(4,14,24,13,'ink');r(5,15,22,11,'sand');r(6,16,20,9,'ivory');r(13,16,1,9,'wood');r(21,16,1,9,'wood');r(6,21,15,1,'wood');r(6,16,6,4,'white');hook(11,15,1,'steel');o(17,18,2,2,'coral');r(16,20,2,1,'cream');o(17,24,2,1,'steel');l(24,17,24,23,'light');o(24,23,1,2,'slate');r(14,27,5,2,'ink');r(15,27,3,1,'gold');},
 bait(a){const {r,l,p,o,shadow}=a;shadow();r(5,7,23,20,'ink');r(6,8,21,4,'water');r(7,9,19,1,'jade');r(6,12,21,14,'ivory');r(8,14,17,10,'white');p([[17,13],[21,19],[18,21],[14,21],[12,19]],'coral');p([[17,14],[20,19],[16,21],[13,19]],'peach');for(const [x,y]of[[13,25],[16,25],[19,24],[22,25]])l(16,20,x,y,'coral');o(17,18,1,1,'cream');r(6,26,21,1,'steel');},
 cooler:a=>cooler(a),cooler_large:a=>cooler(a,true),
 net(a){const {r,l,o,shadow}=a;shadow();l(6,29,18,17,'ink',3);l(6,28,17,17,'wood',2);o(20,11,9,9,'ink');o(20,11,7,7,'sky');for(let y=5;y<=17;y++)for(let x=14;x<=26;x++)if(((x+y)%4===0||(x-y+32)%4===0)&&((x-20)/7)**2+((y-11)/7)**2<.9)r(x,y,1,1,'ivory');l(15,5,18,3,'light');l(26,8,27,13,'steel');r(5,27,3,3,'woodDark');},
 descending_device(a){const {r,l,p,o,shadow}=a;shadow();l(15,2,15,8,'ivory');o(15,9,3,2,'ink');o(15,9,2,1,'steel');l(12,11,10,19,'ink',3);l(18,11,21,18,'ink',3);l(12,12,11,18,'light',2);l(18,12,20,17,'steel',2);r(10,18,4,4,'coral');r(18,18,4,3,'rust');l(13,13,18,16,'steel',2);r(14,12,3,3,'gold');l(15,18,15,24,'ivory');p([[14,23],[18,23],[20,28],[17,30],[12,29],[11,27]],'ink');r(13,24,5,4,'slate');r(13,24,2,3,'steel');},
 water(a){const {r,p,o,shadow}=a;shadow();r(8,3,7,4,'ink');r(9,3,5,2,'navy');p([[8,7],[15,7],[17,10],[17,28],[6,28],[6,10]],'ink');r(7,10,9,17,'water');r(8,9,7,5,'sky');r(8,15,7,8,'ivory');r(10,16,3,5,'blue');r(8,24,2,2,'sky');r(20,13,6,3,'woodDark');r(19,16,8,12,'ink');r(20,17,6,10,'coral');r(21,19,4,5,'cream');r(21,27,5,1,'rust');o(23,8,6,3,'navy');r(20,6,6,5,'steel');r(21,7,4,3,'yellow');},
 safety(a){const {r,l,o,shadow}=a;shadow();l(8,2,8,10,'ink',2);r(4,10,11,18,'ink');r(5,11,9,15,'navy');r(6,12,6,5,'jade');r(7,13,4,1,'mint');for(let y=20;y<=24;y+=2)r(7,y,5,1,'steel');r(12,8,2,3,'steel');r(17,12,11,16,'ink');r(18,13,9,14,'coral');r(20,9,5,4,'ink');r(21,10,3,2,'ivory');r(21,17,3,7,'white');r(19,19,7,3,'white');r(19,26,7,1,'rust');},
 reel_smooth(a){const {r,l,o,p,shadow}=a;shadow();l(16,4,16,10,'steel',3);r(10,3,12,3,'ink');r(11,3,10,1,'light');o(16,16,9,9,'ink');o(16,16,7,7,'steel');o(16,16,5,6,'navy');o(16,16,3,5,'gold');r(15,12,2,8,'ivory');l(10,9,6,12,'light');l(6,12,6,18,'light');l(21,20,25,24,'steel',2);r(24,24,6,3,'ink');r(25,24,4,1,'wood');a.px(14,10,'cream');},
 line_braid(a){const {r,l,o,shadow}=a;shadow();o(14,16,10,11,'ink');o(14,16,9,10,'slate');o(14,16,7,8,'green');for(let y=10;y<=23;y+=3)l(8,y,20,y-3,'mint');o(14,16,3,4,'ink');o(14,16,1,2,'gold');l(22,18,28,18,'jade');l(28,18,28,25,'jade');l(28,25,24,27,'jade');r(7,6,14,1,'steel');},
 leader_heavy(a){const {r,l,o,shadow}=a;shadow();o(14,15,10,10,'ink');o(14,15,9,9,'sand');o(14,15,7,7,'ivory');o(14,15,5,5,'wood');o(14,15,4,4,'cream');o(14,15,2,2,'ink');l(23,16,28,20,'ivory',2);l(28,20,28,25,'ivory',2);l(28,25,22,28,'ivory',2);r(9,6,11,2,'white');r(7,21,11,2,'gold');},
 rod_sabiki(a){const {l,r,o}=a;l(5,29,25,3,'ink',3);l(6,28,25,3,'jade');o(11,23,4,4,'steel');o(11,23,2,2,'navy');l(26,3,27,26,'ivory');for(let i=0;i<6;i++){const y=5+i*3;l(27,y,22,y+1,'ivory');r(21,y+1,2,1,'white');}},
 rig_sabiki6(a){packet(a,'green');const {l,r}=a;l(16,11,16,27,'steel');for(let i=0;i<6;i++){const y=12+i*2,x=i%2?21:11;l(16,y,x,y+1,'ivory');r(x,y+1,2,1,'white');}r(15,26,3,2,'slate');},
 rig_slider:a=>drawRig(a,'rig_slider'),rig_jig:a=>drawRig(a,'rig_jig'),rig_float:a=>drawRig(a,'rig_float'),rig_dropper:a=>drawRig(a,'rig_dropper'),rig_sabiki:a=>drawRig(a,'rig_sabiki'),rig_feather40:a=>drawRig(a,'rig_feather40'),
 sinker_heavy(a){const {r,l,p,o,shadow}=a;shadow();p([[7,10],[24,10],[27,25],[24,29],[6,29],[4,24]],'ink');p([[8,11],[23,11],[25,25],[23,27],[7,27],[6,24]],'wood');r(8,10,15,3,'sand');l(9,14,10,25,'peach');for(const [x,y,size]of[[11,7,3],[19,6,4],[17,18,4]]){o(x,y,1,1,'steel');p([[x,y+1],[x+size,y+7],[x+size-1,y+9],[x-size+1,y+9],[x-size,y+7]],'ink');p([[x,y+2],[x+size-1,y+7],[x+size-2,y+8],[x-size+1,y+7]],'steel');l(x-1,y+4,x-1,y+7,'light');}},
 bait_anchovy(a){packet(a,'water');fish(a,8,18,14,'anchovy');},
 bait_sardine(a){packet(a,'navy');fish(a,8,17,14,'sardine');a.l(12,22,22,22,'steel');a.px(23,22,'navy');},
 bait_shrimp(a){packet(a,'coral');const {r,l,p,px}=a;p([[20,13],[24,16],[24,20],[20,24],[15,24],[12,21],[12,17],[15,14]],'rust');p([[19,14],[22,16],[22,19],[19,22],[15,22],[14,20],[15,17],[18,16]],'peach');l(20,14,17,17,'coral');l(22,17,19,18,'coral');l(21,20,18,19,'coral');l(14,21,11,23,'coral');l(14,20,10,20,'coral');l(15,16,9,14,'coral');l(15,16,10,16,'coral');px(19,14,'ink');},
 bait_soft(a){packet(a,'green');const {p,l,px}=a;for(const y of[15,21]){p([[9,y],[12,y-1],[20,y],[24,y+2],[24,y+4],[21,y+3],[18,y+1],[10,y+2]],'greenDark');l(10,y,18,y+1,'mint',2);l(19,y+1,23,y+3,'jade',2);px(10,y,'ink');}},
 nautical_chart(a){const {r,l,p,px,shadow}=a;shadow();p([[3,6],[11,3],[21,6],[29,3],[29,26],[21,29],[11,26],[3,29]],'ink');p([[4,7],[11,5],[21,8],[28,5],[28,25],[21,27],[11,24],[4,27]],'cream');p([[5,10],[9,9],[13,13],[16,14],[19,19],[27,20],[27,25],[21,27],[11,24],[5,26]],'sky');p([[5,10],[9,9],[13,13],[16,14],[19,19],[17,21],[13,17],[10,17],[8,13],[5,14]],'jade');for(const x of[8,16,24])l(x,9,x,24,'#79959a66');for(const y of[12,18,23])l(6,y,26,y,'#79959a66');l(11,6,11,23,'sand');l(21,8,21,26,'ivory');px(15,20,'coral');px(17,22,'coral');px(20,22,'coral');r(23,9,1,7,'navy');r(21,12,5,1,'navy');p([[23,8],[25,12],[21,12]],'coral');},
 compass(a){const {r,l,p,o,shadow}=a;shadow();r(4,10,24,13,'ink');r(5,12,22,8,'woodDark');o(16,16,12,12,'ink');o(16,16,10,10,'gold');o(16,16,8,8,'cream');o(16,16,6,6,'ivory');for(const [x,y]of[[16,7],[16,25],[7,16],[25,16]])r(x-1,y-1,2,2,'navy');l(10,10,12,12,'steel');l(22,10,20,12,'steel');l(10,22,12,20,'steel');l(22,22,20,20,'steel');p([[19,9],[18,18],[13,18]],'coral');p([[13,23],[13,15],[18,15]],'navy');o(16,16,1,1,'ink');},
 gps(a){const {r,l,p,o,shadow}=a;shadow();r(10,2,4,5,'ink');r(8,5,17,24,'ink');r(9,6,15,22,'navy');r(10,7,13,14,'steel');r(11,8,11,12,'mint');p([[11,9],[14,8],[15,12],[19,15],[22,15],[22,20],[11,20]],'green');l(12,11,20,18,'ivory');p([[17,12],[20,17],[17,16],[15,17]],'cream');r(15,22,4,5,'ink');r(14,23,6,3,'ink');r(16,23,2,3,'steel');o(21,24,1,1,'gold');o(11,24,1,1,'coral');r(11,27,11,1,'slate');},
 sounder(a){const {r,l,p,px,shadow}=a;shadow();r(14,23,4,5,'ink');r(9,27,14,2,'ink');r(3,5,26,20,'ink');r(4,6,24,17,'steel');r(5,7,19,14,'navy');r(6,8,17,12,'deep');for(const y of[9,12,15])r(6,y,17,1,'water');p([[6,18],[10,17],[13,18],[16,15],[19,16],[22,14],[23,20],[6,20]],'wood');l(6,17,10,16,'gold');l(10,16,13,17,'gold');l(13,17,17,14,'gold');l(17,14,20,15,'gold');l(20,15,23,13,'gold');r(25,10,2,2,'gold');r(25,14,2,2,'ink');r(25,18,2,2,'ink');px(11,12,'coral');px(12,11,'coral');px(13,12,'coral');r(6,7,17,1,'light');},
 anchor(a){const {r,l,p,o,px,shadow}=a;shadow();
  // Galvanised fluke anchor, shackle and a coil of rode; separate from a drogue.
  o(8,8,5,5,'woodDark');o(8,8,4,4,'gold');o(8,8,2,2,'woodDark');o(8,8,1,1,'cream');l(7,3,14,3,'ivory');l(13,3,16,5,'gold');
  o(17,6,4,4,'ink');o(17,6,3,3,'steel');o(17,6,1,1,'deep');px(16,4,'white');
  l(17,10,17,27,'ink',4);l(16,10,16,25,'light',2);l(18,10,18,26,'slate');
  l(4,14,29,14,'ink',3);l(4,13,29,13,'steel');r(5,13,10,1,'light');
  p([[3,16],[12,18],[16,27],[13,28],[7,24]],'ink');p([[5,17],[11,19],[14,25],[12,26],[8,23]],'steel');l(5,17,10,19,'light');
  p([[30,16],[21,18],[17,27],[20,28],[26,24]],'ink');p([[28,17],[22,19],[19,25],[21,26],[25,23]],'steel');l(23,19,28,17,'light');
  r(15,24,5,4,'slate');r(15,24,3,2,'light');px(17,25,'cream');
 },
 sea_anchor(a){const {l,p,o,shadow}=a;shadow();p([[5,6],[9,6],[23,14],[23,17],[9,26],[5,26]],'ink');p([[8,8],[21,14],[21,17],[8,24]],'coral');p([[8,8],[21,14],[19,16],[8,14]],'peach');p([[8,18],[20,16],[21,17],[8,24]],'rust');l(8,13,20,15,'ivory');l(8,20,20,16,'ivory');o(7,16,4,10,'ink');o(7,16,2,8,'water');l(23,15,29,10,'steel');l(29,10,29,22,'steel');o(27,24,2,2,'wood');l(24,25,27,27,'gold');},
};
function fallback(a){const {r,l,shadow}=a;shadow();r(5,8,23,19,'ink');r(6,9,21,17,'wood');r(7,10,19,3,'peach');r(7,15,19,10,'sand');l(7,15,25,24,'wood');l(25,15,7,24,'wood');r(14,11,5,6,'ink');r(15,12,3,4,'gold');}

export const ITEM_ICON_IDS=Object.freeze(Object.keys(painters));

/** Paint catalog item objects or stable catalog IDs into the supplied canvas. */
export function drawItemIcon(canvas,item){
 if(!canvas?.getContext)throw new TypeError('drawItemIcon requires a canvas');
 canvas.width=32;canvas.height=32;if(canvas.style)canvas.style.imageRendering='pixelated';
 const ctx=canvas.getContext('2d');if(!ctx)return canvas;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,32,32);
 const id=typeof item==='string'?item:item?.id;(painters[id]||fallback)(raster(ctx));return canvas;
}

export function createItemIcon(item){
 const canvas=typeof document!=='undefined'?document.createElement('canvas'):new OffscreenCanvas(32,32);
 return drawItemIcon(canvas,item);
}
