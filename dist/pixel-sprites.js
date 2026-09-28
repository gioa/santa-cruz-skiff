/* Original, hand-authored pixel art. Every mark is rasterised onto a 1 px grid.
 * Transparent canvases can be drawn directly; callers should disable smoothing.
 * Boat points north. Figures stand at the bottom centre of their 16 × 26 cell.
 */
import {SKIFF_HULL_OUTLINE} from './pixel-boat-geometry.js?v=20260928-pixel-v72';
const C = {
  ink:'#223a46', deep:'#304956', slate:'#4c6872', steel:'#79959a', light:'#b9d0cb',
  cream:'#fff0ca', ivory:'#e6d9ad', sand:'#c4b17f', wood:'#b87850', woodDark:'#795544',
  woodMid:'#93664b', peach:'#e7a36b', gold:'#f3c47d', coral:'#df775b', rust:'#a95345',
  green:'#418275', jade:'#64a48c', mint:'#98c6a4', greenDark:'#305d59',
  navy:'#344e68', denim:'#567b8d', blue:'#81a8b4', sky:'#a5c7c5',
  skin:'#e8ac79', skinDark:'#b77e5c', skinLight:'#ffd5a0', hair:'#715545',
  red:'#c65249', white:'#f5f3de', water:'#508f99', yellow:'#ffd789',
};

function raster(width,height,paint) {
  const canvas=typeof document!=='undefined'?document.createElement('canvas'):new OffscreenCanvas(width,height);
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=C[color]||color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const px=(x,y,color)=>rect(x,y,1,1,color);
  const line=(x0,y0,x1,y1,color,weight=1)=>{
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;
    for(;;){rect(x0-Math.floor(weight/2),y0-Math.floor(weight/2),weight,weight,color);if(x0===x1&&y0===y1)break;const e=2*error;if(e>=dy){error+=dy;x0+=sx;}if(e<=dx){error+=dx;y0+=sy;}}
  };
  const poly=(points,color)=>{
    const minY=Math.ceil(Math.min(...points.map(p=>p[1]))),maxY=Math.floor(Math.max(...points.map(p=>p[1])));
    for(let y=minY;y<=maxY;y++){
      const hits=[];const scan=y+.5;
      for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))hits.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
      hits.sort((a,b)=>a-b);for(let i=0;i+1<hits.length;i+=2){const x=Math.ceil(hits[i]-.5),end=Math.ceil(hits[i+1]-.5);rect(x,y,end-x,1,color);}
    }
  };
  const oval=(cx,cy,rx,ry,color)=>{for(let y=Math.ceil(cy-ry);y<=Math.floor(cy+ry);y++){const d=(y-cy)/ry;const span=Math.sqrt(Math.max(0,1-d*d))*rx;rect(Math.ceil(cx-span),y,Math.floor(cx+span)-Math.ceil(cx-span)+1,1,color);}};
  const dot=(x,y,color='gold')=>{rect(x,y,2,1,color);px(x,y+1,color);};
  paint({canvas,ctx,rect,px,line,poly,oval,dot});return canvas;
}

function boatSprite({outboard=true}={}){return raster(48,88,({rect:r,px,line:l,poly:p})=>{
  // Narrow open clinker skiff, viewed from above; the trim has separate light faces.
  p(SKIFF_HULL_OUTLINE,'ink');
  p([[24,3],[28,6],[33,12],[37,23],[40,37],[40,66],[37,76],[11,76],[8,66],[8,37],[11,23],[15,13],[20,6]],'woodDark');
  p([[24,4],[29,9],[34,17],[38,32],[39,54],[38,70],[36,74],[12,74],[10,67],[9,52],[10,32],[14,17],[19,9]],'peach');
  p([[24,7],[28,12],[32,19],[36,33],[37,53],[36,70],[12,70],[11,53],[12,34],[16,19],[20,12]],'greenDark');
  p([[24,10],[28,16],[31,23],[34,35],[35,55],[34,67],[14,67],[13,55],[14,35],[17,23],[20,16]],'green');
  p([[24,13],[29,24],[32,37],[33,64],[15,64],[15,37],[19,24]],'jade');
  // Individual bottom boards, ribs, seam shadows and sea-worn paint.
  l(24,16,24,64,'greenDark');l(20,24,20,64,'green');l(28,24,28,64,'green');
  l(16,36,16,63,'mint');l(32,36,32,63,'greenDark');
  r(16,36,17,2,'greenDark');r(16,38,17,1,'mint');
  r(15,55,19,2,'greenDark');r(16,57,17,1,'mint');
  [[19,32],[27,29],[29,59],[18,60],[21,47]].forEach(([x,y])=>r(x,y,2,1,'mint'));
  // Broad mahogany thwarts are visibly above their supporting ribs.
  [[16,24,16],[12,43,24],[12,64,24]].forEach(([x,y,w])=>{r(x,y+3,w,3,'greenDark');r(x,y,w,4,'woodDark');r(x,y,w,2,'wood');r(x,y,w,1,'gold');r(x+2,y+2,w-5,1,'peach');px(x+1,y+1,'slate');px(x+w-2,y+1,'slate');});
  // Open foredeck, bow painter and cleat.
  p([[24,6],[29,15],[19,15]],'wood');l(23,8,20,13,'gold');r(22,15,4,2,'woodDark');
  l(24,15,24,20,'ivory');px(25,20,'ivory');px(26,19,'ivory');px(25,18,'ivory');
  r(22,12,5,1,'slate');r(24,11,1,3,'steel');
  // Bright port rail and cooler under the middle thwart.
  l(20,6,15,14,'cream');l(15,14,11,25,'cream');l(11,25,9,39,'cream');l(9,39,9,63,'ivory');
  l(37,26,39,40,'wood');l(39,40,39,64,'wood');
  r(16,47,9,7,'ink');r(17,47,7,5,'white');r(17,51,7,2,'blue');r(18,48,5,1,'sky');px(20,52,'steel');
  r(28,49,4,5,'woodDark');r(28,49,4,2,'gold');px(29,52,'cream');
  // Port and starboard oars, clipped into bronze rowlocks.
  l(5,36,9,64,'woodDark',2);l(5,36,9,62,'peach');p([[3,28],[5,27],[7,30],[8,39],[5,40],[3,36]],'woodDark');l(4,29,6,37,'gold',2);
  l(42,36,38,64,'woodDark',2);l(42,36,38,62,'peach');p([[43,28],[45,27],[45,36],[43,40],[40,39],[41,31]],'woodDark');l(43,29,42,37,'gold',2);
  r(7,43,4,2,'slate');px(8,42,'gold');r(37,43,4,2,'slate');px(39,42,'gold');
  // Transom, polished brackets, outboard cowl and an actual forward-pointing tiller.
  r(11,71,26,5,'woodDark');r(12,71,24,2,'gold');r(13,74,22,1,'peach');
  r(19,75,10,2,'steel');
  if(outboard){r(21,76,6,7,'ink');r(19,79,10,6,'ink');
  r(20,78,8,6,'slate');r(20,78,8,2,'light');r(20,80,2,3,'steel');r(23,81,5,2,'navy');
  r(23,84,3,3,'ink');r(20,86,9,1,'slate');r(22,85,5,1,'steel');
  l(22,78,19,68,'ink',2);l(22,77,19,69,'steel');r(18,66,3,5,'ink');}
  // Fasteners and rope rub marks stay below the visual scale of equipment.
  [[12,68],[35,68],[9,52],[38,52],[13,22],[34,22]].forEach(([x,y])=>px(x,y,'cream'));
});}

