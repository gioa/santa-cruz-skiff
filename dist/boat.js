import {siteUrl} from './data-url.js';
import * as THREE from './vendor/three.module.js';

// Authored clinker construction and scale joinery. Dimensions in metres; -Z is bow.
// Painted wood weathering is authored; grain normals / bare wood reuse local Poly Haven CC0 maps.
function timberSurface(base,seed=47,painted=false){
 const maps=Array.from({length:3},()=>{const c=document.createElement('canvas');c.width=1024;c.height=256;return c;});
 const [q,h,rough]=maps.map(c=>c.getContext('2d'));let k=seed;const rand=()=>((k=(k*1664525+1013904223)>>>0)/4294967296);
 q.fillStyle=base;q.fillRect(0,0,1024,256);h.fillStyle='#858585';h.fillRect(0,0,1024,256);rough.fillStyle=painted?'#e8e8e8':'#f3f3f3';rough.fillRect(0,0,1024,256);
 for(let i=0;i<620;i++){
  const y=rand()*256,w=.2+rand()*1.2,phase=rand()*6.283,period=45+rand()*190,amplitude=.5+rand()*2.4;
  const light=rand()>.55,alpha=painted?.012+rand()*.033:.04+rand()*.12;
  for(const [ctx,col]of [[q,`rgba(${light?'252,229,180':'40,28,13'},${alpha})`],[h,`rgba(${light?'220,220,220':'45,45,45'},.23)`],[rough,`rgba(50,50,50,${painted?.05:.10})`]]){
   ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();for(let x=0;x<=1024;x+=16){const py=y+Math.sin(x/period+phase)*amplitude+Math.sin(x/57+phase)*.25;if(x===0)ctx.moveTo(x,py);else ctx.lineTo(x,py);}ctx.stroke();
  }
 }
 // Long fine scratches and small areas of exposed timber, rather than noisy speckles.
 // Edge abrasion follows plank grain; salt bleaching and dirt collect at the lap.
 if(painted){
  for(let i=0;i<95;i++){const x=rand()*1024,edge=rand()>.5,yy=edge?249-rand()*12:rand()*10,len=5+rand()*58;const g=q.createLinearGradient(0,0,0,256);g.addColorStop(0,'rgba(24,28,19,.18)');g.addColorStop(.1,'rgba(255,255,255,0)');g.addColorStop(.90,'rgba(220,212,171,0)');g.addColorStop(1,'rgba(219,200,161,.12)');if(i===0){q.fillStyle=g;q.fillRect(0,0,1024,256);}q.fillStyle=`rgba(153,132,94,${.10+rand()*.23})`;q.beginPath();q.moveTo(x,yy);q.lineTo(x+len,yy+rand()*2);q.lineTo(x+len*.7,yy+2+rand()*3);q.lineTo(x+rand()*6,yy+1+rand()*3);q.closePath();q.fill();h.fillStyle='#505050';h.fillRect(x,yy,len,.7);rough.fillStyle='#ffffff';rough.fillRect(x,yy,len,3);}
  for(let i=0;i<22;i++){const x=rand()*1024,y=rand()*256;const r=q.createRadialGradient(x,y,0,x,y,35+rand()*70);r.addColorStop(0,'rgba(230,225,196,.10)');r.addColorStop(1,'rgba(230,225,196,0)');q.fillStyle=r;q.fillRect(x-100,y-100,200,200);}
 }
 for(let i=0;i<(painted?125:115);i++){
  const x=rand()*1024,y=rand()*256,len=4+rand()*68,th=.25+rand()*.7;
  q.fillStyle=painted?`rgba(187,161,107,${.10+rand()*.14})`:`rgba(52,36,17,${.08+rand()*.13})`;q.fillRect(x,y,len,th);
  h.fillStyle='#565656';h.fillRect(x,y,len,th);rough.fillStyle='#ffffff';rough.fillRect(x,y,len,th);
 }
 if(!painted)for(let i=0;i<6;i++){
  const x=rand()*1024,y=rand()*256;for(let j=0;j<5;j++){q.strokeStyle=`rgba(55,34,14,${.12-j*.017})`;q.lineWidth=.5;q.beginPath();q.ellipse(x,y,11+j*8,1.6+j*.8,-.035,0,Math.PI*2);q.stroke();}
 }
 const ts=maps.map((c,i)=>{const t=new THREE.CanvasTexture(c);if(i===0)t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;});
 return {map:ts[0],bumpMap:ts[1],roughnessMap:ts[2],bumpScale:painted?.0018:.002,roughness:painted?.81:.90};
}
function profile(z){const u=THREE.MathUtils.clamp((z+2.6)/4.8,0,1);return {w:Math.max(.012,.95*Math.pow(Math.sin(Math.min(1,u/.5)*Math.PI/2),.72)*(1-.135*u*u*u)),s:.735+.18*Math.pow(1-u,5)+.045*u*u,b:-.29+.55*Math.pow(1-u,6)+.075*Math.pow(u,4)};}
function pt(z,t,side=1,inset=0,lap=0){const h=profile(z);return new THREE.Vector3(side*Math.max(0,h.w*Math.sin(t*Math.PI/2)-inset+lap),h.b+(h.s-h.b)*Math.pow(t,1.7)+inset*.5,z);}
function strip(t0,t1,inner=false,lap=0){const p=[],uv=[],ids=[],N=56,M=3;for(const s of [-1,1]){let start=p.length/3;for(let i=0;i<=N;i++){const z=-2.6+4.8*i/N;for(let j=0;j<=M;j++){const v=pt(z,t0+(t1-t0)*j/M,s,inner?.027:0,inner?0:lap*(1-j/M));p.push(v.x,v.y,v.z);uv.push(i/N*1.5,j/M);}}for(let i=0;i<N;i++)for(let j=0;j<M;j++){let a=start+i*(M+1)+j,b=a+M+1;if((s===1)!==inner)ids.push(a,a+1,b,a+1,b+1,b);else ids.push(a,b,a+1,a+1,b,b+1);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return g;}
function merged(gs){const p=[],n=[],u=[];for(const original of gs){const g=original.index?original.toNonIndexed():original;for(const [key,target,size]of [['position',p,3],['normal',n,3],['uv',u,2]]){const a=g.getAttribute(key);if(a){for(const v of a.array)target.push(v);}else for(let i=0;i<g.getAttribute('position').count*size;i++)target.push(0);}if(g!==original)g.dispose();original.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));g.computeBoundingSphere();return g;}
const tube=(ps,r=.02,n=60,rs=6)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps,false,'centripetal'),n,r,rs,false);
const boxg=(x,y,z,px=0,py=0,pz=0)=>new THREE.BoxGeometry(x,y,z).translate(px,py,pz);

