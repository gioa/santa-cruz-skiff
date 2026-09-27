import * as THREE from './vendor/three.module.js';
import {DetailBatch} from './env-detail.js?v=20260927-wharf-dawn';
import {HARBOR} from './harbor-layout.js?v=20260927-wharf-dawn';
import {onPier} from './geography.js?v=20260927-wharf-dawn';

// Photo-referenced rental landing, distinct from the larger public float.
// City 2014 engineering report Photo 8-2 + Bay Area Waters video at 00:45–00:55.
// Dimensions in plan are estimates; the 15 ft deck-to-landing drop is documented.
export function createWharfSurface(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
 let seed=418;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pixels=ctx.createImageData(512,512);for(let i=0;i<pixels.data.length;i+=4){const v=104+random()*22;pixels.data[i]=v;pixels.data[i+1]=v+1;pixels.data[i+2]=v;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
 ctx.lineWidth=.7;ctx.strokeStyle='rgba(32,35,35,.34)';for(let i=0;i<5;i++){let x=random()*512,y=random()*512;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<11;j++){x+=(random()-.5)*32;y+=random()*20;ctx.lineTo(x,y);}ctx.stroke();}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(.16,.16);
 return new THREE.MeshStandardMaterial({map,color:0xc9cbc6,roughness:.98});
}