// Separate swivel assembly. Pivot is (10,16); brackets stay on the hull.
function outboardSprite(){return raster(20,28,({rect:r,line:l})=>{
  r(7,14,6,7,'ink');r(5,17,10,6,'ink');
  r(6,16,8,6,'slate');r(6,16,8,2,'light');r(6,18,2,3,'steel');r(9,19,5,2,'navy');
  r(9,22,3,3,'ink');r(6,24,9,1,'slate');r(8,23,5,1,'steel');
  l(8,16,5,6,'ink',2);l(8,15,5,7,'steel');r(4,3,3,5,'ink');r(4,4,1,3,'slate');
});}

function personSprite({worker=false,back=false,step=0,fish=false,hold=false,drive=false,side=0}={}){
  return raster(16,26,({rect:r,px,poly:p,line:l})=>{
    const jacket=worker?'green':'coral',jacketShade=worker?'greenDark':'rust';
    // Shadow and two separate boot silhouettes; the stride moves opposite feet.
    r(4,24,9,1,'#20364266');
    const leftY=step===1?21:22,rightY=step===2?21:22;
    r(4,leftY,4,3,'ink');r(9,rightY,4,3,'ink');r(4,leftY,3,1,'woodDark');r(9,rightY,3,1,'woodDark');
    r(4,17,4,5,'navy');r(9,17,3,5,'navy');r(5,18,2,4,'denim');r(9,18,1,3,'denim');
    p([[4,10],[11,10],[13,13],[12,19],[4,19],[2,14]],'ink');
    r(4,10,8,9,jacketShade);r(4,10,3,7,jacket);r(8,10,3,7,jacket);r(4,11,1,5,worker?'mint':'peach');
    if(back){r(6,12,4,3,worker?'jade':'gold');r(5,16,6,1,jacketShade);}
    else {r(7,10,1,8,'cream');r(5,15,2,2,jacketShade);r(9,15,2,2,jacketShade);px(8,12,'gold');}
    // Sleeves and free hands have readable cuffs, instead of floating skin dots.
    if(hold){
      // World-space articulated forearms connect these sleeves to the shared
      // rod grip. No baked-in handle can detach when elevation changes.
      r(2,12,3,2,'navy');r(2,12,1,2,'denim');r(11,11,3,3,'navy');r(12,12,2,1,'denim');
    }else if(fish){
      r(2,12,3,4,'navy');r(3,14,4,2,'denim');r(6,14,4,2,'skin');r(9,13,2,3,'skinLight');
      r(11,11,3,4,'navy');r(12,13,3,2,'denim');r(12,15,3,2,'skin');
      r(11,12,2,7,'woodDark');r(12,12,1,6,'gold');r(13,14,2,2,'slate');px(14,14,'steel');
    }else if(drive){
      r(2,12,3,4,'navy');r(2,15,3,2,'denim');r(3,17,3,2,'skin');r(4,18,3,1,'skinLight');
      r(11,12,3,3,'navy');r(11,14,3,3,'denim');r(12,17,3,2,'skin');
    }else{
      r(2,12,3,4,'navy');r(2,13,1,3,'denim');r(2,16+(step===2?-1:0),2,3,'skin');px(2,16,'skinLight');
      r(11,12,3,4,'navy');r(12,13,1,3,'denim');r(12,16+(step===1?-1:0),2,3,'skin');px(12,16,'skinLight');
    }
    // Head sits into a collar; off-centre cap brim gives the face direction.
    r(6,9,4,2,'skinDark');r(4,3,8,6,'hair');r(3,5,2,3,'skinDark');r(11,5,2,3,'skinDark');
    r(5,4,6,5,back?'hair':'skin');
    if(!back){r(5,5,5,2,'skinLight');px(side<0?5:7,6,'ink');if(side===0)px(10,6,'ink');r(side<0?4:10,7,2,1,'skin');px(8,8,'skinDark');}
    r(4,1,7,2,'ink');r(3,2,10,3,worker?'gold':'ivory');r(4,1,7,2,worker?'peach':'cream');
    r(3,4,10,1,worker?'wood':'sand');
    if(back){r(6,4,4,1,'woodDark');}else {r(side<0?1:4,4,side===0?10:9,2,worker?'wood':'sand');r(side<0?1:4,4,side===0?10:9,1,worker?'gold':'cream');}
    if(worker){r(6,11,4,5,'woodDark');r(7,12,2,3,'ivory');px(8,13,'woodMid');}
  });
}

