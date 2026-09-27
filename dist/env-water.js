import * as THREE from './vendor/three.module.js';

// This exact height field is shared by world-v2.waveHeight and the hull sampler.
// Analytic derivatives produce a coherent wave normal rather than painting large
// ripple normals over an unrelated displacement surface.
export function configureOcean(water){
 water.material.uniforms.waveState={value:new THREE.Vector4(.25,9,0,0)};
 water.material.uniforms.boatPosition={value:new THREE.Vector3(20.8,-77,0)};
 water.material.uniforms.surfaceLight={value:.7};
 water.material.uniforms.boatMaskEnabled={value:0};
 const heightCode=`uniform vec4 waveState;
 varying vec3 swellNormal;
 void main() {
 vec3 wavePosition=position;
 float wx=position.x,wz=-position.y;
 float sa=sin(waveState.z),ca=cos(waveState.z);
 float q=wx*sa+wz*ca;
 float k=39.47841760435743/(9.81*waveState.y*waveState.y);
 float phase=q*k+time*6.283185307179586/waveState.y;
 float crossPhase=wx*.11-wz*.06+time*1.15;
 float ripplePhase=wz*.28+time*1.7;
 wavePosition.z=sin(phase)*waveState.x*.27+sin(crossPhase)*waveState.x*.11+sin(ripplePhase)*.025;
 float dx=cos(phase)*waveState.x*.27*k*sa+cos(crossPhase)*waveState.x*.0121;
 float dz=cos(phase)*waveState.x*.27*k*ca-cos(crossPhase)*waveState.x*.0066+cos(ripplePhase)*.007;
 swellNormal=normalize(vec3(-dx,1.,-dz));`;
 water.material.vertexShader=water.material.vertexShader.replace('void main() {',heightCode).replaceAll('vec4( position, 1.0 )','vec4( wavePosition, 1.0 )');
 const cutHull=`void main() {
 vec2 d=worldPosition.xz-boatPosition.xy;
 float ch=cos(boatPosition.z),sh=sin(boatPosition.z);
 vec2 bp=vec2(d.x*ch-d.y*sh,d.x*sh+d.y*ch);
 float u=clamp((bp.y+2.6)/4.8,0.,1.);
 float w=.88*pow(sin(min(1.,u/.5)*1.5708),.72)*(1.-.135*u*u*u);
 if(boatMaskEnabled>.5&&bp.y>-2.57&&bp.y<2.17&&abs(bp.x)<w)discard;`;
 water.material.fragmentShader=water.material.fragmentShader
 .replace('uniform float alpha;','uniform float alpha;\nuniform vec3 boatPosition;\nuniform float surfaceLight;\nuniform float boatMaskEnabled;\nvarying vec3 swellNormal;')
 .replace('void main() {',cutHull)
 .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );','vec3 surfaceNormal = normalize(swellNormal + vec3(noise.x,0.,noise.y)*.19);')
 .replace('float rf0 = 0.3;','float rf0 = 0.02037;')
 .replace('vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;','vec3 scatter = max(0.0,dot(surfaceNormal,eyeDirection))*waterColor*surfaceLight;')
 .replace('( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight )','(reflectionSample + specularLight*.45)');
 return water;
}

// Instancing keeps a 60-particle wake to one draw call (previously 35 draws).
export function createWake(scene,waveHeight){
 const c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d');
 const g=ctx.createRadialGradient(48,48,3,48,48,45);g.addColorStop(0,'rgba(223,236,232,.46)');g.addColorStop(.32,'rgba(239,244,230,.55)');g.addColorStop(1,'rgba(220,240,230,0)');ctx.fillStyle=g;ctx.fillRect(0,0,96,96);
 // Deterministic tiny holes break up the wake without another texture request.
 ctx.globalCompositeOperation='destination-out';for(let i=0;i<90;i++){ctx.beginPath();ctx.arc((i*37)%96,(i*53)%96,.7+i%3,0,Math.PI*2);ctx.fill();}
 const tex=new THREE.CanvasTexture(c),mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.65,color:0xe7f0e7});
 mat.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float wakeAlpha; varying float vWakeAlpha;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWakeAlpha=wakeAlpha;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWakeAlpha;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vWakeAlpha;');};
 const count=60,geo=new THREE.PlaneGeometry(1,1),alphas=new Float32Array(count);geo.setAttribute('wakeAlpha',new THREE.InstancedBufferAttribute(alphas,1));
 const mesh=new THREE.InstancedMesh(geo,mat,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh);
 const particles=Array.from({length:count},()=>({x:0,z:0,life:0,width:1})),pose=new THREE.Object3D();let index=0,last=0;
 return(t,dt,boat,speed)=>{
  if(boat&&Math.abs(speed)>.35&&t-last>.11){last=t;const p=particles[index++%count],a=boat.rotation.y,x=(Math.sin(index*12.9))*.23,z=2.23;p.x=boat.position.x+x*Math.cos(a)+z*Math.sin(a);p.z=boat.position.z-x*Math.sin(a)+z*Math.cos(a);p.life=1;p.width=Math.min(1.6,.55+Math.abs(speed)*.1);}
  for(let i=0;i<count;i++){const p=particles[i];p.life=Math.max(0,p.life-dt*.14);alphas[i]=p.life*p.life;const size=p.width*(1+(1-p.life)*5);pose.position.set(p.x,waveHeight(p.x,p.z,t)+.035,p.z);pose.rotation.set(-Math.PI/2,0,i*2.39996);pose.scale.set(size,size,1);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);}
  mesh.instanceMatrix.needsUpdate=true;geo.attributes.wakeAlpha.needsUpdate=true;
 };
}
