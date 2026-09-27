import * as THREE from './vendor/three.module.js';
import {metreUV} from './env-materials.js?v=20260927-immersive';

// Authored close-range harbor set dressing. Geographic footprints stay in
// world-v2; these estimated fixtures are not claimed as a surveyed replica.
class DetailBatch {
 constructor(){this.parts=new Map();this.pose=new THREE.Object3D();}
 add(geometry,material,x,y,z,rx=0,ry=0,rz=0){this.pose.position.set(x,y,z);this.pose.rotation.set(rx,ry,rz);this.pose.scale.set(1,1,1);this.pose.updateMatrix();metreUV(geometry);geometry.applyMatrix4(this.pose.matrix);if(!this.parts.has(material))this.parts.set(material,[]);this.parts.get(material).push(geometry);}
 box(w,h,d,m,x,y,z,rx=0,ry=0,rz=0){this.add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);}
 cylinder(r1,r2,h,m,x,y,z,rx=0,ry=0,rz=0,segments=12){this.add(new THREE.CylinderGeometry(r1,r2,h,segments),m,x,y,z,rx,ry,rz);}
 beam(a,b,r,m){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),p=va.clone().add(vb).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),vb.clone().sub(va).normalize()),g=metreUV(new THREE.CylinderGeometry(r,r,va.distanceTo(vb),8));g.applyQuaternion(q);g.translate(p.x,p.y,p.z);if(!this.parts.has(m))this.parts.set(m,[]);this.parts.get(m).push(g);}
 flush(scene){let triangles=0;for(const[mat,parts]of this.parts){const attr={position:[],normal:[],uv:[]};for(const source of parts){const g=source.index?source.toNonIndexed():source;for(const key of Object.keys(attr))attr[key].push(...g.attributes[key].array);if(g!==source)g.dispose();source.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(attr.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(attr.normal,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(attr.uv,2));g.computeBoundingSphere();const mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);triangles+=attr.position.length/9;}return{drawCalls:this.parts.size,triangles};}
}
export function addHarborDetail(scene,m,pierRings){
 const b=new DetailBatch(),warm=new THREE.MeshStandardMaterial({color:0xffe9ae,emissive:0xffb951,emissiveIntensity:2.5}),red=new THREE.MeshStandardMaterial({color:0x9b3825,roughness:.72}),offwhite=new THREE.MeshStandardMaterial({color:0xd9d4ba,roughness:.8});
 // Front door / service-window framing, trim with thickness, lintels and sill.
 for(const x of[-3.98,-.42])b.box(.15,2.8,.15,m.trim,x,4.13,-53.45);
 for(const x of[-2.83,-1.57])b.box(.10,2.12,.13,m.trim,x,3.83,-53.36);
 b.box(1.38,.1,.17,m.trim,-2.2,4.92,-53.36);
 b.box(1.32,.055,.25,m.zinc,-2.2,2.81,-53.34);
 for(const z of[-58.55,-53.45])b.box(.15,2.8,.15,m.trim,-.4,4.13,z);
 b.box(.23,.13,5.25,m.trim,-.35,4.93,-56);
 b.box(.17,.08,5.15,m.darkWood,-.37,3.79,-56);
 // Metal roofing with standing seams, gutter and real soffit thickness.
 for(let i=0;i<11;i++)b.box(.025,.075,5.75,m.zinc,-4.19+i*.398,5.66,-56);
 b.box(4.2,.14,.12,m.roof,-2.2,5.54,-53.13);b.box(4.2,.14,.12,m.roof,-2.2,5.54,-58.88);
 b.cylinder(.045,.045,2.5,m.zinc,-4.15,4.0,-58.82);
 // Practical wall fixture, with shade and bulb rather than a glowing box.
 b.cylinder(.15,.24,.12,m.darkMetal,-.08,4.84,-54.3);b.cylinder(.08,.085,.095,warm,-.08,4.74,-54.3);b.beam([-.42,4.94,-54.3],[-.08,4.89,-54.3],.027,m.darkMetal);
 // Shelves visible through the large service opening.
 for(const y of[3.3,4.0,4.7]){b.box(2.6,.07,.39,m.darkWood,-2.1,y,-58.33);for(const x of[-3.3,-.95])b.box(.035,.27,.035,m.zinc,x,y-.15,-58.33);}
 const boxMats=[m.trim,red,m.siding];for(let i=0;i<18;i++)b.box(.18+(i%3)*.035,.22,.18,boxMats[i%3],-3.2+(i%6)*.39,3.45+Math.floor(i/6)*.7,-58.3);
 // Life ring and extinguisher set into the wall. Painted segments are physical.
 for(let i=0;i<4;i++){b.add(new THREE.TorusGeometry(.285,.072,8,14,Math.PI/2),i%2?offwhite:red,-4.11,4.05,-54.25,0,Math.PI/2,i*Math.PI/2);}
 b.cylinder(.075,.075,.4,red,-4.1,3.43,-55.15);b.box(.16,.06,.15,m.darkMetal,-4.1,3.68,-55.15);
 // Pontoon decking: 49 individually bevel-free weathered boards with open seams.
 for(let i=0;i<49;i++)b.box(3.22,.034,.19,m.pierWood,17.6,.761,-80.85+i*.2);
 for(const x of[15.95,19.25])b.box(.075,.18,9.95,m.darkWood,x,.61,-76);
 // Every step has a metal nosing and two bolt heads; flush fittings stay walkable.
 for(let i=0;i<8;i++){b.box(.045,.04,3.02,m.zinc,14.07+i*.48,2.744-i*.25,-72.2);for(const z of[-73.49,-70.92])b.cylinder(.018,.018,.007,m.darkMetal,13.91+i*.48,2.736-i*.25,z);}
 for(const z of[-80.6,-71.5])for(const x of[16.2,19]){
  b.cylinder(.23,.23,.09,m.zinc,x,2.89,z);b.cylinder(.235,.235,.035,m.darkMetal,x,2.97,z);
  b.add(new THREE.TorusGeometry(.295,.082,8,16),m.rubber,x,.53,z,Math.PI/2,0,0);
  b.add(new THREE.TorusGeometry(.295,.082,8,16),m.rubber,x,.38,z,Math.PI/2,0,0);
  b.beam([x,.81,z],[x,1.18,z],.016,m.rope);
 }
 b.cylinder(.084,.084,.055,warm,16.2,3.035,-71.5);b.cylinder(.13,.13,.025,m.darkMetal,16.2,3.075,-71.5);
 // Flush cleat plates and paired horns at the loading edge.
 for(const z of[-79.2,-73.2]){b.box(.28,.025,.18,m.zinc,18.94,.8,z);for(const dz of[-.055,.055])for(const dx of[-.09,.09])b.cylinder(.013,.013,.012,m.darkMetal,18.94+dx,.819,z+dz);for(const dz of[-.075,.075])b.cylinder(.032,.032,.10,m.zinc,18.94,.86,z+dz);b.cylinder(.038,.038,.38,m.zinc,18.94,.91,z,Math.PI/2);}
 // Rope coils use tube geometry, physically scaled 13 mm rope.
 for(let i=0;i<3;i++){const points=[];for(let j=0;j<=76;j++){const a=j/76*Math.PI*2,r=.23+i*.025;points.push(new THREE.Vector3(17.05+Math.cos(a)*r,.792+i*.019,-79.95+Math.sin(a)*r));}const curve=new THREE.CatmullRomCurve3(points);b.add(new THREE.TubeGeometry(curve,76,.012,5,false),m.rope,0,0,0);}
 // Full timber edge fascia, fasteners, and cross bracing around the close wharf.
 for(const ring of pierRings)for(let i=1;i<ring.length;i++){const p=ring[i-1],q=ring[i],len=Math.hypot(q.x-p.x,q.z-p.z),cx=(p.x+q.x)/2,cz=(p.z+q.z)/2;if(Math.hypot(cx,cz+62)>140||len<.1)continue;const angle=Math.atan2(q.x-p.x,q.z-p.z);b.box(.16,.36,len,m.darkWood,cx,2.51,cz,0,angle);for(let d=1;d<len;d+=3.5){const f=d/len,x=p.x+(q.x-p.x)*f,z=p.z+(q.z-p.z)*f;b.box(.12,.33,.035,m.zinc,x,2.51,z,0,angle);}}
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