// The counter keeper has their own silhouette, face and work clothes rather
// than the angler sprite with another vest colour. Keep the same foot anchor.
function dockWorkerSprite(){return raster(16,26,({rect:r,px,poly:p,line:l})=>{
  r(2,24,13,1,'#20364266');
  // Wider planted stance and tall waterproof boots.
  r(4,20,4,5,'ink');r(10,20,4,5,'ink');r(4,20,3,3,'greenDark');r(10,20,3,3,'greenDark');
  r(3,24,5,1,'ink');r(10,24,5,1,'ink');r(4,23,3,1,'steel');r(11,23,2,1,'slate');
  // Broad yellow oilskin shoulders, over a dark teal shop apron.
  p([[4,11],[11,11],[14,13],[15,18],[13,21],[3,21],[1,18],[2,13]],'ink');
  r(3,12,10,9,'wood');r(3,12,9,7,'gold');r(3,13,2,5,'yellow');r(12,13,2,6,'peach');
  r(5,12,1,4,'greenDark');r(10,12,1,4,'greenDark');r(5,15,7,6,'greenDark');
  r(6,15,4,5,'green');r(6,15,4,1,'jade');r(6,18,5,2,'deep');r(7,18,3,1,'jade');
  // White employee badge and clipped VHF with a short aerial.
  r(8,13,3,2,'cream');px(9,13,'slate');r(11,14,2,4,'ink');r(12,12,1,3,'ink');px(12,15,'mint');
  r(1,15,3,4,'gold');r(1,15,1,3,'yellow');r(13,18,2,3,'skin');px(14,18,'skinLight');
  // A distinct rectangular clipboard is held against the left side.
  r(0,16,6,7,'woodDark');r(1,17,4,5,'ivory');r(1,17,4,1,'white');r(2,16,2,2,'steel');
  r(2,19,2,1,'woodMid');r(2,21,2,1,'woodMid');r(4,18,2,2,'skin');px(4,18,'skinLight');
  // Older, rounded face, silver sideburns and moustache below the eyes.
  r(6,10,4,3,'skinDark');r(4,5,8,6,'ink');r(3,7,2,3,'skinDark');r(12,7,2,3,'skinDark');
  r(5,6,7,5,'skin');r(5,6,5,2,'skinLight');r(4,6,1,4,'light');r(11,6,1,4,'steel');
  px(6,8,'ink');px(10,8,'ink');r(8,8,1,2,'skinDark');r(6,10,5,1,'cream');r(7,11,3,1,'light');
  // Compact navy work cap: no broad cream sunhat or coral lifejacket.
  p([[5,1],[10,1],[12,3],[12,6],[3,6],[3,3]],'ink');r(5,2,6,3,'navy');r(4,3,7,2,'navy');
  r(5,2,5,1,'denim');r(3,5,10,1,'steel');r(5,6,9,1,'ink');r(6,6,6,1,'navy');
  r(7,3,3,2,'gold');px(8,3,'cream');
});}

function wardenSprite(){return raster(16,26,({rect:r,px,poly:p})=>{
  r(2,24,12,1,'#20364266');r(4,18,4,6,'greenDark');r(9,18,4,6,'greenDark');
  r(3,23,5,2,'ink');r(9,23,5,2,'ink');r(5,19,1,4,'green');r(10,19,1,4,'green');
  p([[4,10],[11,10],[14,13],[14,19],[2,19],[2,13]],'ink');
  r(3,11,10,7,'greenDark');r(4,11,7,6,'green');r(4,11,7,1,'jade');r(7,12,1,6,'mint');
  r(3,18,10,2,'ink');r(7,18,2,1,'gold');r(2,13,2,5,'green');r(2,17,2,3,'skin');
  // Gold shield, shoulder patch, radio and duty belt distinguish the officer.
  r(9,12,2,2,'gold');px(10,14,'gold');px(9,12,'cream');r(3,12,2,2,'sand');
  r(4,14,2,3,'ink');r(4,12,1,3,'ink');px(5,15,'steel');r(10,18,3,3,'deep');
  r(10,15,6,7,'woodDark');r(11,16,4,5,'cream');r(12,15,2,2,'steel');
  r(12,18,2,1,'slate');r(12,20,2,1,'slate');r(9,16,3,2,'skin');px(10,16,'skinLight');
  r(6,9,4,2,'skinDark');r(4,4,8,5,'hair');r(5,5,6,5,'skin');r(5,5,5,2,'skinLight');
  px(6,7,'ink');px(10,7,'ink');px(8,9,'skinDark');
  // Broad dark-green field hat and band; same 16 × 26 foot anchor as the player.
  r(5,1,6,3,'greenDark');r(5,1,5,1,'green');r(4,3,8,2,'greenDark');r(4,3,8,1,'ink');
  r(1,5,14,1,'ink');r(2,4,12,1,'greenDark');r(3,4,9,1,'green');px(8,2,'gold');
});}

