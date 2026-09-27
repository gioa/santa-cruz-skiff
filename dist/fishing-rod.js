import * as THREE from './vendor/three.module.js';
const Y=new THREE.Vector3(0,1,0),X=new THREE.Vector3(1,0,0),TAU=Math.PI*2,BLANK_START=.64,ROD_LENGTH=2.25;
function corkTexture(){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const c=canvas.getContext('2d');c.fillStyle='#ae9874';c.fillRect(0,0,256,512);let seed=38;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<7000;i++){c.fillStyle=i%3?'#68594040':'#e3c69a45';c.fillRect(rnd()*256,rnd()*512,rnd()*3+1,rnd()*1.4+.5);}for(let i=0;i<512;i+=48){c.fillStyle='#393b3124';c.fillRect(0,i,256,1);}
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;return map;
}
// Batch only direct static meshes. Moving controls and the flexible blank stay separate.
function batchStatic(parent){
 const sets=new Map();for(const m of parent.children)if(m.isMesh&&!m.isInstancedMesh&&!m.userData.flexible){if(!sets.has(m.material.uuid))sets.set(m.material.uuid,[]);sets.get(m.material.uuid).push(m);}
 for(const meshes of sets.values()){
  if(meshes.length<2)continue;const positions=[],normals=[],uvs=[];
  for(const m of meshes){m.updateMatrix();const clone=m.geometry.clone().applyMatrix4(m.matrix),g=clone.index?clone.toNonIndexed():clone;positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);uvs.push(...g.attributes.uv.array);if(g!==clone)g.dispose();clone.dispose();parent.remove(m);m.geometry.dispose();}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeBoundingSphere();const mesh=new THREE.Mesh(g,meshes[0].material);mesh.name=meshes.map(m=>m.name).join(' / ');mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
 }
}
export function createFishingRod(){
 const group=new THREE.Group();group.name='Flexible graphite boat rod with working conventional reel';
 const corkMap=corkTexture(),cork=new THREE.MeshStandardMaterial({map:corkMap,roughness:.9,bumpMap:corkMap,bumpScale:.00045}),graphite=new THREE.MeshPhysicalMaterial({color:0x172829,roughness:.34,metalness:.25,clearcoat:.65,clearcoatRoughness:.24});
 const black=new THREE.MeshStandardMaterial({color:0x202725,roughness:.45,metalness:.38}),rubber=new THREE.MeshStandardMaterial({color:0x181c1a,roughness:.86}),silver=new THREE.MeshStandardMaterial({color:0xa3aaa8,roughness:.29,metalness:.91}),brass=new THREE.MeshStandardMaterial({color:0xb49b59,roughness:.32,metalness:.82}),ceramic=new THREE.MeshStandardMaterial({color:0x252d2d,roughness:.18,metalness:.2}),lineMaterial=new THREE.MeshStandardMaterial({color:0xc2bba0,roughness:.78});
 const add=(geometry,material,x=0,y=0,z=0,parent=group,name='')=>{const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const ring=(r,t,x,y,z,mat=silver,parent=group)=>add(new THREE.TorusGeometry(r,t,6,24),mat,x,y,z,parent),cyl=(r1,r2,h,x,y,z,mat,parent=group)=>add(new THREE.CylinderGeometry(r1,r2,h,18),mat,x,y,z,parent);
 // Real 34 mm cork contact, rear grip, threaded reel seat and tapered foregrip.
 cyl(.017,.020,.38,0,.105,0,cork).name='segmented cork rear grip';cyl(.020,.021,.024,0,-.092,0,rubber).name='rubber butt cap';cyl(.013,.014,.205,0,.398,0,black).name='threaded reel seat';cyl(.017,.019,.17,0,.575,0,cork).name='tapered cork foregrip';
 for(const y of[.294,.311,.481,.493,.658])cyl(.018,.018,.007,0,y,0,silver);for(let i=0;i<9;i++)cyl(.0148,.0148,.0017,0,.455+i*.003,0,black);
 add(new THREE.BoxGeometry(.028,.112,.012),silver,0,.386,.018).name='reel mounting foot';add(new THREE.BoxGeometry(.022,.027,.029),black,0,.386,.038).name='reel support pedestal';
 // Conventional reel sits above the blank; its spool and right crank share transverse X.
 const reelY=.386,reelZ=.068;
 for(const x of[-.05,.05]){cyl(.051,.051,.011,x,reelY,reelZ,black).rotation.z=Math.PI/2;ring(.044,.0024,x+(x>0?.006:-.006),reelY,reelZ,silver).rotation.y=Math.PI/2;for(let i=0;i<4;i++){const a=i*TAU/4+Math.PI/4;cyl(.003,.003,.002,x+(x>0?.006:-.006),reelY+Math.sin(a)*.037,reelZ+Math.cos(a)*.037,silver).rotation.z=Math.PI/2;}}
 const spool=new THREE.Group();spool.name='geared line spool';spool.position.set(0,reelY,reelZ);group.add(spool);cyl(.035,.035,.081,0,0,0,brass,spool).rotation.z=Math.PI/2;for(const x of[-.038,.038])cyl(.042,.042,.004,x,0,0,brass,spool).rotation.z=Math.PI/2;
 const lineTurns=new THREE.InstancedMesh(new THREE.TorusGeometry(.036,.00055,4,32),lineMaterial,27),turn=new THREE.Object3D();lineTurns.name='braided fishing line wound on spool';for(let i=0;i<27;i++){turn.position.set(-.034+i*.0026,0,0);turn.rotation.y=Math.PI/2;turn.updateMatrix();lineTurns.setMatrixAt(i,turn.matrix);}spool.add(lineTurns);
 for(const a of[-Math.PI/2,0,Math.PI])cyl(.0025,.0025,.093,0,reelY+Math.sin(a)*.042,reelZ+Math.cos(a)*.042,silver).rotation.z=Math.PI/2;cyl(.003,.003,.095,0,.433,.079,silver).rotation.z=Math.PI/2;
 const levelWind=new THREE.Group();levelWind.position.set(0,.439,.085);group.add(levelWind);ring(.005,.0013,0,0,0,silver,levelWind).rotation.x=Math.PI/2;add(new THREE.BoxGeometry(.026,.022,.01),black,0,.346,.030).name='free-spool thumb release';
 const crank=new THREE.Group();crank.name='working reel handle';crank.position.set(.071,reelY,reelZ);group.add(crank);cyl(.007,.007,.013,0,0,0,silver,crank).rotation.z=Math.PI/2;add(new THREE.BoxGeometry(.006,.06,.012),silver,.008,.023,0,crank).name='machined crank arm';cyl(.006,.006,.024,.023,.053,0,silver,crank).rotation.z=Math.PI/2;
 const knob=add(new THREE.SphereGeometry(1,16,10),rubber,.056,.053,0,crank,'rubber reel crank grip');knob.scale.set(.029,.014,.014);for(const x of[.039,.075])cyl(.011,.011,.002,x,.053,0,black,crank).rotation.z=Math.PI/2;
 ring(.020,.003,.066,reelY,reelZ,brass).rotation.y=Math.PI/2;for(let i=0;i<5;i++){const a=i*TAU/5;add(new THREE.BoxGeometry(.006,.030,.006),brass,.066,reelY+Math.cos(a)*.011,reelZ+Math.sin(a)*.011).rotation.x=a;}
 const gripSocket=new THREE.Object3D();gripSocket.name='left palm on cork contact';gripSocket.position.set(0,.205,0);gripSocket.userData.gripRadius=.017;group.add(gripSocket);
 const reelGripSocket=new THREE.Object3D();reelGripSocket.name='right palm on rotating reel knob contact';reelGripSocket.position.copy(knob.position);reelGripSocket.rotation.z=-Math.PI/2;reelGripSocket.userData.gripRadius=.014;crank.add(reelGripSocket);
 const tipSocket=new THREE.Object3D();tipSocket.name='line leaving ceramic tip guide';group.add(tipSocket);
 // Continuous indexed blank: all guide stations follow the same elastic centreline.
 const steps=42,sides=10,positions=new Float32Array((steps+1)*(sides+1)*3),normals=new Float32Array(positions.length),uvs=[],indices=[];
 for(let j=0;j<=steps;j++)for(let i=0;i<=sides;i++){uvs.push(i/sides,j/steps);if(j<steps&&i<sides){const a=j*(sides+1)+i,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}}
 const blankGeometry=new THREE.BufferGeometry();blankGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));blankGeometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));blankGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));blankGeometry.setIndex(indices);
 const blank=add(blankGeometry,graphite);blank.name='continuous tapered graphite blank';blank.userData.flexible=true;blank.frustumCulled=false;
 const guideHeights=[.72,.96,1.22,1.51,1.80,2.05,2.25],guides=[];
 for(let i=0;i<guideHeights.length;i++){
  const r=.016-i*.00165,frame=new THREE.Group();frame.name='ceramic line guide '+(i+1);Object.assign(frame.userData,{height:guideHeights[i],offset:r+.008,radius:r});group.add(frame);
  ring(r,.0015,0,0,frame.userData.offset,silver,frame).rotation.x=Math.PI/2;ring(r-.0018,.0013,0,0,frame.userData.offset,ceramic,frame).rotation.x=Math.PI/2;
  for(const side of[-1,1]){const a=new THREE.Vector3(side*.006,-.020,0),b=new THREE.Vector3(side*r,0,frame.userData.offset),leg=cyl(.0013,.0013,a.distanceTo(b),0,0,0,silver,frame);leg.position.copy(a).add(b).multiplyScalar(.5);leg.quaternion.setFromUnitVectors(Y,b.sub(a).normalize());}
  cyl(.011-i*.0011,.011-i*.0011,.019,0,-.018,0,black,frame);batchStatic(frame);guides.push(frame);
 }
 const lineGeometry=new THREE.BufferGeometry(),linePositions=new Float32Array((guides.length+2)*3);lineGeometry.setAttribute('position',new THREE.BufferAttribute(linePositions,3).setUsage(THREE.DynamicDrawUsage));const guideLine=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:0xc4c3a2,transparent:true,opacity:.86}));guideLine.name='line from level wind through each guide';guideLine.frustumCulled=false;group.add(guideLine);
 // The named public stations remain available although there are no detached cylinders.
 const segments=Array.from({length:16},(_,i)=>{const o=new THREE.Object3D();o.name='rod station '+i;group.add(o);return o;});
 const point=new THREE.Vector3(),tangent=new THREE.Vector3(),normal=new THREE.Vector3(),guidePoint=new THREE.Vector3(),baseGripRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2),counterRotation=new THREE.Quaternion();let currentBend=NaN,levelWindPhase=0;
 function station(y,bend){const t=THREE.MathUtils.clamp((y-BLANK_START)/(ROD_LENGTH-BLANK_START),0,1);point.set(0,y,-3*bend*Math.pow(t,2.5));tangent.set(0,ROD_LENGTH-BLANK_START,-7.5*bend*Math.pow(t,1.5)).normalize();normal.set(0,-tangent.z,tangent.y);return t;}
 function update({dt=0,reeling=false,bend=0}={}){
  const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(dt,.25)):0,flex=Number.isFinite(bend)?THREE.MathUtils.clamp(bend,0,.5):0;
  if(reeling){const a=elapsed*4.5;crank.rotation.x=(crank.rotation.x+a)%TAU;spool.rotation.x=(spool.rotation.x+a*4.3)%TAU;levelWindPhase=(levelWindPhase+a*4.3*.23)%TAU;}
  // The spindle rotates inside the knob; hand follows its circle without wrist tumbling.
  counterRotation.setFromAxisAngle(X,-crank.rotation.x);reelGripSocket.quaternion.copy(counterRotation).multiply(baseGripRotation);levelWind.position.x=Math.sin(levelWindPhase)*.028;
  if(flex!==currentBend){currentBend=flex;for(let j=0;j<=steps;j++){const t=station(BLANK_START+(ROD_LENGTH-BLANK_START)*j/steps,flex),r=.0069*(1-t)+.0018;for(let i=0;i<=sides;i++){const a=i/sides*TAU,co=Math.cos(a),si=Math.sin(a),k=(j*(sides+1)+i)*3;positions[k]=co*r;positions[k+1]=point.y+normal.y*si*r;positions[k+2]=point.z+normal.z*si*r;normals[k]=co;normals[k+1]=normal.y*si;normals[k+2]=normal.z*si;}}
   blankGeometry.attributes.position.needsUpdate=true;blankGeometry.attributes.normal.needsUpdate=true;
   for(const frame of guides){station(frame.userData.height,flex);frame.position.copy(point);frame.quaternion.setFromUnitVectors(Y,tangent);}for(let i=0;i<segments.length;i++){station(i*(ROD_LENGTH/15),flex);segments[i].position.copy(point);segments[i].quaternion.setFromUnitVectors(Y,tangent);}
   const tip=guides.at(-1);tipSocket.position.set(0,0,tip.userData.offset).applyQuaternion(tip.quaternion).add(tip.position);tipSocket.quaternion.copy(tip.quaternion);
  }
  linePositions.set([0,reelY+.024,reelZ+.028,levelWind.position.x,levelWind.position.y,levelWind.position.z]);for(let i=0;i<guides.length;i++){const frame=guides[i];guidePoint.set(0,0,frame.userData.offset).applyQuaternion(frame.quaternion).add(frame.position);guidePoint.toArray(linePositions,(i+2)*3);}lineGeometry.attributes.position.needsUpdate=true;
 }
 for(const parent of[group,spool,crank])batchStatic(parent);
 Object.assign(group.userData,{segments,guides,spool,crank,blank,gripSocket,reelGripSocket,tipSocket,guideLine,update,length:ROD_LENGTH,gripRadius:.017,reelKnobRadius:.014});update();return group;
}