// Extruded rounded rectangles make small highlights on edges without a heavy subdivision mesh.
function bevelBox(w,h,d,r=Math.min(w,h,d)*.14){
 r=Math.min(r,w*.24,h*.24,d*.24);const x=w/2-r,y=h/2-r,c=Math.min(r,x*.45,y*.45),sh=new THREE.Shape();
 sh.moveTo(-x+c,-y);sh.lineTo(x-c,-y);sh.quadraticCurveTo(x,-y,x,-y+c);sh.lineTo(x,y-c);sh.quadraticCurveTo(x,y,x-c,y);sh.lineTo(-x+c,y);sh.quadraticCurveTo(-x,y,-x,y-c);sh.lineTo(-x,-y+c);sh.quadraticCurveTo(-x,-y,-x+c,-y);
 const g=new THREE.ExtrudeGeometry(sh,{depth:d-2*r,steps:1,curveSegments:3,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2});g.translate(0,0,-d/2+r);g.computeVertexNormals();return g;
}
function timberUV(g,axis='x',length=1,width=.15){const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++){uv.setXY(i,(axis==='x'?p.getX(i):p.getZ(i))/length+.5,(axis==='x'?p.getZ(i):p.getX(i))/width+.5);}return g;}
function cowlingGeometry(){
 const rings=[[.135,.154,.175],[.155,.186,.211],[.20,.201,.230],[.37,.196,.239],[.46,.181,.224],[.515,.151,.19],[.545,.09,.125],[.552,.003,.003]],p=[],uv=[],ids=[],n=36;
 rings.forEach(([y,w,d],j)=>{for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a);p.push(Math.sign(cs)*Math.pow(Math.abs(cs),.52)*w,y,.18+Math.sign(sn)*Math.pow(Math.abs(sn),.52)*d);uv.push(i/n,j/(rings.length-1));}});
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ids.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return g;
}