function hutSprite(){return raster(128,108,({rect:r,px,line:l,poly:p})=>{
  // A coastal timber rental cottage, with a low teal roof, deck and side wall.
  p([[12,54],[112,54],[124,95],[117,102],[10,102],[4,96]],'#223a463d');
  r(7,82,111,17,'woodDark');r(7,82,111,3,'wood');
  for(let x=10;x<119;x+=8){r(x,85,1,13,'woodMid');r(x+1,85,1,11,'peach');}
  l(8,99,119,99,'ink');r(9,99,108,3,'woodDark');r(12,102,7,4,'woodDark');r(104,102,7,4,'woodDark');
  // West siding is sunlit; the east face has a restrained darker step.
  r(17,34,91,49,'ink');r(18,35,77,47,'jade');r(95,34,13,47,'green');
  for(let y=39;y<82;y+=6){r(18,y,77,1,'green');r(19,y-1,76,1,'mint');r(96,y,11,1,'greenDark');}
  r(18,34,4,47,'ivory');r(91,34,4,48,'ivory');r(106,35,2,47,'greenDark');
  // Shop doorway and divided display window have deep, inhabited interiors.
  r(62,45,26,39,'greenDark');r(63,46,23,37,'cream');r(65,48,19,35,'woodDark');
  r(67,50,15,20,'deep');r(67,50,15,4,'navy');r(68,54,3,14,'blue');r(72,54,8,3,'denim');
  r(68,70,13,10,'wood');r(69,71,11,1,'gold');r(78,72,2,2,'gold');px(79,73,'cream');
  r(62,82,26,2,'woodDark');r(61,84,28,2,'ivory');
  r(27,45,30,26,'greenDark');r(26,44,30,24,'cream');r(28,46,26,19,'navy');
  r(29,47,24,7,'denim');r(29,47,8,4,'blue');l(30,57,36,51,'sky');l(42,57,48,51,'steel');
  r(29,59,24,5,'woodDark');r(31,56,4,8,'rust');r(32,55,2,3,'coral');r(40,60,5,4,'gold');r(46,58,4,6,'green');
  r(40,45,2,21,'cream');r(27,55,29,2,'ivory');r(25,67,32,3,'ivory');r(26,69,31,1,'woodDark');
  // Roof silhouette deliberately stepped, with orderly irregular shingle clusters.
  p([[16,12],[96,12],[116,34],[116,39],[9,39],[9,34]],'ink');
  p([[18,13],[95,13],[112,34],[13,34]],'greenDark');
  p([[20,14],[94,14],[109,32],[14,32]],'green');
  for(let y=15;y<33;y+=4){const inset=Math.max(0,Math.floor((y-15)/3));r(19-inset,y,77+inset*2,1,'jade');for(let x=22+(y%8?0:5);x<99+inset;x+=11){r(x,y+1,1,3,'greenDark');r(x+2,y+2,6,1,((x+y)%3===0)?'jade':'green');}}
  l(19,13,95,13,'mint');l(95,13,112,34,'greenDark');r(11,34,102,3,'ivory');r(11,37,104,3,'woodDark');r(13,35,99,1,'cream');
  // Chimney, copper cap, fishing-line aerial and miniature gull on the ridge.
  r(80,3,11,11,'ink');r(81,4,9,9,'woodDark');r(81,4,5,9,'wood');r(79,2,13,3,'rust');r(80,2,11,1,'coral');
  r(24,4,2,9,'woodDark');r(22,4,6,1,'gold');r(28,3,4,2,'ivory');px(31,2,'ivory');px(32,3,'gold');
  // Physical sign board: fish emblem, no baked-in text.
  r(32,27,53,13,'ink');r(33,27,51,11,'wood');r(34,28,49,9,'cream');r(36,29,45,1,'white');
  p([[47,32],[42,30],[42,35],[47,33]],'greenDark');p([[47,31],[53,30],[59,32],[58,34],[52,35],[47,34]],'green');px(56,32,'ink');
  r(63,31,15,1,'wood');r(63,34,12,1,'wood');
  // Warm exterior lamp, rental-life ring and two stacked bait crates.
  r(92,45,4,2,'woodDark');r(92,46,5,8,'ink');r(93,47,3,5,'gold');px(94,48,'cream');r(92,54,5,1,'woodDark');
  p([[20,54],[25,54],[28,57],[28,63],[25,66],[20,66],[17,63],[17,57]],'cream');r(21,58,4,5,'greenDark');r(19,54,6,2,'coral');r(18,63,3,2,'coral');r(26,57,2,5,'coral');
  r(96,70,17,15,'woodDark');r(97,71,15,12,'wood');r(98,72,13,2,'peach');l(98,76,110,76,'woodDark');l(98,80,110,80,'woodDark');r(99,71,2,12,'gold');r(109,71,2,12,'peach');
  r(99,62,13,8,'woodDark');r(100,63,11,5,'wood');r(101,64,9,1,'peach');r(105,65,3,2,'woodDark');
  // Wooden rail posts and potted dune grass frame the threshold without blocking it.
  for(const x of [8,31,95,117]){r(x,86,3,14,'woodDark');r(x,86,2,12,'ivory');r(x-1,85,5,2,'cream');}
  r(8,89,24,2,'ivory');r(95,89,25,2,'ivory');r(8,94,24,2,'peach');r(95,94,25,2,'peach');
  r(33,79,11,8,'rust');r(32,78,13,3,'coral');r(34,80,3,5,'peach');
  l(37,78,32,70,'greenDark');l(37,78,40,66,'greenDark');l(38,78,44,71,'green');l(37,78,35,66,'jade');l(38,78,40,70,'mint');
});}

function crateSprite(){return raster(22,22,({rect:r,line:l,poly:p,px})=>{
  p([[2,6],[14,2],[21,6],[21,18],[9,21],[2,17]],'ink');p([[3,7],[9,10],[9,20],[3,17]],'woodMid');p([[9,10],[20,7],[20,18],[9,20]],'wood');p([[3,6],[14,3],[20,6],[9,9]],'peach');
  l(4,11,8,12,'woodDark');l(4,15,8,16,'woodDark');l(10,13,19,11,'woodDark');l(10,17,19,15,'woodDark');l(10,10,10,19,'gold');l(18,8,18,18,'gold');l(5,6,15,4,'gold');px(10,11,'steel');px(18,16,'steel');
});}
function coolerSprite(){return raster(24,20,({rect:r,poly:p,px})=>{
  p([[2,5],[17,2],[22,6],[22,16],[6,19],[2,15]],'ink');p([[3,7],[7,9],[7,17],[3,15]],'denim');p([[7,9],[21,7],[21,16],[7,18]],'blue');p([[2,5],[17,2],[23,6],[7,10]],'ivory');p([[4,5],[17,3],[20,6],[7,8]],'white');r(8,11,2,4,'ivory');r(17,9,2,4,'ivory');r(12,12,5,1,'steel');px(9,12,'slate');px(18,10,'slate');r(2,9,2,4,'steel');
});}

