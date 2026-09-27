import * as THREE from './vendor/three.module.js';
export function createFishingRod(){
 const group=new THREE.Group();group.name='Graphite boat rod and conventional reel';
 const corkCanvas=document.createElement('canvas');corkCanvas.width=256;corkCanvas.height=512;const c=corkCanvas.getContext('2d');c.fillStyle='#8f8065';c.fillRect(0,0,256,512);let seed=38;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<7000;i++){c.fillStyle=i%3?'#71644c40':'#c0b29945';c.fillRect(rnd()*256,rnd()*512,rnd()*3+1,rnd()*1.4+.5);}for(let i=0;i<512;i+=48){c.fillStyle='#393b3138';c.fillRect(0,i,256,2);}const corkMap=new THREE.CanvasTexture(corkCanvas);corkMap.colorSpace=THREE.SRGBColorSpace;corkMap.wrapS=corkMap.wrapT=THREE.RepeatWrapping;
 const cork=new THREE.MeshStandardMaterial({map:corkMap,roughness:.88,bumpMap:corkMap,bumpScale:.0005}),graphite=new THREE.MeshPhysicalMaterial({color:0x152a29,roughness:.33,metalness:.35,clearcoat:.7,clearcoatRoughness:.28}),black=new THREE.MeshStandardMaterial({color:0x202726,roughness:.35,metalness:.55}),silver=new THREE.MeshStandardMaterial({color:0x939c97,roughness:.27,metalness:.86}),brass=new THREE.MeshStandardMaterial({color:0x968458,roughness:.39,metalness:.65});
 const add=(geometry,material,x=0,y=0,z=0,parent=group)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
 const segments=[];for(let i=0;i<16;i++){const r=.003+(15-i)*.0005,part=add(new THREE.CylinderGeometry(r,r+.0005,.153,10),i<3?cork:graphite,0,i*.15);segments.push(part);}
 add(new THREE.CylinderGeometry(.016,.014,.025,16),black,0,-.083);for(const y of [.08,.22,.35,.425])add(new THREE.CylinderGeometry(.014,.014,.013,16),silver,0,y);
 const guides=[];for(let i=4;i<16;i+=2){const ring=add(new THREE.TorusGeometry(.013-(i-4)*.00065,.0018,6,18),silver,.016,i*.15);ring.rotation.y=Math.PI/2;guides.push(ring);const wrap=add(new THREE.CylinderGeometry(.012-i*.0004,.012-i*.0004,.025,10),black,0,i*.15-.018);segments[i].add(wrap);wrap.position.y=-.02;}
 // Spool axis is local X, with open cage rather than a solid white cylinder.
 add(new THREE.BoxGeometry(.028,.07,.085),black,.035,.26);
 for(const x of [.022,.119]){const plate=add(new THREE.CylinderGeometry(.060,.060,.012,36),black,x,.26);plate.rotation.z=Math.PI/2;const bevel=add(new THREE.TorusGeometry(.052,.0028,8,36),silver,x+(x>.08?.007:-.007),.26);bevel.rotation.y=Math.PI/2;}
 const spool=new THREE.Group();spool.position.set(.07,.26,0);group.add(spool);const core=add(new THREE.CylinderGeometry(.040,.040,.079,36),brass,0,0,0,spool);core.rotation.z=Math.PI/2;
 const lineTurns=new THREE.InstancedMesh(new THREE.TorusGeometry(.041,.0006,4,28),new THREE.MeshStandardMaterial({color:0xaaa981,roughness:.74}),22),turn=new THREE.Object3D();for(let i=0;i<22;i++){turn.position.x=-.032+i*.003;turn.rotation.y=Math.PI/2;turn.updateMatrix();lineTurns.setMatrixAt(i,turn.matrix);}spool.add(lineTurns);
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const bar=add(new THREE.CylinderGeometry(.003,.003,.083,6),silver,.07,.26+Math.sin(a)*.05,Math.cos(a)*.05);bar.rotation.z=Math.PI/2;}
 const crank=new THREE.Group();crank.position.set(.136,.26,0);group.add(crank);add(new THREE.BoxGeometry(.008,.082,.009),silver,0,.035,0,crank);const knob=add(new THREE.CylinderGeometry(.012,.015,.038,14),black,.02,.075,0,crank);knob.rotation.z=Math.PI/2;
 const star=add(new THREE.TorusGeometry(.025,.003,5,6),brass,.133,.26,0);star.rotation.y=Math.PI/2;
 group.userData.segments=segments;group.userData.guides=guides;group.userData.spool=spool;group.userData.crank=crank;return group;
}
