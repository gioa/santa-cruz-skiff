import * as THREE from './vendor/three.module.js';

// Photographic CC0 PBR sources: Poly Haven, weathered_brown_planks.
// One shared source image set; each surface receives metre-based UVs.
export function metreUV(geometry,scale=1){
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=[];
 for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));if(ny>nx&&ny>nz)uv.push(p.getX(i)*scale,-p.getZ(i)*scale);else if(nx>nz)uv.push(p.getZ(i)*scale,p.getY(i)*scale);else uv.push(p.getX(i)*scale,p.getY(i)*scale);}
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geometry;
}
export function createEnvironmentMaterials(renderer){
 const loader=new THREE.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const load=(name,color=false)=>{const t=loader.load(`./assets/env-wood-${name}.jpg`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.33,.33);t.anisotropy=anisotropy;if(color)t.colorSpace=THREE.SRGBColorSpace;return t;};
 const map=load('color',true),normalMap=load('normal'),roughnessMap=load('roughness');
 const wood=new THREE.MeshStandardMaterial({map,normalMap,normalScale:new THREE.Vector2(.5,.5),roughnessMap,roughness:.95,color:0xc5c2b3});
 const darkWood=wood.clone();darkWood.color.set(0x645f4d);darkWood.normalScale.set(.8,.8);
 const pierWood=wood.clone();pierWood.color.set(0xacaaa0);
 const siding=wood.clone();siding.color.set(0x729186);siding.normalScale.set(.22,.22);siding.roughness=.9;
 const trim=wood.clone();trim.color.set(0xddd8c2);trim.normalScale.set(.25,.25);
 const pile=darkWood.clone();pile.roughness=1;
 pile.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float envHeight;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 envPoint=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nenvPoint=instanceMatrix*envPoint;\n#endif\nenvHeight=(modelMatrix*envPoint).y;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float envHeight;').replace('#include <color_fragment>','#include <color_fragment>\nfloat wetBand=1.0-smoothstep(0.25,1.2,envHeight);diffuseColor.rgb*=mix(vec3(1.0),vec3(.30,.39,.28),wetBand);');};
 const metal=new THREE.MeshStandardMaterial({color:0x596260,roughness:.46,metalness:.8});
 const zinc=new THREE.MeshStandardMaterial({color:0xa3aaa8,roughness:.4,metalness:.86});
 const darkMetal=new THREE.MeshStandardMaterial({color:0x242b2c,roughness:.7,metalness:.6});
 const rubber=new THREE.MeshStandardMaterial({color:0x202628,roughness:.97});
 const rope=new THREE.MeshStandardMaterial({color:0xad9a74,roughness:1});
 const roof=new THREE.MeshStandardMaterial({color:0x465856,roughness:.57,metalness:.5});
 return{wood,pierWood,darkWood,pile,siding,trim,metal,zinc,darkMetal,rubber,rope,roof};
}