function buoySprite(){return raster(16,25,({rect:r,poly:p,line:l,px})=>{
  r(2,22,13,1,'#e9ead666');r(4,23,8,1,'#e9ead633');r(7,1,2,9,'woodDark');p([[9,2],[14,4],[9,6]],'coral');
  p([[6,9],[10,9],[13,17],[12,21],[4,21],[3,17]],'ink');p([[6,10],[10,10],[12,17],[11,20],[5,20],[4,17]],'cream');r(5,14,6,3,'coral');r(6,10,2,4,'white');r(10,17,2,3,'ivory');l(5,21,11,21,'steel');px(8,9,'gold');
});}
function kelpSprite(){return raster(28,36,({rect:r,line:l,poly:p})=>{
  l(14,33,12,26,'greenDark',2);l(12,26,16,18,'greenDark',2);l(16,18,12,8,'greenDark',2);l(12,8,15,2,'greenDark');
  p([[13,25],[5,22],[2,17],[8,18],[14,23]],'greenDark');p([[14,21],[22,18],[25,12],[20,13],[15,18]],'green');
  p([[14,16],[6,13],[4,7],[10,9],[14,13]],'green');p([[13,10],[19,8],[22,3],[17,4]],'jade');
  l(5,18,12,23,'jade');l(17,18,23,14,'jade');l(7,9,12,13,'jade');r(14,2,2,3,'mint');
});}
function rockSprite(){return raster(34,24,({poly:p,line:l,px})=>{
  p([[4,11],[10,5],[19,2],[28,7],[32,16],[29,21],[17,23],[4,20],[1,15]],'ink');
  p([[3,13],[10,6],[19,3],[27,8],[31,16],[24,20],[7,19]],'slate');p([[10,6],[19,3],[26,8],[20,12],[9,11],[4,14]],'steel');p([[4,15],[11,13],[18,14],[24,20],[8,19]],'deep');p([[20,12],[27,9],[30,16],[24,18]],'denim');
  l(11,7,17,5,'light');l(22,9,25,10,'light');px(8,12,'light');px(18,17,'steel');l(4,20,11,21,'water');l(24,22,30,19,'water');
});}
function gullSprite(down=false){return raster(24,14,({line:l,rect:r,px})=>{
  if(down){l(10,6,5,10,'ink',2);l(5,10,1,11,'ink');l(14,6,19,10,'ink',2);l(19,10,22,11,'ink');l(10,6,5,9,'white',2);l(14,6,19,9,'white',2);}
  else {l(10,6,5,3,'ink',2);l(5,3,1,4,'ink');l(14,6,19,3,'ink',2);l(19,3,22,4,'ink');l(10,5,5,2,'white',2);l(14,5,19,2,'white',2);}
  r(10,5,5,4,'ivory');r(11,4,3,4,'white');r(11,8,2,2,'slate');r(13,4,3,2,'white');px(16,5,'gold');px(14,4,'ink');
});}
function palmSprite(){return raster(50,70,({rect:r,line:l,poly:p})=>{
  p([[20,67],[26,67],[30,70],[17,70]],'#223a463f');p([[22,65],[27,65],[29,38],[27,20],[23,20],[25,39]],'woodDark');
  l(23,64,26,40,'wood',2);l(26,39,24,22,'peach',2);for(let y=30;y<63;y+=6)l(24,y,27,y+1,'sand');
  const fronds=[[[25,21],[17,11],[7,9],[1,13],[11,13],[18,16]],[[24,21],[13,18],[3,23],[0,29],[10,24],[20,23]],[[24,21],[18,28],[12,39],[13,46],[18,35],[25,26]],[[25,20],[26,8],[32,1],[39,1],[32,8],[28,21]],[[27,21],[37,13],[47,15],[50,21],[42,18],[32,22]],[[27,22],[39,23],[45,31],[47,39],[39,31],[30,26]]];
  fronds.forEach((f,i)=>p(f,i%2?'greenDark':'green'));
  l(24,20,13,12,'jade');l(13,12,4,12,'mint');l(23,22,10,22,'jade');l(25,22,17,37,'jade');l(27,18,30,9,'jade');l(30,9,35,4,'mint');l(28,21,39,16,'jade');l(39,16,46,19,'mint');l(29,24,40,29,'jade');
  r(23,22,4,4,'wood');r(27,23,4,4,'woodDark');r(24,22,2,2,'gold');
});}