export function createWharfLanding(scene,m,pierRings){
 const b=new DetailBatch(),d=HARBOR.deckHeight,l=HARBOR.landingHeight,s=HARBOR.stair,p=HARBOR.landing,c=HARBOR.connector;
 const white=m.trim.clone();white.map=null;white.color.setHex(0xe2e4dc);white.normalScale.set(.4,.4);
 const wornPaint=new THREE.MeshStandardMaterial({color:0xbcc2b8,roughness:.97});
 const lane=new THREE.MeshStandardMaterial({color:0xcacbb9,roughness:1});
 const timber=m.pierWood.clone();timber.color.setHex(0xadb2ad);
 // The asphalt wharf carries traffic/parking. Narrow pale curbs edge the shop.
 b.box(.20,.16,24,white,-7.03,d+.075,-57);
 for(const z of[-37,-43,-49,-61,-67,-73,-79]){
  b.box(.09,.008,5.8,lane,-10.2,d+.026,z,0,-.50);
  b.box(.09,.008,5.3,lane,-24.3,d+.026,z,0,.50);
 }
 for(let z=-28;z>-97;z-=7)b.box(.1,.007,3.0,lane,-17.4,d+.022,z);
 // Dense rows of real timber piles and cross caps, rather than an empty slab.
 for(let z=-33;z>-97;z-=4.572){
  const xs=[];for(let x=-34;x<17;x+=4.1)if(onPier(x,z)){xs.push(x);b.cylinder(.26,.37,d+5,m.pile,x,(d-5)/2-.28,z,0,0,0,10);}
  if(xs.length>1){const left=xs[0],right=xs.at(-1);b.box(right-left+.8,.31,.31,m.darkWood,(left+right)/2,d-.5,z);for(let i=0;i<xs.length-1;i++)if(i%2===0){b.beam([xs[i],d-2.8,z],[xs[i+1],d-.8,z],.085,m.darkWood);}}
 }
 // Left/east main guardrail follows the mapped edge; gate aligns with stairs.
 for(const ring of pierRings)for(let i=1;i<ring.length;i++){
  const a=ring[i-1],q=ring[i];if(Math.max(a.z,q.z)<-102||Math.min(a.z,q.z)>-24)continue;
  const len=Math.hypot(q.x-a.x,q.z-a.z);for(let at=0;at<len;at+=2.25){const f=at/len,g=Math.min(1,(at+2.25)/len),x=a.x+(q.x-a.x)*f,z=a.z+(q.z-a.z)*f,x2=a.x+(q.x-a.x)*g,z2=a.z+(q.z-a.z)*g;
   if(z< -100||z> -27||x> -22||z> -67.3&&z< -63.3)continue;
   b.box(.12,1.16,.12,white,x,d+.56,z);for(const h of[.30,.66,1.02]){const mid=new THREE.Vector3((x+x2)/2,d+h,(z+z2)/2);b.box(.065,.13,Math.hypot(x2-x,z2-z),white,mid.x,mid.y,mid.z,0,Math.atan2(x2-x,z2-z));}
  }
 }
 // A short gate platform reaches the stair head. No long low floating pontoon.
 b.box(c.maxX-c.minX,.19,c.maxZ-c.minZ,timber,(c.minX+c.maxX)/2,d-.095,(c.minZ+c.maxZ)/2);
 for(const z of[c.minZ,c.maxZ]){const start=z===c.maxZ?s.maxX:c.minX;for(const h of[.55,1])b.box(c.maxX-start,.13,.075,white,(start+c.maxX)/2,d+h,z);}
 const steps=24,run=(s.maxZ-s.minZ)/steps,rise=(d-l)/steps,cx=(s.minX+s.maxX)/2;
 for(let i=0;i<steps;i++){
  const y=d-(i+.5)*rise,z=s.minZ+(i+.5)*run;
  b.box(s.maxX-s.minX,.105,run-.014,timber,cx,y-.055,z);
  b.box(s.maxX-s.minX,.023,.027,wornPaint,cx,y+.009,z-run*.43);
  for(const x of[s.minX+.13,s.maxX-.13])b.cylinder(.014,.014,.006,m.darkMetal,x,y+.004,z,0,0,0,6);
 }
 // Open wooden stringers, white stair handrails and intermediate posts.
 for(const x of[s.minX+.06,s.maxX-.06]){
  const length=Math.hypot(s.maxZ-s.minZ,d-l),angle=Math.atan2(d-l,s.maxZ-s.minZ);
  b.box(.11,.22,length,m.darkWood,x,(d+l)/2-.2,(s.minZ+s.maxZ)/2,angle);
  for(const h of[.48,.98])b.box(.075,.12,length,white,x,(d+l)/2+h,(s.minZ+s.maxZ)/2,angle);
  for(let i=0;i<=4;i++){const f=i/4;b.box(.1,1.1,.1,white,x,d+(l-d)*f+.49,s.minZ+(s.maxZ-s.minZ)*f);}
 }
 // Small fixed landing: planks bolted to piles with peeling white three-bar rail.
 const n=Math.ceil((p.maxZ-p.minZ)/.25);for(let i=0;i<n;i++)b.box(p.maxX-p.minX,.1,(p.maxZ-p.minZ)/n-.01,timber,(p.minX+p.maxX)/2,l-.05,p.minZ+(i+.5)*(p.maxZ-p.minZ)/n);
 for(const x of[p.minX+.08,p.maxX-.08]){
  b.box(.20,.27,p.maxZ-p.minZ+.3,m.darkWood,x,l-.22,(p.minZ+p.maxZ)/2);
  for(const z of[p.minZ+.1,p.maxZ-.1]){b.cylinder(.22,.29,6.4,m.pile,x,-1.4,z);b.box(.12,1.14,.12,white,x,l+.51,z);}
 }
 for(const h of[.28,.64,1.02]){
  b.box(.075,.14,p.maxZ-p.minZ,white,p.maxX,l+h,(p.minZ+p.maxZ)/2);
  b.box(p.maxX-p.minX,.14,.075,white,(p.minX+p.maxX)/2,l+h,p.maxZ);
  // The seaward rail has the real ladder gap, rather than blocking boat access.
  b.box(.075,.14,.53,white,p.minX,l+h,p.minZ+.27);
 }
 // Gray U-shaped ladder handles visible in the actual boarding video.
 for(const z of[-56.05,-54.9]){
  const points=[new THREE.Vector3(p.minX+.18,l-.24,z),new THREE.Vector3(p.minX+.18,l+.69,z),new THREE.Vector3(p.minX+.06,l+.95,z),new THREE.Vector3(p.minX-.20,l+1.01,z),new THREE.Vector3(p.minX-.42,l+.85,z),new THREE.Vector3(p.minX-.42,-.6,z)];
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),30,.027,8,false),m.zinc,0,0,0);
 }
 for(const y of[l-.2,l-.55,l-.9,l-1.25])b.box(.085,.065,1.15,m.darkMetal,p.minX-.42,y,-55.475);
 // Tall pale timber guides flank the lifting station below the green hoist.
 for(const z of[-57.35,-53.4]){b.box(.12,d-l+.3,.12,white,p.minX-.16,(d+l)/2,z);b.beam([p.minX-.16,l+.1,z],[p.minX+.4,d-.2,z],.034,m.zinc);}
 // Mooring cleat, working rope, and dark fender strip at the boarding edge.
 b.box(.12,.21,1.0,m.rubber,p.minX-.055,l-.12,-55.35);
 b.box(.25,.045,.15,m.zinc,HARBOR.mooringX,l+.025,HARBOR.mooringZ);b.cylinder(.035,.035,.34,m.zinc,HARBOR.mooringX,l+.1,HARBOR.mooringZ,Math.PI/2);
 const result=b.flush(scene);scene.userData.referenceLanding=result;
 return result;
}
