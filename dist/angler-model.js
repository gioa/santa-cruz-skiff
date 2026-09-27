import * as THREE from './vendor/three.module.js';
import {solveTwoBone} from './arm-ik.js?v=20260927-articulated-v5';
// Authored, metre-scale fisherman: lofted clothing, shaped face, articulated hands.
// Fictional character. No photogrammetry or human identity is implied.
function mergeGeometry(parts){const arrays={position:[],normal:[],uv:[]};for(const src of parts){const g=src.index?src.toNonIndexed():src;for(const key of Object.keys(arrays)){const a=g.getAttribute(key),n=key==='uv'?2:3;for(let i=0;i<g.attributes.position.count;i++)for(let j=0;j<n;j++)arrays[key].push(a?a.array[i*n+j]:0);}if(g!==src)g.dispose();src.dispose();}const g=new THREE.BufferGeometry();for(const[k,a]of Object.entries(arrays))g.setAttribute(k,new THREE.Float32BufferAttribute(a,k==='uv'?2:3));g.computeBoundingSphere();return g;}
export function clothMap(color,seed=7){const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.fillStyle=color;q.fillRect(0,0,256,256);let state=seed;const rnd=()=>((state=(1664525*state+1013904223)>>>0)/4294967296);for(let i=0;i<256;i+=2){q.strokeStyle=i%4===0?'rgba(240,238,225,.065)':'rgba(8,13,17,.10)';q.lineWidth=.5;q.beginPath();q.moveTo(i,0);q.lineTo(i,256);q.stroke();q.beginPath();q.moveTo(0,i);q.lineTo(256,i);q.stroke();}for(let i=0;i<160;i++){q.fillStyle=`rgba(220,207,180,${rnd()*.018})`;q.fillRect(rnd()*256,rnd()*256,8+rnd()*25,1);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=4;return t;}
function skinSurface(){const canvases=Array.from({length:3},()=>{const c=document.createElement('canvas');c.width=c.height=256;return c;}),[a,h,r]=canvases.map(c=>c.getContext('2d'));a.fillStyle='#b18a75';a.fillRect(0,0,256,256);h.fillStyle='#808080';h.fillRect(0,0,256,256);r.fillStyle='#dedede';r.fillRect(0,0,256,256);let seed=293;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<26;i++){const x=rand()*256,y=rand()*256,rad=20+rand()*45,g=a.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,i%2?'rgba(143,89,75,.055)':'rgba(212,170,139,.07)');g.addColorStop(1,'rgba(177,138,117,0)');a.fillStyle=g;a.fillRect(x-rad,y-rad,rad*2,rad*2);}for(let i=0;i<8500;i++){const x=rand()*256,y=rand()*256,v=110+rand()*35;h.fillStyle=`rgb(${v},${v},${v})`;h.fillRect(x,y,.5+rand()*.55,.45+rand()*.55);r.fillStyle=i%3?'#d5d5d5':'#ececec';r.fillRect(x,y,1,1);if(i%7===0){a.fillStyle='rgba(107,73,54,.04)';a.fillRect(x,y,.7,.7);}}const maps=canvases.map((c,i)=>{const t=new THREE.CanvasTexture(c);if(!i)t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;});return{map:maps[0],bumpMap:maps[1],bumpScale:.00032,roughnessMap:maps[2],roughness:.68};}
const mats={};function materials(){if(mats.skin)return mats;Object.assign(mats,{shirt:new THREE.MeshStandardMaterial({map:clothMap('#52626a'),roughness:.98}),pants:new THREE.MeshStandardMaterial({map:clothMap('#555957',23),roughness:1}),seam:new THREE.MeshStandardMaterial({color:'#343d40',roughness:1}),skin:new THREE.MeshStandardMaterial(skinSurface()),nail:new THREE.MeshStandardMaterial({color:'#bd9581',roughness:.50}),shadow:new THREE.MeshStandardMaterial({color:'#76614e',roughness:.94}),lips:new THREE.MeshStandardMaterial({color:'#926f5d',roughness:.95}),boot:new THREE.MeshStandardMaterial({color:'#3b403b',roughness:.85}),sole:new THREE.MeshStandardMaterial({color:'#212a29',roughness:.96}),cap:new THREE.MeshStandardMaterial({map:clothMap('#555b50',18),roughness:.97}),vest:new THREE.MeshStandardMaterial({map:clothMap('#aa602f',54),roughness:.88}),strap:new THREE.MeshStandardMaterial({color:'#323d3c',roughness:.99}),silver:new THREE.MeshStandardMaterial({color:'#bac3b8',roughness:.45,metalness:.65}),glass:new THREE.MeshStandardMaterial({color:'#293936',roughness:.3,metalness:.16})});return mats;}
function batch(parent,parts){for(const[k,gs]of Object.entries(parts)){if(!gs.length)continue;const mesh=new THREE.Mesh(mergeGeometry(gs),materials()[k]);mesh.name='Tailored angler '+k;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);}}
function tube(points,r=.003,n=24,rs=5){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),n,r,rs,false);}
function ball(p,s,n=16,m=10){return new THREE.SphereGeometry(1,n,m).scale(...s).translate(...p);}
function roundedBox(w,h,d,r){const g=new THREE.BoxGeometry(w,h,d,3,3,3),p=g.attributes.position,q=new THREE.Vector3(),v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.set(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));v.sub(q).normalize().multiplyScalar(r).add(q);p.setXYZ(i,...v.toArray());}g.computeVertexNormals();return g;}
// A continuous cross-section surface, unlike intersecting sphere limbs. Front is -Z.
function bodyLoft(rings,n=24,{fold=0,face=false}={}){const p=[],uv=[],ii=[];rings.forEach(([x,y,z,w,d],j)=>{for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);let f=1+fold*Math.sin(a*5+j*1.8)*Math.sin(j*Math.PI/(rings.length-1));let xx=x+w*c*f,zz=z+d*s*f;if(face&&s<-.45){const central=Math.exp(-Math.pow(c/.20,2)),nose=Math.exp(-Math.pow((y-1.245)/.029,2))*.027;zz-=central*nose;zz-=Math.exp(-Math.pow((Math.abs(c)-.42)/.25,2))*Math.exp(-Math.pow((y-1.242)/.037,2))*.007;}p.push(xx,y,zz);uv.push(i/n,j/(rings.length-1));}});for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ii.push(a,b,a+1,a+1,b,b+1);}for(let i=1;i<n-1;i++){ii.push(0,i,i+1);const o=(rings.length-1)*(n+1);ii.push(o,o+i+1,o+i);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ii);g.computeVertexNormals();return g;}
// Limb is constructed along an anatomical centreline; width/depth follow each station.
function limb(points,radii,n=18,fold=.025){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),steps=(points.length-1)*6,frames=path.computeFrenetFrames(steps,false),p=[],uv=[],ii=[];for(let j=0;j<=steps;j++){const t=j/steps,at=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(at)),f=at-k,w=THREE.MathUtils.lerp(radii[k][0],radii[k+1][0],f),d=THREE.MathUtils.lerp(radii[k][1],radii[k+1][1],f),center=path.getPointAt(t);for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=1+fold*Math.sin(a*4+j*1.5)*Math.sin(t*Math.PI),v=center.clone().addScaledVector(frames.normals[j],Math.cos(a)*w*r).addScaledVector(frames.binormals[j],Math.sin(a)*d*r);p.push(...v.toArray());uv.push(i/n,t*2);}}for(let j=0;j<steps;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ii.push(a,a+1,b,a+1,b+1,b);}for(let i=1;i<n-1;i++){ii.push(0,i+1,i);const o=steps*(n+1);ii.push(o,o+i,o+i+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ii);g.computeVertexNormals();return g;}
// A grip is a frame around a cylindrical handle: +Y follows the handle, +Z
// points into the palm. The wrist is on -X for the left hand, +X for the right.
// Both the close-up and external camera render these same articulated hands.
function createClosedHand(side){
 const group=new THREE.Group();group.name=(side<0?'Left':'Right')+' anatomical closed grip';
 const p={skin:[],shadow:[],nail:[]};
 const wrist=new THREE.Vector3(side*.101,-.007,.028);
 p.skin.push(bodyLoft([[side*.046,-.047,.026,.027,.019],[side*.047,-.028,.027,.029,.020],[side*.047,.014,.028,.031,.019],[side*.042,.043,.027,.026,.017]],20));
 p.skin.push(limb([[side*.101,-.007,.028],[side*.079,-.004,.028],[side*.058,-.003,.027]],[[.028,.020],[.027,.020],[.033,.022]],16,0));
 const openParts={skin:p.skin.map(g=>g.clone()),shadow:[],nail:[]};
 // Four curved fingers encircle the handle. Their clearance is fitted to the
 // actual target radius below instead of forcing every handle into one fist.
 // knuckle, middle and distal phalanges each taper; nails face outwards.
 for(let i=0;i<4;i++){
  const y=(i-1.5)*.020,short=(i===0||i===3)?.90:1;
  const points=[[side*.038,y,.032],[side*.012,y,.032*short],[side*-.019,y,.021],[side*-.025,y,-.002],[side*-.012,y,-.021],[side*.005,y,-.023]];
  p.skin.push(limb(points,[[.010,.010],[.010,.010],[.010,.0095],[.009,.009],[.008,.008],[.0068,.007]],12,0));
  p.skin.push(ball([side*.035,y,.036],[.013,.011,.012],12,8));
  for(const index of[2,3]){const v=points[index];p.shadow.push(tube([[v[0],y-.006,v[2]-.006],[v[0]+side*.002,y,v[2]-.0065],[v[0],y+.006,v[2]-.006]],.00055,5,3));}
  p.nail.push(ball([side*.002,y,-.029],[.007,.0055,.0009],12,8));
  const length=(i===0||i===3)?.063:.077;
  const openPoints=[[side*.031,y,.028],[side*(.031-length*.40),y*1.03,.020],[side*(.031-length*.76),y*1.07,.012],[side*(.031-length),y*1.1,.007]];
  openParts.skin.push(limb(openPoints,[[.010,.010],[.009,.009],[.0078,.0077],[.0065,.0065]],12,0));
  openParts.nail.push(ball([side*(.039-length),y*1.1,.013],[.0065,.005,.0008],12,8));
 }
 // Thumb crosses the index finger and closes the opposition gap.
 p.skin.push(limb([[side*.071,-.034,.023],[side*.047,-.049,.015],[side*.021,-.049,-.006],[side*.002,-.038,-.024]],[[.016,.013],[.014,.012],[.011,.011],[.0085,.008]],14,0));
 p.nail.push(ball([side*.004,-.038,-.031],[.007,.0065,.001],12,8));
 openParts.skin.push(limb([[side*.071,-.034,.023],[side*.057,-.053,.009],[side*.038,-.065,.002],[side*.018,-.068,-.005]],[[.016,.013],[.014,.011],[.011,.009],[.008,.007]],14,0));
 openParts.nail.push(ball([side*.020,-.068,.002],[.0065,.005,.0008],12,8));
 const closed=new THREE.Group(),open=new THREE.Group();group.add(closed,open);batch(closed,p);batch(open,openParts);open.visible=false;
 const gripSocket=new THREE.Object3D();gripSocket.name='Measured grip contact center';group.add(gripSocket);
 const deform=[];let innerRadius=Infinity,currentRadius=null;
 closed.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,original=p.array.slice();deform.push({geometry:o.geometry,original});for(let i=0;i<p.count;i++)innerRadius=Math.min(innerRadius,Math.hypot(p.getX(i),p.getZ(i)));});
 const setGripRadius=radius=>{
  radius=THREE.MathUtils.clamp(radius||.017,.008,.038);if(radius===currentRadius)return;currentRadius=radius;
  // Open finger joints radially around the handle; fade to zero before the
  // wrist so arm length, contact frame, cuff and wrist never change scale.
  const expand=radius+.0015-innerRadius;
  for(const{geometry,original}of deform){const p=geometry.attributes.position;for(let i=0;i<p.count;i++){
   const x=original[i*3],y=original[i*3+1],z=original[i*3+2],r=Math.hypot(x,z),t=THREE.MathUtils.clamp((r-.038)/.057,0,1),weight=1-t*t*(3-2*t),scale=(r+expand*weight)/(r||1);
   p.setXYZ(i,x*scale,y,z*scale);
  }p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();}
  group.userData.gripRadius=radius;
 };
 group.userData={gripSocket,wristOffset:wrist,closed,open,setGripRadius};setGripRadius(.017);return group;
}
function createSleeve(length,upper){
 const g=new THREE.Group(),p={shirt:[],seam:[]};
 p.shirt.push(limb([[0,0,0],[0,length*.18,0],[0,length*.51,0],[0,length*.84,0],[0,length,0]],upper?[[.074,.070],[.076,.073],[.073,.066],[.062,.058],[.060,.057]]:[[.061,.058],[.061,.055],[.052,.048],[.039,.034],[.035,.029]],20,.037));
 p.seam.push(tube([[.003,0,.071],[.003,length*.30,.068],[.003,length*.62,upper?.064:.044],[.003,length,upper?.057:.028]],.0015,18,4));
 if(!upper){for(let i=0;i<4;i++)p.seam.push(new THREE.TorusGeometry(.034, .001,4,18).rotateX(Math.PI/2).scale(1,1,.86).translate(0,length-.016-i*.003,0));}
 batch(g,p);return g;
}
function pointSegment(group,a,b,nominalLength){
 group.position.copy(a);const direction=b.clone().sub(a),length=direction.length();
 group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
 group.scale.set(1,length/nominalLength,1);
}
export function createSeatedAngler(){
 const group=new THREE.Group();group.name='Articulated fisherman with connected working hands';
 const body=new THREE.Group();body.name='Fisherman torso and pelvis';group.add(body);
 const p={shirt:[],pants:[],seam:[],skin:[],shadow:[],lips:[],boot:[],sole:[],cap:[],glass:[]};
 p.pants.push(bodyLoft([[0,.43,-.24,.135,.11],[0,.48,-.25,.18,.135],[0,.54,-.24,.17,.12],[0,.59,-.23,.148,.107]],24,{fold:.025}));
 p.shirt.push(bodyLoft([[0,.51,-.24,.157,.116],[0,.55,-.25,.167,.121],[0,.58,-.25,.163,.117],[0,.65,-.255,.164,.114],[0,.73,-.26,.181,.119],[0,.84,-.27,.204,.115],[0,.94,-.28,.225,.12],[0,1.007,-.275,.206,.107],[0,1.03,-.26,.166,.092]],28,{fold:.025}));
 p.skin.push(bodyLoft([[0,1.00,-.258,.055,.052],[0,1.084,-.251,.054,.052],[0,1.132,-.25,.053,.054]],20));
 p.seam.push(tube([[0,.55,-.373],[0,.71,-.38],[0,.91,-.397],[0,1.019,-.348]],.0024,24,4));
 for(const side of[-1,1]){
  p.shirt.push(roundedBox(.079,.09,.013,.006).rotateZ(side*.30).translate(side*.05,1.012,-.34));
  p.seam.push(tube([[side*.042,.81,-.382],[side*.11,.807,-.370],[side*.122,.89,-.372],[side*.05,.902,-.389]],.0015,12,4));
  p.seam.push(tube([[side*.015,.581,-.360],[side*.015,.70,-.381],[side*.015,.89,-.385]],.001,20,3));
 }
 batch(body,p);
 const head=new THREE.Group();head.name='Independently turning shaped head and cap';head.position.set(0,1.084,-.25);body.add(head);
 const hp={skin:[],shadow:[],lips:[],cap:[],seam:[],glass:[],nail:[]};
 hp.skin.push(bodyLoft([[0,1.094,-.260,.034,.042],[0,1.108,-.270,.055,.057],[0,1.145,-.260,.070,.067],[0,1.199,-.247,.078,.078],[0,1.246,-.241,.081,.080],[0,1.291,-.235,.078,.076],[0,1.335,-.229,.065,.064],[0,1.356,-.225,.033,.034]],40,{face:true}));
 for(const side of[-1,1]){
  hp.skin.push(ball([side*.080,1.219,-.228],[.015,.029,.018],20,14));
  hp.shadow.push(ball([side*.088,1.22,-.24],[.005,.015,.006],12,8));
  hp.skin.push(tube([[side*.086,1.201,-.241],[side*.092,1.216,-.247],[side*.089,1.238,-.238],[side*.081,1.241,-.231]],.003,14,5));
  hp.shadow.push(tube([[side*.013,1.252,-.319],[side*.035,1.257,-.32],[side*.054,1.251,-.310]],.0024,12,5));
  hp.nail.push(ball([side*.032,1.238,-.321],[.012,.004,.0019],16,8));
  hp.glass.push(ball([side*.032,1.238,-.323],[.0035,.0036,.0008],12,8));
  hp.skin.push(tube([[side*.018,1.237,-.322],[side*.032,1.242,-.323],[side*.048,1.238,-.315]],.0018,10,4));
  hp.shadow.push(tube([[side*.018,1.236,-.322],[side*.032,1.234,-.322],[side*.048,1.237,-.315]],.00065,10,4));
  hp.skin.push(ball([side*.009,1.205,-.338],[.010,.006,.008],16,8));
  hp.shadow.push(ball([side*.009,1.202,-.341],[.004,.0016,.002],10,6));
  hp.shadow.push(tube([[side*.021,1.184,-.330],[side*.029,1.170,-.326],[side*.033,1.153,-.321]],.00055,10,3));
 }
 hp.lips.push(tube([[-.024,1.154,-.323],[-.010,1.154,-.33],[0,1.153,-.332],[.012,1.154,-.33],[.024,1.155,-.323]],.0022,16,5));
 hp.shadow.push(tube([[-.020,1.153,-.325],[0,1.153,-.334],[.020,1.155,-.325]],.00065,12,3));
 hp.cap.push(bodyLoft([[0,1.283,-.235,.083,.079],[0,1.316,-.23,.083,.08],[0,1.345,-.227,.067,.066],[0,1.369,-.223,.039,.035],[0,1.374,-.223,.009,.009]],32));
 hp.cap.push(ball([0,1.287,-.314],[.091,.009,.10],28,10));
 hp.seam.push(tube([[-.074,1.30,-.254],[0,1.374,-.23],[.074,1.30,-.254]],.0012,24,4));
 hp.seam.push(tube([[0,1.291,-.412],[-.053,1.29,-.387],[-.077,1.288,-.34]],.0012,24,4));
 hp.seam.push(tube([[0,1.290,-.317],[0,1.370,-.23],[0,1.290,-.152]],.001,24,4));
 for(const gs of Object.values(hp))for(const g of gs)g.translate(0,-1.084,.25);batch(head,hp);
 const eyeSocket=new THREE.Object3D();eyeSocket.name='Eyes between brows';eyeSocket.position.set(0,.154,-.078);head.add(eyeSocket);
 const vest=new THREE.Group();vest.name='Worn foam personal flotation device';const vp={vest:[],strap:[],silver:[]};
 for(const side of[-1,1]){vp.vest.push(bodyLoft([[side*.105,.645,-.36,.073,.039],[side*.11,.68,-.37,.083,.044],[side*.118,.80,-.388,.091,.041],[side*.112,.929,-.37,.086,.047],[side*.108,.978,-.346,.064,.038]],22,{fold:.01}));vp.strap.push(tube([[side*.11,.95,-.37],[side*.137,1.021,-.30],[side*.13,1.016,-.198],[side*.133,.95,-.16]],.013,18,5));}
 vp.vest.push(bodyLoft([[0,.662,-.148,.167,.033],[0,.76,-.134,.186,.038],[0,.894,-.143,.200,.035],[0,.961,-.177,.169,.032]],24));
 for(const y of[.705,.845]){vp.strap.push(tube([[-.195,y,-.36],[-.106,y,-.417],[0,y,-.431],[.109,y,-.418],[.198,y,-.36]],.013,24,5));vp.strap.push(roundedBox(.043,.037,.014,.004).translate(0,y,-.445));vp.silver.push(new THREE.BoxGeometry(.02,.014,.003).translate(0,y,-.454));}batch(vest,vp);body.add(vest);
 // Legs bend from the same pelvis in seated and standing poses. Boots remain
 // on the floor instead of translating upward with the torso when standing.
 const legs=[];
 for(const side of[-1,1]){
  const thigh=new THREE.Group(),shin=new THREE.Group(),shoe=new THREE.Group();group.add(thigh,shin,shoe);
  const tp={pants:[limb([[0,0,0],[0,.17,0],[0,.36,0],[0,.44,0]],[[.099,.098],[.102,.089],[.088,.085],[.083,.082]],20,.03)],seam:[tube([[.10,0,0],[.10,.15,0],[.088,.35,0],[.083,.44,0]],.002,18,4)]};batch(thigh,tp);
  const sp={pants:[limb([[0,0,0],[0,.085,0],[0,.19,0],[0,.29,0]],[[.083,.082],[.081,.073],[.070,.063],[.062,.057]],20,.037)],seam:[tube([[.083,0,0],[.076,.12,0],[.062,.29,0]],.002,16,4)]};batch(shin,sp);
  const bp={boot:[roundedBox(.144,.134,.292,.037).translate(0,.12,-.052),bodyLoft([[0,.14,.016,.061,.062],[0,.22,.019,.066,.065],[0,.233,.019,.069,.068]],20)],sole:[roundedBox(.152,.026,.302,.007).translate(0,.057,-.054)]};
  for(let i=0;i<5;i++)bp.sole.push(new THREE.BoxGeometry(.134,.011,.013).translate(0,.044,-.175+i*.048));batch(shoe,bp);legs.push({side,thigh,shin,shoe});
 }
 const hands={},arms={};
 for(const[side,name]of[[-1,'left'],[1,'right']]){
  const upper=createSleeve(.30,true),lower=createSleeve(.27,false),hand=createClosedHand(side);
  const elbow=new THREE.Mesh(new THREE.SphereGeometry(1,20,14).scale(.061,.057,.057),materials().shirt);elbow.name=name+' elbow cloth fold';elbow.castShadow=true;elbow.receiveShadow=true;
  group.add(upper,lower,elbow,hand);hands[name]=hand;arms[name]={side,upper,lower,elbow,hand};
 }
 let standingBlend=0;
 const inverse=new THREE.Matrix4(),worldPosition=new THREE.Vector3(),worldQuaternion=new THREE.Quaternion(),groupQuaternion=new THREE.Quaternion();
 const pose=({time=0,dt=1/60,leftGrip=null,rightGrip=null,standing=false,lookYaw=0,headPitch=0,firstPerson=false}={})=>{
  const blend=1-Math.exp(-Math.max(0,dt)*12);standingBlend=THREE.MathUtils.lerp(standingBlend,standing?1:0,blend);
  if(Math.abs(standingBlend-(standing?1:0))<.0001)standingBlend=standing?1:0;
  const lift=standingBlend*.395,breath=Math.sin(time*.95)*.0015;body.position.y=lift+breath;
  head.rotation.set(THREE.MathUtils.clamp(headPitch,-.45,.45),THREE.MathUtils.clamp(lookYaw,-.8,.8),0,'YXZ');head.visible=!firstPerson;
  for(const {side,thigh,shin,shoe}of legs){
   const hip=new THREE.Vector3(side*.105,.50+lift,-.26),knee=new THREE.Vector3(side*THREE.MathUtils.lerp(.168,.13,standingBlend),.445+standingBlend*.013,THREE.MathUtils.lerp(-.72,-.29,standingBlend)),ankle=new THREE.Vector3(side*THREE.MathUtils.lerp(.158,.13,standingBlend),.20,THREE.MathUtils.lerp(-.71,-.22,standingBlend));
   pointSegment(thigh,hip,knee,.44);pointSegment(shin,knee,ankle,.29);shoe.position.set(ankle.x,0,ankle.z);
  }
  group.updateWorldMatrix(true,true);inverse.copy(group.matrixWorld).invert();group.getWorldQuaternion(groupQuaternion).invert();
  const gripError={left:0,right:0};
  for(const[name,arm]of Object.entries(arms)){
   const {side,upper,lower,elbow,hand}=arm,target=name==='left'?leftGrip:rightGrip,shoulder=new THREE.Vector3(side*.199,.965+lift+breath,-.275);
   let contact,orientation;
   if(target){target.updateWorldMatrix(true,false);target.getWorldPosition(worldPosition);target.getWorldQuaternion(worldQuaternion);contact=worldPosition.clone().applyMatrix4(inverse);orientation=groupQuaternion.clone().multiply(worldQuaternion);}
   else{contact=new THREE.Vector3(side*.18,THREE.MathUtils.lerp(.585,.78,standingBlend),THREE.MathUtils.lerp(-.58,-.26,standingBlend));orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(standingBlend*-.8,side*-.35,side*-.28));}
   const offset=hand.userData.wristOffset.clone().applyQuaternion(orientation),wrist=contact.clone().add(offset);
   const pole=new THREE.Vector3(side*.48,.66+lift,-.17),solution=solveTwoBone(shoulder.toArray(),wrist.toArray(),pole.toArray(),.30,.27);
   const actualWrist=new THREE.Vector3(...solution.wrist),elbowPosition=new THREE.Vector3(...solution.elbow);
   pointSegment(upper,shoulder,elbowPosition,.30);pointSegment(lower,elbowPosition,actualWrist,.27);elbow.position.copy(elbowPosition);
   hand.position.copy(actualWrist).sub(offset);hand.quaternion.copy(orientation);hand.userData.closed.visible=!!target;hand.userData.open.visible=!target;if(target)hand.userData.setGripRadius(target.userData.gripRadius||.017);
   gripError[name]=target?solution.reachError:0;hand.userData.reachError=gripError[name];hand.userData.target=target?.name||null;
  }
  group.userData.gripError=gripError;group.userData.seated=standingBlend<.5;group.userData.height=1.374+lift;group.userData.standingBlend=standingBlend;
  group.updateWorldMatrix(false,true);
 };
 group.userData={lifeVest:vest,hands,arms,body,head,eyeSocket,seated:true,height:1.374,pose,update:()=>{},gripError:{left:0,right:0}};pose();return group;
}