export function createFishSprite(kind){return raster(48,24,({rect:r,px,poly:p,line:l})=>{
  if(kind==='unknown'){
    // Neutral silhouette for unsupported/imported identities, never a species claim.
    p([[8,11],[19,7],[34,7],[45,12],[35,17],[19,17],[8,14],[2,18],[4,12],[2,6]],'slate');
    p([[21,8],[25,3],[30,8]],'slate');px(39,10,'light');
  }else if(kind==='anchovy'||kind==='sardine'){
    const deep=kind==='sardine';p([[5,12],[15,deep?8:10],[34,deep?7:9],[45,11],[45,13],[34,deep?17:15],[15,deep?17:15],[5,13],[1,18],[3,12],[1,6]],'ink');
    p([[7,12],[16,deep?9:11],[34,deep?8:10],[44,11],[44,13],[33,deep?16:14],[15,14],[7,13]],'steel');l(10,12,40,12,'white',2);p([[21,10],[25,5],[28,10]],'slate');r(39,10,3,3,'ivory');px(40,11,'ink');
    if(deep)for(let x=17;x<35;x+=4)px(x,11,'slate');else l(37,13,44,13,'ink');
  }else if(kind==='croaker'){
    // White croaker: silvery/brassy compressed body, blunt snout, subterminal
    // mouth, nearly straight tail and a dark mark at the pectoral-fin base.
    p([[8,10],[18,7],[30,6],[39,8],[44,11],[43,15],[35,17],[19,17],[9,14],[3,17],[3,8]],'ink');
    p([[9,11],[18,8],[30,7],[39,9],[43,11],[42,14],[35,16],[19,16],[9,13],[4,15],[4,10]],'sand');
    p([[12,12],[24,10],[39,10],[42,12],[39,15],[25,16],[15,14]],'ivory');
    p([[17,8],[20,3],[21,6],[23,3],[25,6],[32,4],[35,7]],'woodMid');
    p([[20,16],[24,20],[28,16]],'gold');p([[31,16],[34,20],[36,16]],'sand');
    p([[35,12],[28,13],[29,17]],'gold');r(34,12,2,2,'ink');
    l(12,11,31,9,'woodMid');l(16,13,31,12,'white');l(37,10,36,14,'slate');
    r(39,9,3,3,'white');px(40,10,'ink');l(40,14,42,14,'woodDark');
  }else if(kind==='sanddab'){
    // Small left-eyed flatfish with a mottled eyed side and a rounded tail.
    p([[12,11],[19,5],[29,3],[37,6],[42,11],[40,15],[32,20],[22,21],[13,15],[6,17],[4,15],[4,10],[6,8]],'ink');
    p([[13,11],[19,6],[29,4],[37,7],[41,11],[39,14],[31,19],[22,20],[14,14],[7,16],[5,14],[5,11],[7,9]],'woodMid');
    p([[15,11],[21,7],[30,6],[37,9],[38,13],[30,17],[23,18],[16,14]],'sand');
    l(18,8,26,5,'wood');l(18,17,29,19,'woodDark');l(12,12,31,12,'wood');
    [[19,9],[24,7],[28,14],[22,15],[33,8],[34,14],[17,12],[28,10],[31,16]].forEach(([x,y])=>{r(x,y,2,1,'woodDark');px(x+1,y+1,'wood');});
    r(34,8,3,3,'gold');r(37,11,3,3,'gold');px(35,9,'ink');px(38,12,'ink');l(39,14,40,13,'ink');
  }else if(kind==='halibut'){
    p([[7,11],[14,5],[29,3],[40,8],[44,12],[40,16],[29,21],[14,19],[7,14],[2,17],[1,15],[1,9],[2,7]],'ink');
    p([[8,11],[15,6],[29,4],[39,9],[43,12],[39,15],[29,20],[15,18],[8,13],[3,15],[2,13],[2,10],[3,9]],'woodDark');
    p([[11,11],[18,7],[31,6],[39,10],[40,13],[30,17],[17,17],[10,13]],'wood');
    l(16,7,28,5,'gold');l(18,17,29,18,'woodMid');l(10,12,34,12,'woodMid');
    [[15,9],[19,13],[24,8],[27,15],[32,10],[33,15],[12,13],[24,16]].forEach(([x,y])=>{r(x,y,2,1,'sand');px(x,y+1,'woodDark');});
    r(35,8,3,3,'gold');r(38,11,3,3,'gold');px(36,9,'ink');px(39,12,'ink');l(40,14,42,13,'ink');
  }else if(kind==='mackerel'){
    p([[8,11],[18,7],[32,7],[44,10],[46,12],[41,15],[18,17],[8,14],[1,20],[3,12],[1,4]],'ink');
    p([[7,12],[19,8],[32,8],[43,11],[45,12],[40,14],[18,16],[8,13],[3,17],[5,12],[3,7]],'blue');
    p([[9,12],[21,12],[40,11],[43,12],[36,15],[18,15]],'ivory');
    p([[18,8],[22,3],[27,7]],'denim');p([[10,11],[12,7],[15,10]],'denim');p([[11,15],[13,18],[16,15]],'steel');p([[25,16],[29,20],[32,16]],'steel');
    for(let x=14;x<34;x+=4){px(x,8,'greenDark');l(x,9,x+2,11,'greenDark');}
    l(13,13,35,13,'white');r(38,9,4,4,'cream');r(40,10,2,2,'ink');px(43,13,'woodDark');l(35,10,34,14,'slate');
  }else if(kind==='salmon'){
    // Ocean-phase Chinook: silver flanks, dark back, adipose fin and spots on
    // both tail lobes. Its soft fins differ from a rockfish's dorsal spines.
    p([[8,11],[17,7],[29,6],[39,8],[46,11],[45,14],[39,17],[27,19],[15,17],[8,14],[1,20],[3,12],[1,4]],'ink');
    p([[8,12],[17,8],[29,7],[38,9],[45,11],[44,13],[38,16],[27,18],[16,16],[8,13],[3,17],[5,12],[3,7]],'steel');
    p([[12,12],[22,9],[34,9],[41,11],[44,13],[36,16],[27,17],[16,15]],'light');
    p([[13,13],[26,13],[39,12],[42,13],[35,16],[26,17],[17,15]],'white');
    p([[21,8],[24,2],[29,6],[30,8]],'slate');p([[11,9],[12,6],[15,8]],'slate');
    p([[17,16],[17,20],[23,18]],'steel');p([[29,17],[31,21],[34,17]],'steel');p([[36,12],[28,13],[32,16]],'steel');
    l(14,10,31,8,'denim');l(14,13,34,12,'ivory');l(36,10,35,15,'slate');
    [[14,9],[18,8],[20,10],[24,8],[28,9],[30,7],[33,9],[5,9],[4,8],[4,15],[5,16]].forEach(([x,y])=>px(x,y,'ink'));
    r(39,9,3,3,'ivory');px(40,10,'ink');l(41,14,45,12,'ink');
  }else if(kind==='seabass'){
    // White seabass has an elongated silver body, a large oblique mouth and
    // one long notched dorsal fin, with a shallow fork to the broad tail.
    p([[8,11],[18,7],[31,6],[41,8],[46,11],[46,14],[41,17],[27,18],[16,16],[8,14],[2,18],[3,12],[2,6]],'ink');
    p([[8,12],[18,8],[31,7],[40,9],[45,11],[45,13],[40,16],[27,17],[16,15],[8,13],[4,16],[5,12],[4,8]],'steel');
    p([[13,12],[23,9],[35,9],[44,11],[44,13],[38,15],[27,16],[16,14]],'light');
    p([[15,13],[29,12],[40,12],[42,14],[36,16],[25,16]],'white');
    p([[13,9],[15,5],[26,5],[29,7],[31,3],[33,6],[35,4],[36,7]],'slate');
    l(15,6,25,6,'steel');l(17,7,17,8,'denim');l(20,6,20,8,'denim');l(23,6,23,8,'denim');
    p([[19,16],[19,20],[26,18]],'steel');p([[33,16],[34,20],[38,16]],'steel');p([[37,11],[29,13],[34,15]],'blue');
    l(13,12,35,11,'ivory');l(37,9,36,15,'slate');l(23,17,36,17,'ivory');
    r(40,8,3,3,'gold');px(41,9,'ink');l(41,14,45,11,'ink');l(42,15,45,14,'sand');
  }else if(kind==='bonito'){
    // Streamlined Pacific bonito: crescent fork, narrow tail stalk, finlets,
    // and dark stripes slanting up toward the tail across the blue back.
    p([[8,11],[17,7],[30,5],[39,8],[47,11],[43,14],[31,19],[18,17],[8,14],[1,22],[3,13],[1,2]],'ink');
    p([[8,12],[18,8],[30,6],[39,9],[46,11],[42,13],[31,18],[18,16],[8,13],[3,18],[5,12],[3,6]],'denim');
    p([[12,12],[23,10],[37,10],[44,11],[40,14],[30,17],[20,15]],'light');
    p([[15,13],[28,12],[41,12],[36,15],[29,17],[20,15]],'white');
    p([[18,8],[21,4],[26,2],[29,6]],'navy');p([[17,16],[20,21],[26,18]],'steel');
    p([[36,11],[27,13],[30,16]],'slate');
    for(let x=14;x<32;x+=4)l(x,8-(x>22?1:0),x+4,11-(x>26?1:0),'ink');
    [[9,10],[12,9],[9,14],[12,15]].forEach(([x,y])=>p([[x,y],[x+2,y-1],[x+2,y+1]],'gold'));
    l(13,13,30,13,'ivory');l(37,9,36,14,'slate');r(40,8,3,3,'ivory');px(41,9,'ink');l(42,13,46,11,'ink');
  }else if(kind==='lingcod'){
    p([[8,11],[17,8],[33,7],[42,8],[47,11],[46,15],[37,17],[17,15],[8,14],[2,17],[1,14],[1,10],[2,7]],'ink');
    p([[8,12],[18,9],[33,8],[42,9],[46,11],[45,14],[37,16],[17,14],[8,13],[2,15],[2,9]],'#626f59');
    p([[14,12],[28,10],[39,10],[45,12],[43,14],[34,15],[18,14]],'#9aab83');
    p([[12,9],[15,5],[19,5],[22,7],[25,4],[28,6],[31,3],[33,7]],'#52614e');
    p([[34,13],[27,15],[29,19],[35,17]],'#6d785d');p([[17,14],[19,18],[23,15]],'#626f59');
    [[14,10],[19,9],[23,12],[27,9],[31,11],[34,8],[38,13],[41,15],[18,13]].forEach(([x,y])=>r(x,y,3,2,'#46544d'));
    l(14,12,33,12,'#b9c6a2');r(39,8,3,3,'#c5b475');px(40,9,'ink');l(39,14,46,12,'ink');px(44,13,'cream');px(42,14,'cream');l(36,10,35,15,'#46544d');

  }else{
    const blue=kind==='blue',copper=kind==='copper',red=kind==='vermilion';
    const dark=blue?'#344453':copper?'#695341':red?'#963e37':'#424c50';
    const body=blue?'#71899b':copper?'#b28b60':red?'#d75b48':'#899698';
    const belly=blue?'#c3cdd0':copper?'#e6dfbd':red?'#eb9070':'#c4ccbf';
    const fin=blue?'#586d7c':copper?'#967954':red?'#b8493e':'#69777b';
    p([[9,11],[17,7],[29,6],[38,7],[45,11],[46,13],[41,17],[30,19],[18,17],[9,14],[2,17],[2,8]],'ink');
    p([[9,12],[17,8],[29,7],[38,8],[44,11],[45,13],[40,16],[30,18],[18,16],[9,13],[3,15],[3,10]],dark);
    p([[12,11],[23,8],[34,8],[42,11],[43,14],[35,17],[23,16],[13,14]],body);
    p([[14,14],[25,14],[40,14],[36,17],[26,17],[18,15]],belly);
    // Soft dorsal at the rear (left), spiny front dorsal nearer the head.
    p([[12,10],[14,5],[18,5],[22,8],[25,3],[27,6],[29,2],[31,5],[33,2],[35,5],[37,4],[38,8]],fin);
    l(14,6,19,7,body);l(26,4,27,7,belly);l(30,3,31,6,body);l(34,3,35,6,belly);
    p([[19,16],[20,20],[25,20],[27,17]],fin);p([[33,16],[34,21],[38,17]],fin);
    if(blue){
      // Irregular blue/charcoal blotches, paler belly; no red/orange flank.
      [[15,10,4,2],[21,9,3,3],[27,8,4,2],[31,11,3,2],[20,13,2,2],[27,14,2,1],[35,9,2,2]].forEach(([x,y,w,h])=>r(x,y,w,h,dark));
      l(16,12,21,11,'#9caeb8');l(24,12,29,11,'#9caeb8');
    }else if(copper){
      [[14,10,5,2],[22,8,4,3],[29,9,4,2],[34,8,3,3],[25,14,3,2]].forEach(([x,y,w,h])=>r(x,y,w,h,dark));
      // Pale posterior lateral-line band (toward tail at left) and white belly.
      l(10,12,27,11,'#f0e7c8',2);l(18,16,33,17,'#f2ebd5');r(36,9,3,2,'#d0b98b');
    }else if(red){
      [[16,11],[21,9],[25,8],[18,14],[23,15],[33,16]].forEach(([x,y])=>px(x,y,dark));
      l(15,14,24,16,'#f3ac85');
    }
    p([[35,12],[28,12],[28,16],[32,17]],fin);l(29,13,33,14,belly);
    r(39,9,3,3,blue?'#a9b4b4':copper?'#ceb584':'#d7b998');px(40,10,'ink');
    l(37,11,36,15,dark);l(blue?41:39,14,45,13,'ink');
  }
});}

