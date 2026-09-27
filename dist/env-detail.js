import * as THREE from './vendor/three.module.js';
import {metreUV} from './env-materials.js?v=20260927-articulated-v5';

// Authored close-range harbor set dressing. Geographic footprints stay in
// world-v2; these estimated fixtures are not claimed as a surveyed replica.
export class DetailBatch {
 constructor(){this.parts=new Map();this.pose=new THREE.Object3D();}
 add(geometry,material,x,y,z,rx=0,ry=0,rz=0){this.pose.position.set(x,y,z);this.pose.rotation.set(rx,ry,rz);this.pose.scale.set(1,1,1);this.pose.updateMatrix();metreUV(geometry);geometry.applyMatrix4(this.pose.matrix);if(!this.parts.has(material))this.parts.set(material,[]);this.parts.get(material).push(geometry);}
 box(w,h,d,m,x,y,z,rx=0,ry=0,rz=0){this.add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);}
 cylinder(r1,r2,h,m,x,y,z,rx=0,ry=0,rz=0,segments=12){this.add(new THREE.CylinderGeometry(r1,r2,h,segments),m,x,y,z,rx,ry,rz);}
 beam(a,b,r,m){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),p=va.clone().add(vb).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),vb.clone().sub(va).normalize()),g=metreUV(new THREE.CylinderGeometry(r,r,va.distanceTo(vb),8));g.applyQuaternion(q);g.translate(p.x,p.y,p.z);if(!this.parts.has(m))this.parts.set(m,[]);this.parts.get(m).push(g);}
 flush(scene){let triangles=0;for(const[mat,parts]of this.parts){const attr={position:[],normal:[],uv:[]};for(const source of parts){const g=source.index?source.toNonIndexed():source;for(const key of Object.keys(attr))attr[key].push(...g.attributes[key].array);if(g!==source)g.dispose();source.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(attr.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(attr.normal,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(attr.uv,2));g.computeBoundingSphere();const mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);triangles+=attr.position.length/9;}return{drawCalls:this.parts.size,triangles};}
}
export function addHarborDetail(scene,m,pierRings,deckHeight=5.56){
 const b=new DetailBatch();
 // Full timber edge fascia, fasteners, and cross bracing around the close wharf.
 for(const ring of pierRings)for(let i=1;i<ring.length;i++){const p=ring[i-1],q=ring[i],len=Math.hypot(q.x-p.x,q.z-p.z),cx=(p.x+q.x)/2,cz=(p.z+q.z)/2;if(Math.hypot(cx,cz+62)>140||len<.1)continue;const angle=Math.atan2(q.x-p.x,q.z-p.z);b.box(.16,.36,len,m.darkWood,cx,deckHeight-.22,cz,0,angle);for(let d=1;d<len;d+=3.5){const f=d/len,x=p.x+(q.x-p.x)*f,z=p.z+(q.z-p.z)*f;b.box(.12,.33,.035,m.zinc,x,deckHeight-.22,z,0,angle);}}
 const result=b.flush(scene);scene.userData.harborDetail=result;return result;
}

export function addWindowDetail(scene,windowMesh,windows,m){
 // Close-range frame geometry supplies proper reveals, sills and mullions;
 // distant mapped buildings retain their inexpensive glass plane instances.
 const parts=[],positions=[],normals=[],uvs=[];
 const part=(w,h,d,x,y,z)=>{const g=metreUV(new THREE.BoxGeometry(w,h,d)).toNonIndexed();g.translate(x,y,z);parts.push(g);};
 part(.075,1.46,.09,-.76,0,0);part(.075,1.46,.09,.76,0,0);part(1.6,.075,.09,0,.70,0);part(1.67,.1,.2,0,-.71,.025);part(.035,1.31,.05,0,0,.025);part(1.45,.035,.05,0,0,.026);
 for(const p of parts){positions.push(...p.attributes.position.array);normals.push(...p.attributes.normal.array);uvs.push(...p.attributes.uv.array);p.dispose();}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 const close=windows.filter(p=>Math.hypot(p.x,p.z+62)<200),frames=new THREE.InstancedMesh(geo,m.trim,close.length),pose=new THREE.Object3D();
 close.forEach((p,i)=>{pose.position.set(p.x,p.y,p.z);pose.rotation.set(0,p.angle,0);pose.updateMatrix();frames.setMatrixAt(i,pose.matrix);});frames.castShadow=true;frames.receiveShadow=true;scene.add(frames);
 const glow=new Float32Array(windows.map((_,i)=>(i*17)%11<3?.45+((i*7)%9)*.05:0));windowMesh.geometry.setAttribute('windowGlow',new THREE.InstancedBufferAttribute(glow,1));
 const light={value:0};windowMesh.material.onBeforeCompile=s=>{s.uniforms.eveningLight=light;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float windowGlow;varying float vWindowGlow;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWindowGlow=windowGlow;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float eveningLight;varying float vWindowGlow;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.0,.58,.22)*vWindowGlow*eveningLight;');};
 scene.userData.windowFrames={drawCalls:1,count:close.length,triangles:positions.length/9*close.length};return daylight=>{light.value=(1-daylight)*.15;};
}
