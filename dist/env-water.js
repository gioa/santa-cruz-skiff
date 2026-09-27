import * as THREE from './vendor/three.module.js';

// This exact height field is shared by world-v2.waveHeight and the hull sampler.
// Analytic derivatives produce a coherent wave normal rather than painting large
// ripple normals over an unrelated displacement surface.
export function configureOcean(water){
 water.material.uniforms.waveState={value:new THREE.Vector4(.25,9,0,0)};
 water.material.uniforms.boatPosition={value:new THREE.Vector3(20.8,-77,0)};
 water.material.uniforms.boatWorldInverse={value:new THREE.Matrix4()};
 water.material.uniforms.surfaceLight={value:.7};
 water.material.uniforms.boatMaskEnabled={value:0};
 const heightCode=`uniform vec4 waveState;
 varying vec3 swellNormal;
 void main() {
 vec3 wavePosition=position;
 // The dense grid can follow the boat without dragging the wave phase with it.
 vec3 waveWorld=(modelMatrix*vec4(position,1.)).xyz;
 float wx=waveWorld.x,wz=waveWorld.z;
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
 // Test the displaced water fragment against the boat's actual hollow volume.
 // A yaw-only maximum-beam ellipse cuts a visible hole next to a heeling hull.
 // Full local coordinates include heave, roll and pitch; the width is inverted
 // from boat.js's inner plank cross section at this fragment's actual height.
 const cutHull=`void main() {
 if(boatMaskEnabled>.5){
  vec3 bp=(boatWorldInverse*worldPosition).xyz;
  if(bp.z>-2.57&&bp.z<2.155&&abs(bp.x)<.95){
   float u=clamp((bp.z+2.6)/4.8,0.,1.);
   float sheer=.735+.18*pow(1.-u,5.)+.045*u*u;
   float keel=-.29+.55*pow(1.-u,6.)+.075*pow(u,4.);
   float height=(bp.y-keel-.0135)/(sheer-keel);
   if(height>0.&&height<1.){
    float t=pow(height,1./1.7);
    float beam=max(.012,.95*pow(sin(min(1.,u/.5)*1.57079632679),.72)*(1.-.135*u*u*u));
    float insideWidth=max(0.,beam*sin(t*1.57079632679)-.030);
    if(abs(bp.x)<insideWidth)discard;
   }
  }
 }`;
 water.material.fragmentShader=water.material.fragmentShader
 .replace('uniform float alpha;','uniform float alpha;\nuniform vec3 boatPosition;\nuniform mat4 boatWorldInverse;\nuniform float surfaceLight;\nuniform float boatMaskEnabled;\nvarying vec3 swellNormal;')
 .replace('void main() {',cutHull)
 .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );','vec3 surfaceNormal = normalize(swellNormal + vec3(noise.x,0.,noise.y)*.19);')
 .replace('float rf0 = 0.3;','float rf0 = 0.02037;')
 .replace('vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;','vec3 scatter = max(0.0,dot(surfaceNormal,eyeDirection))*waterColor*surfaceLight;')
 .replace('( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight )','(reflectionSample + specularLight*.45)');
 return water;
}


// Metre-scale CPU reference for regression tests; the shader uses the same
// cross-section inversion. A 3 mm safety inset stays inside tessellated planks.
export function waterPointInsideHull(x,y,z){
 if(z<=-2.57||z>=2.155||Math.abs(x)>=.95)return false;
 const u=Math.min(1,Math.max(0,(z+2.6)/4.8));
 const sheer=.735+.18*(1-u)**5+.045*u*u,keel=-.29+.55*(1-u)**6+.075*u**4;
 const height=(y-keel-.0135)/(sheer-keel);
 if(height<=0||height>=1)return false;
 const beam=Math.max(.012,.95*Math.sin(Math.min(1,u/.5)*Math.PI/2)**.72*(1-.135*u**3));
 const insideWidth=Math.max(0,beam*Math.sin(height**(1/1.7)*Math.PI/2)-.030);
 return Math.abs(x)<insideWidth;
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