function iconSprite(kind){return raster(16,16,({rect:r,line:l,poly:p,px,oval:o})=>{
  if(kind==='rod'){
    l(3,13,10,2,'ink',2);l(3,12,10,2,'gold');l(10,2,14,3,'slate');l(14,3,14,11,'light');l(12,11,12,13,'gold');r(4,8,4,4,'ink');r(5,9,2,2,'steel');r(2,12,3,3,'wood');
  }else if(kind==='anchor'){
    o(8,3,2,2,'ink');r(7,2,2,2,'light');r(7,5,2,8,'steel');r(4,6,8,2,'ink');r(4,6,8,1,'light');l(2,9,3,12,'ink',2);l(3,12,8,15,'ink',2);l(8,15,13,12,'ink',2);l(13,12,14,9,'ink',2);l(3,10,4,12,'light');l(4,12,8,14,'steel');l(8,14,12,12,'steel');p([[1,9],[5,9],[2,7]],'light');p([[11,9],[15,9],[14,7]],'light');
  }else if(kind==='engine'){
    r(3,2,10,7,'ink');r(4,2,8,5,'steel');r(4,2,8,2,'light');r(5,5,6,2,'navy');r(7,8,3,5,'slate');r(5,12,7,2,'ink');r(3,13,11,2,'steel');r(1,7,5,2,'ink');r(1,6,3,2,'wood');
  }else if(kind==='backpack'){
    r(5,1,6,3,'ink');r(6,2,4,1,'gold');p([[4,3],[12,3],[14,6],[14,14],[2,14],[2,6]],'ink');r(3,5,10,8,'wood');r(4,4,8,4,'peach');r(5,4,6,1,'gold');r(4,9,8,4,'woodDark');r(5,9,6,2,'coral');r(5,12,6,1,'peach');r(7,6,2,4,'ivory');px(8,8,'woodDark');
  }else if(kind==='coin'){
    p([[5,1],[11,1],[14,4],[14,11],[11,14],[5,14],[2,11],[2,4]],'woodDark');p([[5,2],[10,2],[13,5],[13,10],[10,13],[5,13],[3,10],[3,5]],'gold');l(5,3,10,3,'cream');l(4,4,4,10,'yellow');l(6,12,10,12,'wood');r(7,5,2,6,'wood');r(6,5,4,1,'wood');r(6,10,4,1,'cream');
  }else if(kind==='tackle'){
    r(3,2,10,3,'ink');r(4,3,8,1,'steel');r(1,5,14,9,'ink');r(2,6,12,7,'green');r(2,6,12,3,'jade');r(3,6,10,1,'mint');r(2,10,12,1,'greenDark');r(7,8,2,4,'ivory');px(7,9,'wood');
  }else if(kind==='fish'){
    p([[5,6],[9,3],[13,5],[15,8],[13,11],[8,12],[5,10],[1,13],[2,8],[1,3]],'ink');p([[5,7],[9,4],[13,6],[14,8],[12,10],[8,11],[5,9],[2,11],[3,8],[2,5]],'coral');l(6,8,10,5,'gold');r(11,6,2,2,'cream');px(12,6,'ink');
  }else if(kind==='oar'){
    l(3,13,11,4,'woodDark',3);l(3,13,11,4,'gold');p([[10,4],[11,1],[14,1],[15,3],[12,7]],'wood');l(11,4,13,2,'peach',2);
  }else if(kind==='map'){
    p([[1,3],[5,1],[10,3],[14,1],[14,13],[10,15],[5,13],[1,15]],'ink');p([[2,4],[5,2],[10,4],[13,2],[13,12],[10,14],[5,12],[2,14]],'ivory');l(5,3,5,11,'sand');l(10,5,10,13,'sand');l(3,10,11,6,'jade',2);r(10,5,2,2,'coral');
  }else if(kind==='sun'){
    o(8,8,4,4,'gold');r(6,5,4,1,'cream');[[8,0,8,2],[8,14,8,15],[0,8,2,8],[14,8,15,8],[2,2,3,3],[12,12,13,13],[2,13,3,12],[12,3,13,2]].forEach(a=>l(...a,'gold'));
  }else if(kind==='bait'){
    l(3,11,5,5,'rust',3);l(5,5,9,5,'coral',3);l(9,5,9,10,'coral',3);l(9,10,13,10,'coral',3);l(4,10,5,6,'peach');px(12,9,'peach');
  }else if(kind==='reel'){
    r(7,1,2,14,'wood');r(8,2,1,11,'gold');o(8,8,5,5,'ink');o(8,8,4,4,'steel');o(8,8,2,2,'ivory');r(9,8,5,1,'woodDark');r(12,7,3,3,'wood');
  }
});}