export function createSkiff(){
 const boat=new THREE.Group();boat.name='Santa Cruz red wooden fishing skiff';
 const material=(color,roughness=.85,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const wood=new THREE.MeshStandardMaterial(timberSurface('#a98153',47));
 const red=new THREE.MeshStandardMaterial(timberSurface('#a84035',71,true));
 const green=new THREE.MeshStandardMaterial({...timberSurface('#3c6352',33,true),side:THREE.DoubleSide});
 // Cropped texture coordinates select one actual plank, avoiding false seams across each board.
 if(typeof Image!=='undefined'){const loader=new THREE.TextureLoader();const map=(path,srgb=false)=>{const t=loader.load(siteUrl('./assets/'+path).href);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,.057);t.offset.y=.36;t.anisotropy=8;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;};const grain=map('env-wood-normal.jpg'),rough=map('env-wood-roughness.jpg');for(const m of[red,green,wood]){m.normalMap=grain;m.normalScale=new THREE.Vector2(.10,.10);m.roughnessMap=rough;}wood.map=map('env-wood-color.jpg',true);wood.color.set('#fff4dc');wood.normalScale.set(.18,.18);wood.roughness=.85;}
 const dark=material('#392f25'),metal=material('#8d9895',.37,.8),gray=material('#788991',.32,.58),black=material('#172026',.65),rope=material('#b9ab81',1),seam=material('#702b20');
 const mesh=(g,m,name,parent=boat)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(x,y,z,p,m,name,parent=boat)=>mesh(boxg(x,y,z,...p),m,name,parent);
 const rounded=(x,y,z,p,m,name,parent=boat,r)=>mesh(bevelBox(x,y,z,r).translate(...p),m,name,parent);
 const levels=[0,.18,.31,.43,.55,.67,.79,.9,1],inside=[],seams=[];
 for(let i=0;i<8;i++){const strake=red.clone();strake.color.setScalar([.57,.70,.82,.92,1.02,.98,1.07,1][i]);const g=strip(levels[i],levels[i+1],false,i?.012:0);for(let u=0;u<g.attributes.uv.count;u++)g.attributes.uv.setX(u,g.attributes.uv.getX(u)+i*.193);mesh(g,strake,`red clinker strake ${i+1}`);inside.push(strip(levels[i],levels[i+1],true));if(i)for(const s of [-1,1])seams.push(tube(Array.from({length:49},(_,j)=>pt(-2.57+4.77*j/48,levels[i],s,-.002)),.005,48,4));}
 mesh(merged(inside),green,'open green wooden hull interior');mesh(merged(seams),seam,'overlapping plank seams');
 const rails=[],ribs=[],bolts=[];
 for(const s of [-1,1]){const ps=Array.from({length:65},(_,j)=>pt(-2.6+4.8*j/64,1,s));rails.push(tube(ps,.043,80,8));rails.push(tube(ps.map(p=>new THREE.Vector3(p.x-s*.045,p.y-.066,p.z)),.023,80,6));}
 mesh(merged(rails),green,'rounded dark green gunwales');
 for(const z of [-2.1,-1.72,-1.32,-.9,-.46,0,.46,.9,1.32,1.72,2.05]){const ps=Array.from({length:33},(_,j)=>{const a=(j/32-.5)*2;return pt(z,Math.abs(a)*.985,Math.sign(a)||1,.047);});ribs.push(tube(ps,.025,40,6));for(const s of [-1,1]){const p=pt(z,.92,s,.064);bolts.push(new THREE.SphereGeometry(.009,6,4).scale(.45,1,1).translate(p.x,p.y,p.z));}}
 mesh(merged(ribs),green,'eleven individually shaped oak ribs');
 const shape=new THREE.Shape();for(let j=0;j<=24;j++){const a=(j/24-.5)*2,p=pt(2.2,Math.abs(a),Math.sign(a)||1);if(!j)shape.moveTo(p.x,p.y);else shape.lineTo(p.x,p.y);}shape.closePath();
 const tg=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false});tg.translate(0,0,2.155);mesh(tg,red,'solid timber transom');box(1.59,.09,.09,[0,.78,2.18],green,'transom top rail');box(.58,.37,.06,[0,.56,2.215],wood,'outboard reinforcement pad');
 const floor=[];for(let i=-4;i<=4;i++){let x=i*.133,a=-1.94+Math.pow(Math.abs(x)/.6,2)*.45,b=1.9;floor.push(timberUV(boxg(.123,.045,b-a,x,.075,(a+b)/2),'z',b-a,.123));}mesh(merged(floor),green,'nine spaced wooden floorboards');
 const seats=[],frames=[];for(const [z,w]of [[-1.07,1.46],[.60,1.64],[1.45,1.56]]){for(const dz of [-.133,0,.133])seats.push(timberUV(bevelBox(w,.05,.124,.009),'x',w,.124).translate(0,.46,z+dz));for(const s of [-1,1]){frames.push(boxg(.07,.38,.32,s*(w/2-.08),.27,z));frames.push(boxg(.10,.07,.43,s*(w/2-.09),.405,z));for(const dz of [-.13,.13])bolts.push(new THREE.CylinderGeometry(.009,.005,.004,10).translate(s*(w/2-.085),.488,z+dz));}}
 mesh(merged(seats),wood,'three worn timber thwarts including aft helm seat');mesh(merged(frames),green,'bench brackets');
 const hook=new THREE.Shape();hook.moveTo(0,-2.57);hook.lineTo(.36,-2.18);hook.quadraticCurveTo(0,-2.31,-.36,-2.18);hook.closePath();const hg=new THREE.ExtrudeGeometry(hook,{depth:.045,bevelEnabled:false});hg.rotateX(Math.PI/2);hg.translate(0,.875,0);mesh(hg,green,'small bow breasthook');
 for(const [x,y,z]of [[0,.915,-2.36],[-.67,.815,1.84],[.67,.815,1.84]]){bolts.push(boxg(.1,.013,.055,x,y,z));bolts.push(new THREE.CylinderGeometry(.015,.022,.055,8).translate(x,y+.029,z));bolts.push(new THREE.CylinderGeometry(.012,.017,.18,8).rotateZ(Math.PI/2).translate(x,y+.062,z));}
 for(const s of [-1,1]){const p=pt(-.18,1,s);bolts.push(new THREE.CylinderGeometry(.021,.028,.095,8).translate(p.x,p.y+.017,p.z));bolts.push(new THREE.TorusGeometry(.052,.009,6,15,Math.PI*1.45).rotateY(Math.PI/2).translate(p.x,p.y+.115,p.z));const ps=[],zs=[-1.95,-1.48,-.90,-.32,.28,.89,1.47,1.98];zs.forEach((z,i)=>{let q=pt(z,.94,s,-.05);ps.push(q);bolts.push(new THREE.TorusGeometry(.025,.006,5,10).rotateY(Math.PI/2).translate(q.x,q.y,q.z));if(i<zs.length-1){q=pt((z+zs[i+1])/2,.91,s,-.07);q.y-=.075;ps.push(q);}});mesh(tube(ps,.013,90,6),rope,'looped safety grab line');}
 mesh(merged(bolts),metal,'cleats bolts eyes and rowing oarlocks');
 const coil=Array.from({length:151},(_,i)=>{let t=i/150,r=.125+.047*t;return new THREE.Vector3(Math.cos(t*Math.PI*8)*r,.13+.005*t,-1.73+Math.sin(t*Math.PI*8)*r);});mesh(tube(coil,.01,180,5),rope,'coiled bow painter');mesh(tube([new THREE.Vector3(0,.958,-2.35),new THREE.Vector3(.1,.86,-2.27),new THREE.Vector3(.14,.42,-2.03),new THREE.Vector3(.14,.13,-1.75)],.01,30,5),rope,'bow painter lead');
 const motor=new THREE.Group();motor.name='Yamaha gray 8hp outboard';motor.position.set(0,.62,2.27);boat.add(motor);
 mesh(cowlingGeometry(),gray,'sculpted rounded Yamaha cowling',motor);
 rounded(.366,.065,.424,[0,.144,.18],black,'rubber cowling separation gasket',motor,.016);
 rounded(.17,.14,.30,[0,.066,.16],gray,'outboard swivel head',motor,.026);
 rounded(.107,1.04,.143,[0,-.474,.175],gray,'tapered shaft housing',motor,.021);
 rounded(.30,.022,.235,[0,-.86,.195],gray,'bevelled anti ventilation plate',motor,.005);
 mesh(new THREE.SphereGeometry(1,16,10).scale(.064,.061,.17).translate(0,-.98,.23),gray,'streamlined lower gearcase',motor);
 const fin=new THREE.Shape();fin.moveTo(-.58,.07);fin.lineTo(-.84,.22);fin.quadraticCurveTo(-.85,.29,-.78,.30);fin.lineTo(-.59,.33);fin.closePath();const fg=new THREE.ExtrudeGeometry(fin,{depth:.015,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1});fg.rotateY(Math.PI/2);fg.rotateX(Math.PI/2);fg.translate(-.0075,-.36,0);mesh(fg,gray,'swept protective skeg',motor);
 // Cowling vents, latch and recessed starter socket have independent dark cavities.
 const ventParts=[];for(const x of [-1,1])for(let i=0;i<4;i++)ventParts.push(bevelBox(.006,.018,.068,.002).translate(x*.201,.253+i*.027,.198));mesh(merged(ventParts),black,'engine cooling intake louvers',motor);
 rounded(.048,.046,.015,[0,.15,.408],black,'rear cowling release latch',motor,.006);
 rounded(.080,.05,.018,[0,.258,-.049],black,'recoil starter recess',motor,.006);
 rounded(.053,.022,.028,[0,.258,-.066],black,'starter pull handle',motor,.005);
 // At the design waterline the ventilation plate is 24 cm submerged, level
 // with the transom keel. A 23 cm diameter small-outboard propeller remains fully
 // immersed, including its upper blade, instead of rotating above the surface.
 const propeller=new THREE.Group();propeller.name='propeller';propeller.position.set(0,-.98,.425);motor.add(propeller);mesh(new THREE.CylinderGeometry(.026,.035,.085,12).rotateX(Math.PI/2),metal,'propeller hub',propeller);const blades=[];for(let i=0;i<3;i++){const b=new THREE.SphereGeometry(1,12,8).scale(.038,.059,.008).translate(0,.055,0);b.rotateY(.42);b.rotateZ(i*Math.PI*2/3);blades.push(b);}mesh(merged(blades),metal,'three swept propeller blades',propeller);
 // The clamp bracket belongs to the hull: turning the engine must never rotate it
 // through the timber transom. Only the swivel head, shaft and tiller steer together.
 const motorMount=new THREE.Group();motorMount.name='fixed transom clamp and tilt bracket';motorMount.position.copy(motor.position);boat.add(motorMount);
 const clampCastings=[],clampSteel=[],clampRubber=[];
 for(const x of[-.145,.145]){
  clampCastings.push(bevelBox(.052,.213,.055,.008).translate(x,.082,-.015));
  clampCastings.push(bevelBox(.058,.041,.212,.008).translate(x,.192,-.092));
  clampCastings.push(bevelBox(.050,.182,.034,.006).translate(x,.111,-.185));
  // Threaded clamp screw, circular pressure pad and folding cross handle.
  clampSteel.push(new THREE.CylinderGeometry(.007,.007,.097,10).rotateX(Math.PI/2).translate(x,.047,-.189));
  clampSteel.push(new THREE.CylinderGeometry(.025,.025,.012,12).rotateX(Math.PI/2).translate(x,.047,-.137));
  clampSteel.push(new THREE.CylinderGeometry(.006,.006,.083,8).rotateZ(Math.PI/2).translate(x,.047,-.239));
  for(let i=0;i<10;i++)clampSteel.push(new THREE.TorusGeometry(.008,.0014,3,8).translate(x,.047,-.17-i*.005));
  clampRubber.push(new THREE.CylinderGeometry(.024,.024,.004,12).rotateX(Math.PI/2).translate(x,.047,-.130));
  clampSteel.push(new THREE.CylinderGeometry(.018,.018,.068,10).rotateZ(Math.PI/2).translate(x,.125,.030));
 }
 clampCastings.push(bevelBox(.24,.041,.07,.010).translate(0,-.01,.023));
 clampSteel.push(new THREE.CylinderGeometry(.017,.017,.35,12).rotateZ(Math.PI/2).translate(0,.122,.034));
 mesh(merged(clampCastings),gray,'cast alloy transom clamp brackets and tilt cradle',motorMount);
 mesh(merged(clampSteel),metal,'threaded clamp screws pressure pads handles and tilt pin',motorMount);
 mesh(merged(clampRubber),black,'rubber transom protection pads',motorMount);
 // Compact F8-style folding tiller, with a separate twist throttle and contact socket.
 // Socket +Y follows the grip toward the bow; +Z points toward the palm above it.
 const tillerPivot=new THREE.Group();tillerPivot.name='folding tiller pivot';tillerPivot.position.set(-.12,.20,.025);motor.add(tillerPivot);
 mesh(new THREE.CylinderGeometry(.047,.047,.115,14).rotateZ(Math.PI/2),gray,'tiller hinge boss',tillerPivot);
 mesh(new THREE.CylinderGeometry(.018,.018,.126,6).rotateZ(Math.PI/2),metal,'hex tiller hinge pivot bolt',tillerPivot);
 rounded(.062,.053,.411,[0,0,-.225],black,'tapered folding tiller arm',tillerPivot,.012);
 rounded(.034,.009,.257,[0,.029,-.193],gray,'tiller upper inset',tillerPivot,.003);
 mesh(new THREE.CylinderGeometry(.033,.033,.034,14).rotateX(Math.PI/2).translate(0,0,-.405),black,'throttle friction collar',tillerPivot);
 const tillerThrottle=new THREE.Group();tillerThrottle.name='working twist throttle grip';tillerThrottle.position.set(0,0,-.505);tillerThrottle.rotation.x=-Math.PI/2;tillerPivot.add(tillerThrottle);
 mesh(new THREE.CylinderGeometry(.027,.028,.184,20),black,'molded rubber throttle grip',tillerThrottle);
 const gripRibs=[];for(let i=0;i<15;i++)gripRibs.push(new THREE.TorusGeometry(.028,.0019,4,20).rotateX(Math.PI/2).translate(0,-.081+i*.0115,0));
 gripRibs.push(new THREE.CylinderGeometry(.030,.030,.013,20).translate(0,.098,0));
 mesh(merged(gripRibs),material('#242b2d',.91),'rubber grip ribs and palm stop',tillerThrottle);
 rounded(.008,.047,.0028,[0,-.038,.028],material('#bdc1ba',.7),'raised throttle index stripe',tillerThrottle,.0006);
 const tillerGripSocket=new THREE.Object3D();tillerGripSocket.name='right hand throttle contact';tillerGripSocket.userData.gripRadius=.028;tillerThrottle.add(tillerGripSocket);
 const safetyRed=material('#ab4437',.7),stopButton=material('#d76c54',.58);
 mesh(new THREE.CylinderGeometry(.015,.018,.014,12).rotateZ(Math.PI/2).translate(-.043,.001,-.335),stopButton,'engine stop button',tillerPivot);
 mesh(new THREE.TorusGeometry(.016,.004,5,12).rotateY(Math.PI/2).translate(-.052,.001,-.335),safetyRed,'emergency stop clip',tillerPivot);
 // A coiled lanyard is stowed beside the stop switch. The rig can extend it to the PFD.
 const tether=[];for(let i=0;i<=80;i++){const t=i/80,a=t*Math.PI*16;tether.push(new THREE.Vector3(-.059-Math.sin(a)*.010,-.015-t*.14,-.335+Math.cos(a)*.010));}
 mesh(tube(tether,.0025,80,4),safetyRed,'coiled safety cutout lanyard',tillerPivot);
 mesh(new THREE.TorusGeometry(.018,.003,5,12).translate(-.059,-.163,-.325),metal,'lanyard attachment ring',tillerPivot);
 // Side shift linkage has a visible pivot, stem and hand knob rather than a floating block.
 mesh(new THREE.CylinderGeometry(.028,.028,.027,12).rotateZ(Math.PI/2).translate(.121,.084,-.042),black,'gear selector pivot',motor);
 mesh(tube([new THREE.Vector3(.138,.084,-.042),new THREE.Vector3(.183,.138,-.046),new THREE.Vector3(.183,.17,-.042)],.008,12,6),metal,'gear selector stem',motor);
 rounded(.042,.035,.051,[.183,.177,-.042],black,'gear selector rubber knob',motor,.009);
 const c=document.createElement('canvas');c.width=512;c.height=256;const cx=c.getContext('2d');cx.clearRect(0,0,512,256);cx.fillStyle='#213440';cx.fillRect(16,27,480,159);cx.fillStyle='#c7d3d7';cx.fillRect(16,27,480,6);cx.fillStyle='#f6f6f1';cx.textAlign='center';cx.font='bold 61px Arial';cx.fillText('YAMAHA',256,104);cx.font='bold 65px Arial';cx.fillText('8',256,175);let tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const label=new THREE.MeshStandardMaterial({map:tex,transparent:true,roughness:.4,metalness:.2,depthWrite:false});
 mesh(new THREE.PlaneGeometry(.278,.139).translate(0,.359,.4205),label,'Yamaha aft cowling badge',motor);
 for(const side of [-1,1]){const badge=mesh(new THREE.PlaneGeometry(.255,.13),label,'Yamaha side cowling badge',motor);badge.rotation.y=side*Math.PI/2;badge.position.set(side*.199,.383,.162);}
 const nc=document.createElement('canvas');nc.width=256;nc.height=256;const nq=nc.getContext('2d');nq.clearRect(0,0,256,256);nq.fillStyle='#171d18';nq.font='bold 174px Georgia';nq.textAlign='center';nq.fillText('17',128,191);tex=new THREE.CanvasTexture(nc);tex.colorSpace=THREE.SRGBColorSpace;mesh(new THREE.PlaneGeometry(.29,.29).translate(-.44,.47,2.203),new THREE.MeshStandardMaterial({map:tex,roughness:.9,transparent:true,depthWrite:false}),'black hull number');
 const rodHolder=new THREE.Group();rodHolder.position.set(.71,.61,1.54);rodHolder.rotation.z=-.22;boat.add(rodHolder);mesh(new THREE.CylinderGeometry(.042,.034,.25,12,1,true),black,'open tubular rod holder',rodHolder);mesh(new THREE.TorusGeometry(.042,.006,6,14).rotateX(Math.PI/2).translate(0,.125,0),metal,'rod holder rim',rodHolder);box(.075,.1,.035,[0,-.04,-.025],metal,'rod holder bracket',rodHolder);rounded(.123,.028,.078,[.063,-.04,-.025],metal,'rod holder cross brace to hull',rodHolder,.005);rounded(.018,.12,.10,[.127,0,-.025],metal,'rod holder hull backing plate',rodHolder,.004);for(const y of[-.041,.041])mesh(new THREE.CylinderGeometry(.008,.008,.025,6).rotateZ(Math.PI/2).translate(.13,y,-.025),metal,'rod holder mounting bolt',rodHolder);const rodStowSocket=new THREE.Object3D();rodStowSocket.name='rod butt inside the fixed holder';rodHolder.add(rodStowSocket);
 const gear=new THREE.Group();gear.name='optional fishing gear';boat.add(gear);const cooler=new THREE.Group();cooler.position.set(0,.11,-1.65);gear.add(cooler);const cream=material('#dddccd'),mint=material('#aec5bd');rounded(.54,.30,.34,[0,.15,0],mint,'rounded molded cooler body',cooler,.022);rounded(.548,.012,.344,[0,.299,0],black,'cooler lid dark seal',cooler,.003);rounded(.566,.054,.36,[0,.328,0],cream,'bevelled cooler lid',cooler,.012);rounded(.49,.006,.283,[0,.357,0],cream,'raised cooler lid inset',cooler,.001);for(const x of [-.272,.272]){rounded(.018,.086,.141,[x,.20,0],black,'cooler handle recess',cooler,.004);mesh(tube([new THREE.Vector3(x,.223,-.065),new THREE.Vector3(x*1.1,.174,-.055),new THREE.Vector3(x*1.1,.174,.055),new THREE.Vector3(x,.223,.065)],.012,14,6),cream,'folding cooler carry handle',cooler);}for(const x of [-.17,.17]){rounded(.035,.07,.014,[x,.265,.178],black,'cooler flexible latch',cooler,.003);rounded(.046,.02,.02,[x,.294,.18],cream,'cooler latch catch',cooler,.004);}for(const x of [-.255,.255])for(const z of [-.13,.13])rounded(.028,.22,.018,[x,.142,z],mint,'cooler molded corner rib',cooler,.004);
 const bucket=new THREE.Group();bucket.position.set(-.36,.105,1.49);gear.add(bucket);const bm=material('#c4b79d');bm.side=THREE.DoubleSide;mesh(new THREE.CylinderGeometry(.16,.12,.31,20,1,true).translate(0,.155,0),bm,'open bait bucket',bucket);mesh(new THREE.CylinderGeometry(.12,.12,.018,20).translate(0,.01,0),bm,'bucket bottom',bucket);mesh(new THREE.TorusGeometry(.16,.012,6,22).rotateX(Math.PI/2).translate(0,.31,0),bm,'bucket rolled rim',bucket);mesh(tube(Array.from({length:24},(_,i)=>new THREE.Vector3(Math.cos(Math.PI*i/23)*.168,.25+Math.sin(Math.PI*i/23)*.17,0)),.006,24,5),metal,'wire bucket bail',bucket);
 rounded(.24,.15,.31,[.36,.17,1.49],red,'rounded portable fuel tank',gear,.025);mesh(tube([new THREE.Vector3(.30,.247,1.49),new THREE.Vector3(.31,.275,1.49),new THREE.Vector3(.41,.275,1.49),new THREE.Vector3(.42,.247,1.49)],.012,16,6),black,'fuel tank carry handle',gear);mesh(new THREE.CylinderGeometry(.031,.033,.017,12).translate(.36,.252,1.39),black,'fuel filler cap',gear);mesh(tube([new THREE.Vector3(.14,.66,2.43),new THREE.Vector3(.37,.44,2.1),new THREE.Vector3(.40,.15,1.82),new THREE.Vector3(.36,.15,1.49)],.013,28,6),black,'fuel hose');

 const boardingLadder=new THREE.Group();boardingLadder.name='port aft stainless boarding ladder';boat.add(boardingLadder);const ladderRails=[];
 for(const z of [1.22,1.62])ladderRails.push(tube([new THREE.Vector3(-.78,.64,z),new THREE.Vector3(-.84,.81,z),new THREE.Vector3(-1.025,.79,z),new THREE.Vector3(-1.075,.56,z),new THREE.Vector3(-1.075,-.75,z)],.018,28,8));
 mesh(merged(ladderRails),metal,'curved boarding ladder rails',boardingLadder);
 for(const y of [.48,.13,-.22,-.57]){rounded(.075,.026,.36,[-1.075,y,1.42],metal,'ladder step',boardingLadder,.007);rounded(.078,.01,.285,[-1.075,y+.018,1.42],black,'nonslip ladder tread',boardingLadder,.002);}
 // Working rental equipment at human scale, with believable attachment points.
 const pale=material('#b8b5a2',.88),rubber=material('#687574',.93),orangeLine=material('#837651',.97);
 const fenderBodies=[],fenderRibs=[],fenderLines=[];
 for(const side of[-1,1])for(const z of[-.72,1.03]){const q=pt(z,1,side);const x=q.x+side*.095,y=q.y-.315;
  fenderBodies.push(new THREE.CapsuleGeometry(.067,.26,4,12).translate(x,y,z));
  for(const dy of[-.18,.18])fenderRibs.push(new THREE.TorusGeometry(.025,.008,5,12).rotateY(Math.PI/2).translate(x,y+dy,z));
  for(let j=0;j<8;j++){const a=j*Math.PI/4;fenderRibs.push(new THREE.CylinderGeometry(.0025,.0025,.24,4).translate(x+Math.cos(a)*.068,y,z+Math.sin(a)*.068));}
  fenderLines.push(tube([new THREE.Vector3(q.x-side*.018,q.y+.015,z-.05),new THREE.Vector3(q.x+side*.035,q.y+.009,z),new THREE.Vector3(x,y+.21,z)],.006,14,5));
 }
 mesh(merged(fenderBodies),pale,'four scuffed cylindrical mooring fenders');mesh(merged(fenderRibs),rubber,'fender valves reinforcing eyes and longitudinal ribs');mesh(merged(fenderLines),rope,'fender clove hitch suspension cords');
 // Oars are retained as realistic backup equipment alongside the outboard.
 const oars=[],oarCollars=[];
 for(const side of[-1,1]){const x=side*.56,y=.175;
  oars.push(new THREE.CylinderGeometry(.018,.026,1.55,12).rotateX(Math.PI/2).translate(x,y,.22));
  oars.push(new THREE.CylinderGeometry(.022,.022,.19,12).rotateX(Math.PI/2).translate(x,y,1.08));
  const paddle=new THREE.Shape();paddle.moveTo(-.024,.12);paddle.lineTo(-.069,-.12);paddle.quadraticCurveTo(-.076,-.33,-.063,-.40);paddle.quadraticCurveTo(0,-.45,.063,-.40);paddle.quadraticCurveTo(.076,-.33,.069,-.12);paddle.lineTo(.024,.12);paddle.closePath();const blade=new THREE.ExtrudeGeometry(paddle,{depth:.014,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,curveSegments:5});blade.rotateX(Math.PI/2);blade.translate(x,y,-.63);oars.push(blade);
  oarCollars.push(new THREE.CylinderGeometry(.03,.03,.18,12).rotateX(Math.PI/2).translate(x,y,.09));
 }
 mesh(merged(oars),wood,'pair of stowed shaped ash rowing oars');mesh(merged(oarCollars),rubber,'leather oar sleeves');
 const fasteners=[];for(const z of[-1.08,.60])for(const side of[-1,1]){fasteners.push(tube([new THREE.Vector3(side*.50,.145,z),new THREE.Vector3(side*.56,.225,z),new THREE.Vector3(side*.62,.145,z)],.012,10,5));}mesh(merged(fasteners),orangeLine,'oar retention lashings');
 // A landing net has actual open mesh, so the water remains visible through it.
 const net=new THREE.Group();net.name='stowed landing net';net.position.set(.39,.20,-.40);net.rotation.set(.12,0,-.16);gear.add(net);
 const netFrame=[],netMesh=[];const oval=Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2;return new THREE.Vector3(Math.cos(a)*.19,0,Math.sin(a)*.275-.48);});netFrame.push(tube(oval,.007,48,5));netFrame.push(new THREE.CylinderGeometry(.012,.014,.86,10).rotateX(Math.PI/2).translate(0,0,.19));mesh(merged(netFrame),metal,'landing net aluminium hoop and handle',net);
 for(let i=-5;i<=5;i++){const x=i*.032,span=.275*Math.sqrt(Math.max(0,1-x*x/(.19*.19)));netMesh.push(tube([new THREE.Vector3(x,0,-.48-span),new THREE.Vector3(x*.70,-.085,-.48),new THREE.Vector3(x,0,-.48+span)],.0016,12,3));}
 for(let i=-7;i<=7;i++){const z=i*.034,span=.19*Math.sqrt(Math.max(0,1-z*z/(.275*.275)));netMesh.push(tube([new THREE.Vector3(-span,0,z-.48),new THREE.Vector3(0,-.085,z*.70-.48),new THREE.Vector3(span,0,z-.48)],.0016,12,3));}mesh(merged(netMesh),black,'open knotted landing net mesh',net);
 rounded(.046,.036,.23,[0,0,.54],rubber,'net hand grip',net,.012);
 // Bait board, drain plug and proper transom knees convey how the hull was assembled.
 const knees=[];for(const side of[-1,1]){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(.25,0);sh.lineTo(.0,.25);sh.closePath();const kg=new THREE.ExtrudeGeometry(sh,{depth:.045,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1});kg.rotateY(side*Math.PI/2);kg.translate(side*.59,.22,1.94);knees.push(kg);}mesh(merged(knees),green,'triangular transom timber knees');
 mesh(new THREE.TorusGeometry(.025,.004,5,12).translate(0,-.09,2.205),metal,'transom drain plug ferrule');mesh(new THREE.CylinderGeometry(.019,.019,.025,10).rotateX(Math.PI/2).translate(0,-.09,2.217),black,'tethered drain plug');
 rounded(.29,.019,.19,[-.43,.501,.60],pale,'scored removable bait cutting board',gear,.004);
 const scoring=[];for(let i=0;i<9;i++)scoring.push(boxg(.11+(i%3)*.03,.0008,.0009,-.44+(i%3)*.02,.512,.537+i*.014));mesh(merged(scoring),rubber,'knife cuts on bait board',gear);
 // A very soft baked contact layer keeps the floor/seat junctions readable in
 // skylight at 06:00, including mobile devices without expensive shadow maps.
 // It only darkens the small areas physically occluded by thwarts and equipment.
 const aoCanvas=document.createElement('canvas');aoCanvas.width=128;aoCanvas.height=128;const aq=aoCanvas.getContext('2d');
 const aoGradient=aq.createRadialGradient(64,64,3,64,64,62);aoGradient.addColorStop(0,'rgba(255,255,255,.24)');aoGradient.addColorStop(.48,'rgba(255,255,255,.18)');aoGradient.addColorStop(1,'rgba(255,255,255,0)');aq.fillStyle=aoGradient;aq.fillRect(0,0,128,128);
 const aoTexture=new THREE.CanvasTexture(aoCanvas),aoParts=[];
 for(const [x,y,z,w,d]of[[0,.100,-1.07,1.40,.84],[0,.100,.60,1.47,.84],[0,.100,1.45,1.40,.84],[0,.101,-1.65,.73,.51],[-.36,.102,1.49,.44,.43],[.36,.103,1.49,.39,.44],[-.35,.487,1.45,.53,.35]])aoParts.push(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2).translate(x,y,z));
 const contactShade=new THREE.Mesh(merged(aoParts),new THREE.MeshBasicMaterial({color:'#15231c',map:aoTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));contactShade.name='soft baked bench equipment and seated body contact shade';contactShade.renderOrder=1;boat.add(contactShade);
 // Merge static components sharing a material, preserving articulated / equipment groups.
 // This keeps the many modeled fixtures inexpensive on mobile GPUs.
 function batchStatic(parent){const batches=new Map();for(const o of [...parent.children])if(o.isMesh&&o!==contactShade&&!Array.isArray(o.material)){const key=o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);}for(const list of batches.values()){if(list.length<2)continue;const names=[],gs=[];for(const o of list){o.updateMatrix();gs.push(o.geometry.clone().applyMatrix4(o.matrix));names.push(o.name);parent.remove(o);o.geometry.dispose();}const combined=mesh(merged(gs),list[0].material,names.join(' / '),parent);combined.userData.components=names;}}
 for(const parent of[boat,motor,motorMount,tillerPivot,tillerThrottle,gear,cooler,bucket,rodHolder,boardingLadder,net])batchStatic(parent);
 boat.userData={boardingLadder,motor,motorMount,tillerPivot,tillerThrottle,tillerGripSocket,setThrottle:value=>{tillerThrottle.rotation.y=-THREE.MathUtils.clamp(value,0,1)*.78;},helmSeatPosition:new THREE.Vector3(-.35,.055,1.72),propeller,gear,cooler,bucket,net,rodHolder,rodStowSocket,dimensions:{length:4.8,beam:1.9,waterline:0,floor:.0975},bowDirection:new THREE.Vector3(0,0,-1),helmPosition:new THREE.Vector3(0,1.57,1.42),cockpitPosition:new THREE.Vector3(0,1.57,-.1)};
 return boat;
}
