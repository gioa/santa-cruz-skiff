import * as THREE from './vendor/three.module.js';
import { HARBOR_SHAPES } from './harbor-shapes.js?v=20260927-articulated-v4';
import {clothMap} from './angler-model.js?v=20260927-articulated-v4';
// Authored metric geometry. Blender export crashed locally; runtime mesh construction is Three.js.
// These assets are generic dock equipment and a fictional worker, not replicas of real staff.
const COLORS={galvanized:0x81928e,paint:0x36745e,edges:0x454f51,ochre:0xc49a50,bolt:0xb9c1bf,black:0x252e30,cable:0x495659,concrete:0x8f9387,rust:0x815038,orange:0xbc784e,orangeShade:0x84513a,navy:0x465c6e,navyLight:0x596e7e,skin:0xc1977d,skinShade:0xa77d67,lip:0x9b7768,eye:0xd2cec3,pupil:0x463d2b,cap:0xa39f82,boot:0x626f5f,reflect:0xd5d5ad};
const ORIGINS={davitBase:[0,0,0],davitSlew:[0,.64,0],hook:[0,0,0],workerBody:[0,0,0],workerHead:[0,1.545,0],workerArmL:[-.205,1.435,0],workerArmR:[.205,1.435,0]};
const geoCache=new Map();let materials;
function mats(){if(materials)return materials;materials={};for(const [k,v]of Object.entries(COLORS)){const metal=['galvanized','edges','bolt','cable'].includes(k);materials[k]=new THREE.MeshStandardMaterial({color:v,roughness:metal?.44:k.includes('skin')?.85:['navy','navyLight','cap'].includes(k)?.98:.82,metalness:metal?.7:k==='paint'?.2:0});}for(const k of ['navy','navyLight','cap','orange','orangeShade']){materials[k].map=clothMap('#eeeeea',k.length*7);materials[k].roughness=['orange','orangeShade'].includes(k)?.79:.98;}return materials;}
function roundedBox(w,h,d,r){r=Math.max(.0001,Math.min(r,w*.4,h*.4,d*.4));const g=new THREE.BoxGeometry(w,h,d,3,3,3),p=g.attributes.position,n=g.attributes.normal,s=[w,h,d];const v=new THREE.Vector3(),q=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);for(let k=0;k<3;k++){const a=v.getComponent(k);if(Math.abs(a)<s[k]*.49)v.setComponent(k,Math.sign(a)*(s[k]/2-r));}q.set(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));v.sub(q).normalize();n.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(r).add(q);p.setXYZ(i,v.x,v.y,v.z);}return g;}
function merged(gs){const p=[],n=[],uv=[];for(const src of gs){const g=src.index?src.toNonIndexed():src;const a=g.attributes.position,b=g.attributes.normal,t=g.attributes.uv;for(let i=0;i<a.count;i++){p.push(a.getX(i),a.getY(i),a.getZ(i));n.push(b.getX(i),b.getY(i),b.getZ(i));uv.push(t?t.getX(i):a.getX(i)*3,t?t.getY(i):a.getY(i)*3);}if(g!==src)g.dispose();src.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingSphere();return g;}
function loft(input,N,kind=''){const textile=['navy','orange'].includes(kind),rings=[];for(let j=0;j<input.length-1;j++)for(let k=0;k<(textile?3:1);k++){const t=k/(textile?3:1);rings.push(input[j].map((v,i)=>THREE.MathUtils.lerp(v,input[j+1][i],t)));}rings.push(input.at(-1));const p=[],idx=[],uv=[];for(let j=0;j<rings.length;j++){const[x,y,z,rx,rz]=rings[j];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,w=textile?1+Math.sin(a*4+j*1.7)*Math.sin(j*Math.PI/(rings.length-1))*(kind==='orange'?.024:.04):1;p.push(x+rx*Math.cos(a)*w,y,z+rz*Math.sin(a)*w);uv.push(i/N,y*1.3);}}for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+N+1;idx.push(a,b,a+1,a+1,b,b+1);}for(let i=1;i<N-1;i++){idx.push(0,i,i+1);const o=(rings.length-1)*(N+1);idx.push(o,o+i+1,o+i);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function geometry(c,reach){const a=c.args,type=c.type,part=a[0];const map=p=>new THREE.Vector3(part==='davitSlew'&&p[0]>.5?.5+(p[0]-.5)*(reach-.5)/3.2:p[0],p[1],p[2]);let g,center=null;
 if(type==='box'){g=roundedBox(...a[3],a[5]);center=map(a[2]);}
 else if(type==='ball'){g=new THREE.SphereGeometry(1,a[5],a[6]);g.scale(...a[3]);center=map(a[2]);}
 else if(type==='rod'||type==='beam'){const p=map(a[2]),q=map(a[3]),delta=q.clone().sub(p),length=delta.length();g=type==='rod'?new THREE.CylinderGeometry(a[5]??a[4],a[4],length,a[7],1):roundedBox(a[4],length,a[5],.012);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...p.add(q).multiplyScalar(.5).toArray());}
 else if(type==='curve'){const ps=a[2].map(map),path=new THREE.CatmullRomCurve3(ps,false,'centripetal');g=new THREE.TubeGeometry(path,Math.max(8,Math.min(60,ps.length*3)),a[3],Math.min(8,4+a[5]),false);}
 else if(type==='ring'){g=new THREE.TorusGeometry(a[3],a[4],6,a[7]);if(a[6]==='y')g.rotateX(Math.PI/2);center=map(a[2]);}
 else if(type==='loft')g=loft(a[2],a[4],a[1]);
 else if(type==='panel'){const ps=[],ii=[],N=10;for(const [y,w,edge,center]of a[2])for(let j=0;j<=N;j++){let u=j/N*2-1;ps.push(u*w,y,edge+(center-edge)*Math.sqrt(1-u*u));}for(let j=0;j<a[2].length-1;j++)for(let i=0;i<N;i++){let q=j*(N+1)+i;ii.push(q,q+N+1,q+1,q+1,q+N+1,q+N+2);}g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(ii);g.computeVertexNormals();}

 if(center){const r=c.rotation;if(r&&(r[0]||r[1]||r[2])){g.rotateX(r[0]);g.rotateY(r[2]);g.rotateZ(-r[1]);}g.translate(...center.toArray());}
 const o=ORIGINS[part];g.translate(-o[0],-o[1],-o[2]);return g;
}
function part(name,reach=3.7){const key=name+':'+reach;let batches=geoCache.get(key);if(!batches){const gs={};for(const c of HARBOR_SHAPES)if(c.args[0]===name)(gs[c.args[1]]??=[]).push(geometry(c,reach));batches=Object.fromEntries(Object.entries(gs).map(([k,v])=>[k,merged(v)]));geoCache.set(key,batches);}const group=new THREE.Group();group.name=name;for(const [k,g]of Object.entries(batches)){const m=new THREE.Mesh(g,mats()[k]);m.name=name+' '+k;m.castShadow=m.receiveShadow=true;group.add(m);}return group;}
function stats(group){let triangles=0,meshes=0;group.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;meshes++;}});return {triangles,meshes};}
export function createDavit(options={}){
 const outreach=THREE.MathUtils.clamp(options.outreach??3.7,2.5,9);const crane=new THREE.Group();crane.name='Working marine davit';const base=part('davitBase',outreach),slew=part('davitSlew',outreach);slew.position.y=.64;crane.add(base,slew);
 const hook=part('hook',outreach);hook.name='Davit lifting block and safety hook';slew.add(hook);
 const cables=[];for(const z of [-.075,.075]){const line=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,1,7),mats().cable);line.name='Hoisting steel wire rope';line.position.set(outreach,2,z);line.castShadow=true;slew.add(line);cables.push(line);}
 const anchorHeight=4.04-.64;let cableLength=2.8;
 const setCableLength=length=>{cableLength=THREE.MathUtils.clamp(Number(length)||.35,.35,9);hook.position.set(outreach,anchorHeight-cableLength,0);for(const line of cables){line.scale.y=Math.max(.01,cableLength-.08);line.position.y=anchorHeight-(cableLength-.08)/2;}return hook;};
 const getHookWorldPosition=(target=new THREE.Vector3())=>{crane.updateWorldMatrix(true,true);return hook.localToWorld(target.set(0,-.43,0));};
 const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=256;const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#c49a50';ctx.fillRect(0,0,512,256);ctx.fillStyle='#252e30';ctx.textAlign='center';ctx.font='bold 44px sans-serif';ctx.fillText('BOAT HOIST',256,86);ctx.font='bold 28px sans-serif';ctx.fillText('KEEP CLEAR OF LOAD',256,151);const tex=new THREE.CanvasTexture(labelCanvas);tex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(.55,.275),new THREE.MeshStandardMaterial({map:tex,roughness:.9,side:THREE.DoubleSide}));sign.position.set(.12,2.35,.19);slew.add(sign);
 crane.userData={hook,cables,slew,outreach,setCableLength,getHookWorldPosition,setYaw:angle=>{slew.rotation.y=angle;},getCableLength:()=>cableLength,hookBottomOffset:.43,anchorHeight:4.04,stats:null};setCableLength(options.cableLength??2.8);crane.userData.stats=stats(crane);return crane;
}
// Approximate silhouette from the rental launch video: an inclined green jib
// rises from its low heel, with a short intermediate mast and wire stays.
// The operating dimensions are authored; this is not a surveyed hoist model.
export function createReferenceDavit(options={}){
 const outreach=THREE.MathUtils.clamp(options.outreach??4.9,2.5,9),anchorHeight=4.8,mastHeight=2.7;
 const crane=new THREE.Group();crane.name='Santa Cruz inclined boat hoist';const slew=new THREE.Group();slew.name='Inclined green jib and winch';crane.add(part('davitBase',outreach),slew);
 const key='referenceDavit:'+outreach;let batches=geoCache.get(key);
 if(!batches){const gs={},add=(kind,c)=>{const g=geometry(c,3.7);g.translate(0,.64,0);(gs[kind]??=[]).push(g);};
  const beam=(a,b,w,d,kind='paint')=>add(kind,{type:'beam',args:['davitSlew',kind,a,b,w,d],rotation:[0,0,0]});
  const rod=(a,b,r,kind='cable',segments=10)=>add(kind,{type:'rod',args:['davitSlew',kind,a,b,r,r,'',segments],rotation:[0,0,0]});
  const box=(p,s,kind='paint',radius=.015)=>add(kind,{type:'box',args:['davitSlew',kind,p,s,'',radius],rotation:[0,0,0]});
  const heel=[-1.65,.55,0],tip=[outreach,anchorHeight,0],head=[0,mastHeight,0];
  beam([0,.68,0],head,.19,.21);box([0,.78,0],[.32,.16,.34],'edges');box([0,mastHeight-.08,0],[.28,.28,.32]);
  // Paired inclined channels, with a visible gap and transverse spacers.
  for(const z of[-.13,.13]){beam([heel[0],heel[1],z],[tip[0],tip[1],z],.12,.09);beam([heel[0],heel[1],z],[0,mastHeight,z],.09,.085);rod([0,mastHeight+.06,z],[outreach,anchorHeight+.15,z],.015,'cable');}
  for(let i=0;i<=5;i++){const t=i/5,x=heel[0]+(outreach-heel[0])*t,y=heel[1]+(anchorHeight-heel[1])*t;beam([x,y,-.17],[x,y,.17],.065,.065);}
  box([-1.65,.28,0],[.55,.13,.66],'edges');box([-1.65,.12,0],[.68,.24,.76],'concrete',.025);
  for(const z of[-.26,.26]){rod([-1.82,.35,z],[-1.82,.43,z],.025,'bolt',6);rod([-1.48,.35,z],[-1.48,.43,z],.025,'bolt',6);}
  rod([-1.65,.55,-.24],[-1.65,.55,.24],.055,'bolt',14);
  // Reuse the detailed drum, brake wheel and controls below the short mast.
  const reuse=/winch|drum|spindle|wrap|handwheel|control|switch|button/;
  for(const c of HARBOR_SHAPES){if(c.args[0]!=='davitSlew'||!c.args.some(v=>typeof v==='string'&&reuse.test(v)))continue;if(c.type==='curve')continue;add(c.args[1],c);}
  // Hoisting lead follows the mast and inclined jib to a compact nose sheave.
  rod([-.04,1.4,-.18],[.08,mastHeight,-.13],.01);rod([.08,mastHeight,-.13],[outreach,anchorHeight-.06,-.13],.01);
  for(const z of[-.18,.18])box([outreach,anchorHeight,z],[.27,.43,.045],'paint',.035);
  rod([outreach,anchorHeight,-.15],[outreach,anchorHeight,.15],.15,'edges',24);rod([outreach,anchorHeight,-.23],[outreach,anchorHeight,.23],.034,'bolt',12);
  for(const z of[-.09,.09])add('cable',{type:'ring',args:['davitSlew','cable',[outreach,anchorHeight,z],.15,.011,'nose pulley groove','z',24],rotation:[0,0,0]});
  batches=Object.fromEntries(Object.entries(gs).map(([k,v])=>[k,merged(v)]));geoCache.set(key,batches);
 }
 for(const[k,g]of Object.entries(batches)){const mesh=new THREE.Mesh(g,mats()[k]);mesh.name='Reference hoist '+k;mesh.castShadow=mesh.receiveShadow=true;slew.add(mesh);}
 const hook=part('hook',outreach);hook.name='Davit lifting block and safety hook';slew.add(hook);
 const cables=[];for(const z of[-.075,.075]){const line=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,1,7),mats().cable);line.name='Hoisting steel wire rope';line.position.set(outreach,2,z);line.castShadow=true;slew.add(line);cables.push(line);}
 let cableLength=2.8;
 const setCableLength=length=>{cableLength=THREE.MathUtils.clamp(Number(length)||.35,.35,9);hook.position.set(outreach,anchorHeight-cableLength,0);for(const line of cables){line.scale.y=Math.max(.01,cableLength-.08);line.position.y=anchorHeight-(cableLength-.08)/2;}return hook;};
 const getHookWorldPosition=(target=new THREE.Vector3())=>{crane.updateWorldMatrix(true,true);return hook.localToWorld(target.set(0,-.43,0));};
 crane.userData={hook,cables,slew,outreach,mastHeight,anchorHeight,hookBottomOffset:.43,setCableLength,getCableLength:()=>cableLength,getHookWorldPosition,setYaw:angle=>{slew.rotation.y=angle;},stats:null};
 setCableLength(options.cableLength??2.8);crane.userData.stats=stats(crane);return crane;
}
export function createDockWorker(name='Dock crew'){
 const worker=new THREE.Group();worker.name=name;const body=part('workerBody'),head=part('workerHead'),left=part('workerArmL'),right=part('workerArmR');head.position.fromArray(ORIGINS.workerHead);left.position.fromArray(ORIGINS.workerArmL);right.position.fromArray(ORIGINS.workerArmR);worker.add(body,head,left,right);let pose='idle';
 const setPose=value=>{pose=['idle','wave','operate','point'].includes(value)?value:'idle';};
 const update=(time=0)=>{head.rotation.y=Math.sin(time*.43)*.075;body.scale.y=1+Math.sin(time*1.8)*.0014;left.rotation.set(.07+Math.sin(time*.65)*.009,0,-.055);right.rotation.set(.025+Math.sin(time*.71+.3)*.009,0,.042);head.position.x=Math.sin(time*.37)*.0015;if(pose==='operate'){left.rotation.x=.95;right.rotation.x=.66;right.rotation.z=.16+Math.sin(time*2)*.05;head.rotation.x=.09;}else if(pose==='wave'){right.rotation.z=2.0+Math.sin(time*3.5)*.13;right.rotation.x=.25;head.rotation.x=-.04;}else if(pose==='point'){right.rotation.x=1.45;right.rotation.z=.12;head.rotation.x=0;}else head.rotation.x=0;};
 worker.userData={body,head,leftArm:left,rightArm:right,setPose,update,height:1.816,isFictionalWorker:true,stats:stats(worker)};update(0);return worker;
}