/** All canvases are original art at native pixel resolution. */
export function createPixelSprites(){
  const fish=Object.fromEntries(['unknown','anchovy','sardine','blue','copper','rockfish','vermilion','halibut','mackerel','lingcod','salmon','seabass','bonito','croaker','sanddab'].map(name=>[name,createFishSprite(name)]));
  const icons=Object.fromEntries(['rod','anchor','engine','backpack','fish','coin','tackle','oar','map','sun','bait','reel'].map(name=>[name,iconSprite(name)]));
  const angler=personSprite(),anglerBack=personSprite({back:true});
  const hut=hutSprite();
  return {
    boat:boatSprite(),boatHull:boatSprite({outboard:false}),outboard:outboardSprite(),angler,anglerBack,anglerWalk1:personSprite({step:1}),anglerWalk2:personSprite({step:2}),
    anglerFish:personSprite({fish:true}),anglerHold:personSprite({hold:true}),anglerDrive:personSprite({back:true,drive:true}),
    anglerLeft:personSprite({side:-1}),anglerRight:personSprite({side:1}),
    dockWorker:dockWorkerSprite(),warden:wardenSprite(),hut,tackleShop:hut,
    crate:crateSprite(),cooler:coolerSprite(),buoy:buoySprite(),kelp:kelpSprite(),rock:rockSprite(),
    gull:gullSprite(),gull2:gullSprite(true),palm:palmSprite(),fish,icons,
    directions:{
      south:[angler,personSprite({step:1}),personSprite({step:2})],
      north:[anglerBack,personSprite({back:true,step:1}),personSprite({back:true,step:2})],
      west:[personSprite({side:-1}),personSprite({side:-1,step:1}),personSprite({side:-1,step:2})],
      east:[personSprite({side:1}),personSprite({side:1,step:1}),personSprite({side:1,step:2})],
    },
  };
}
