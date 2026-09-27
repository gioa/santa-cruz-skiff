import * as THREE from './vendor/three.module.js';
import {DetailBatch} from './env-detail.js?v=20260927-wharf-dawn';

// Street-facing facade interpreted from the rental operator's storefront photo.
// The footprint/orientation are geographic; dimensions and interior stock are
// authored approximations, not a photographic mesh or a surveyed interior.
export function createRentalShop(scene,m,deckHeight){
 const root=new THREE.Group();root.name='Santa Cruz Boat Rental storefront';scene.add(root);
 const b=new DetailBatch(),front=-6.5,back=1,z0=-69,z1=-51,ridge=-56.7;
 const height=z=>z<ridge?2.95+(z-z0)/(ridge-z0)*1.55:4.5-(z-ridge)/(z1-ridge)*.43;
 const paint=new THREE.MeshStandardMaterial({color:0x187b89,normalMap:m.wood.normalMap,normalScale:new THREE.Vector2(.12,.12),roughness:.86});
 const recess=new THREE.MeshStandardMaterial({color:0x135a65,roughness:.93});
 const cream=new THREE.MeshStandardMaterial({color:0xdbded4,normalMap:m.wood.normalMap,normalScale:new THREE.Vector2(.16,.16),roughness:.85});
 const glass=new THREE.MeshStandardMaterial({color:0x668584,roughness:.14,metalness:.15,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
 const inner=new THREE.MeshStandardMaterial({color:0x434b43,roughness:.95});
 const red=new THREE.MeshStandardMaterial({color:0x993d30,roughness:.78});
 const amber=new THREE.MeshStandardMaterial({color:0xba9650,roughness:.73});
 const pack=new THREE.MeshStandardMaterial({color:0xb7b69a,roughness:.66});
 const glow=new THREE.MeshStandardMaterial({color:0xe8e1b5,emissive:0xffd9a3,emissiveIntensity:.8,roughness:.75});
 const Y=y=>deckHeight+y;
 // Interior floor, rear wall and end returns. Frontage stays open at the door.
 b.box(back-front,.09,z1-z0,inner,(front+back)/2,Y(.055),(z0+z1)/2);
 for(let z=z0+.16;z<z1;z+=.32){const h=height(z);b.box(.17,h,.316,paint,back,Y(h/2),z);b.box(.038,h,.04,recess,back+.1,Y(h/2),z-.145);}
 for(const z of[z0,z1]){const h=height(z);b.box(back-front,h,.16,paint,(front+back)/2,Y(h/2),z);for(let x=front+.3;x<back;x+=.32)b.box(.035,h,.045,recess,x,Y(h/2),z+(z===z0?-.1:.1));}
 // Raised white curb, with a low flush threshold instead of a wall across entry.
 b.box(.32,.12,14.25,cream,front-.1,Y(.075),-61.875);
 b.box(.32,.12,2.25,cream,front-.1,Y(.075),-52.125);
 b.box(.48,.025,1.5,m.zinc,front-.03,Y(.08),-54);
 // Broad two-tier shop windows. The last bay follows the low end of the roof.
 const bays=[[-68.78,-66.15],[-66.15,-63.55],[-63.55,-60.95],[-60.95,-58.35],[-58.35,-55.15],[-52.85,-51.12]];
 for(const [a,c] of bays){const z=(a+c)/2,w=c-a,h=Math.min(height(a),height(c));
  b.box(.2,.43,w,paint,front,Y(.28),z);
  b.box(.24,.21,w,paint,front-.025,Y(2.60),z);
  b.box(.19,.12,w,cream,front-.035,Y(.52),z);
  b.box(.15,.13,w,recess,front+.04,Y(2.44),z);
  b.box(.035,1.84,w-.22,glass,front+.035,Y(1.49),z);
  const ga=a+.12,gc=c-.12,ha=Math.max(2.79,height(ga)-.19),hc=Math.max(2.79,height(gc)-.19),topGlass=new THREE.BufferGeometry();
  topGlass.setAttribute('position',new THREE.Float32BufferAttribute([front+.035,Y(2.78),ga,front+.035,Y(2.78),gc,front+.035,Y(hc),gc,front+.035,Y(2.78),ga,front+.035,Y(hc),gc,front+.035,Y(ha),ga],3));topGlass.computeVertexNormals();b.add(topGlass,glass,0,0,0);
  b.box(.12,.095,w-.12,paint,front-.08,Y(2.80),z);
  b.box(.12,.08,Math.hypot(w-.12,hc-ha),paint,front-.08,Y((ha+hc)/2+.08),z,-Math.atan2(hc-ha,w-.12));
  // Deep reveals keep windows from reading as dark stickers on a flat wall.
  for(const edge of[a+.08,c-.08]){const eh=height(edge);b.box(.26,eh,.15,paint,front-.02,Y(eh/2),edge);b.box(.08,2.02,.042,recess,front-.15,Y(1.46),edge+(edge<z?.09:-.09));}
  b.box(.25,.065,w-.14,paint,front-.11,Y(.43),z);
 }
 // Doorway at z=-54: no glass or solid front wall below the lintel.
 for(const z of[-54.83,-53.17])b.box(.28,3.02,.18,paint,front-.04,Y(1.51),z);
 b.box(.28,.21,1.85,paint,front-.04,Y(2.92),-54);
 b.box(.03,.95,1.42,glass,front+.04,Y(3.51),-54);
 b.box(.15,.12,1.72,paint,front-.055,Y(4.035),-54);
 // Door is open inward along the return, exposing the interior counter.
 b.box(1.35,2.58,.065,recess,front+.72,Y(1.38),-53.19);
 b.box(1.10,1.83,.022,glass,front+.72,Y(1.64),-53.235);
 b.box(.08,.22,.045,m.zinc,front+1.21,Y(1.15),-53.255);
 b.box(.64,.94,1.2,m.darkWood,-5.77,Y(.53),-54);
 b.box(.78,.09,1.35,m.wood,-5.82,Y(1.045),-54);
 b.box(.22,.09,.28,m.darkMetal,-5.91,Y(1.13),-54.38);
 b.box(.16,.18,.055,m.darkMetal,-5.79,Y(1.23),-54.39,0,0,-.18);
 // Racks of rods and tackle visible behind the windows, with a clear entrance.
 for(const [bayIndex,[a,c]] of bays.entries()){
  const z=(a+c)/2,w=c-a;
  for(const y of[.68,1.28,1.88]){b.box(.62,.055,w-.32,m.darkWood,front+.73,Y(y),z);for(let j=0;j<Math.floor(w/.29)-1;j++){const pz=a+.30+j*.29,mat=[pack,red,amber,paint][(j+bayIndex)%4];b.box(.14,.27,.19,mat,front+.61,Y(y+.165),pz);b.box(.035,.035,.12,m.zinc,front+.515,Y(y+.2),pz);}}
  b.box(.055,1.55,w-.35,inner,front+1.075,Y(1.36),z);
  for(let j=0;j<3;j++){const pz=a+.42+j*.24;b.cylinder(.007,.019,2.27,m.darkMetal,front+.32,Y(1.38),pz,0,0,.035*(j-1),8);b.cylinder(.028,.028,.09,m.zinc,front+.28,Y(.76),pz,0,0,Math.PI/2,8);}
 }
 for(const y of[.6,1.3,2.0]){b.box(.50,.06,11.5,m.darkWood,.55,Y(y),-61.5);for(let j=0;j<24;j++)b.box(.25,.27,.30,[pack,paint,amber][j%3],.5,Y(y+.17),-66.9+j*.46);}
 // Photo's long, unequal pitched roof with white fascia and exposed rafter ends.
 for(const [a,c] of[[z0-.35,ridge],[ridge,z1+.38]]){const ha=height(Math.max(z0,a)),hc=height(Math.min(z1,c)),angle=-Math.atan2(hc-ha,c-a),length=Math.hypot(c-a,hc-ha);
  b.box(8.12,.13,length,m.roof,-2.75,Y((ha+hc)/2+.075),(a+c)/2,angle);
  for(const x of[front-.37,back+.38])b.box(.13,.20,length,cream,x,Y((ha+hc)/2-.015),(a+c)/2,angle);
 }
 for(let z=z0;z<=z1;z+=.63)b.box(8.05,.055,.033,m.zinc,-2.75,Y(height(z)+.15),z);
 for(let z=z0+.3;z<z1;z+=1.28){b.box(.56,.20,.105,cream,front-.15,Y(height(z)-.09),z);b.box(.48,.16,.10,cream,back+.14,Y(height(z)-.08),z);}
 for(const z of[z0-.36,z1+.39])b.box(8.16,.19,.12,cream,-2.75,Y(height(Math.max(z0,Math.min(z1,z)))+.05),z);
 b.cylinder(.11,.11,.58,m.zinc,-1.3,Y(height(-57.8)+.38),-57.8);b.cylinder(.17,.17,.05,m.darkMetal,-1.3,Y(height(-57.8)+.69),-57.8);
 // Rental sign: lettering is newly drawn, not a copied photographic texture.
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=768;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#d7d8b5';ctx.fillRect(0,0,384,768);ctx.strokeStyle='#284c46';ctx.lineWidth=11;ctx.strokeRect(13,13,358,742);ctx.textAlign='center';ctx.fillStyle='#244f49';ctx.font='italic 43px Georgia';ctx.fillText('Santa Cruz',192,97);ctx.font='bold 83px sans-serif';ctx.fillText('BOAT',192,218);ctx.font='bold 68px sans-serif';ctx.fillText('RENTALS',192,309);ctx.font='32px sans-serif';ctx.fillText('GIFTS',192,414);ctx.fillText('FISHING TACKLE',192,461);ctx.fillText('BAIT',192,508);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(90,555);ctx.lineTo(294,555);ctx.stroke();ctx.font='29px sans-serif';ctx.fillText('15',192,619);ctx.font='24px sans-serif';ctx.fillText('MUNICIPAL WHARF',192,659);
 const signMap=new THREE.CanvasTexture(canvas);signMap.colorSpace=THREE.SRGBColorSpace;const signMat=new THREE.MeshStandardMaterial({map:signMap,roughness:.9});
 b.box(.10,1.76,.88,cream,front-.24,Y(3.56),-55.06);const sign=new THREE.Mesh(new THREE.PlaneGeometry(.84,1.71),signMat);sign.rotation.y=-Math.PI/2;sign.position.set(front-.296,Y(3.56),-55.06);root.add(sign);
 // A practical door lamp and narrow warm shop lights, not a luminous facade.
 b.beam([front-.1,Y(3.26),-53.0],[front-.58,Y(3.26),-53.0],.025,m.darkMetal);b.cylinder(.13,.24,.10,m.darkMetal,front-.58,Y(3.2),-53.0);b.cylinder(.10,.12,.055,glow,front-.58,Y(3.12),-53.0);
 for(const z of[-54.2,-60,-65])b.box(.18,.06,1.15,glow,-3.2,Y(2.7),z);
 const shopLight=new THREE.PointLight(0xffd3a0,24,17,2);shopLight.position.set(-5.4,Y(2.6),-54);root.add(shopLight);
 const detail=b.flush(root);root.userData.geometryStats={...detail,drawCalls:detail.drawCalls+1};
 // Free equipment sits beside the counter; the returned group hides when packed.
 const gear=new THREE.Group();gear.name='Rental starter equipment';gear.position.set(-7.05,Y(.12),-52.0);root.add(gear);
 const g=new DetailBatch();g.box(.63,.42,.42,cream,0,.21,0);g.box(.67,.055,.46,cream,0,.445,0);g.box(.32,.09,.2,m.darkMetal,.07,.52,.02);g.box(.055,.13,.09,m.darkMetal,-.22,.31,-.22);g.box(.055,.13,.09,m.darkMetal,.22,.31,-.22);g.box(.29,.15,.22,recess,.52,.075,.04);
 for(let i=0;i<2;i++){g.cylinder(.007,.015,2.02,m.darkMetal,.37,.99,-.43+i*.13,0,0,-.08,8);g.cylinder(.038,.038,.055,m.zinc,.30,.50,-.43+i*.13,Math.PI/2,0,0,10);g.cylinder(.015,.02,.37,m.rope,.29,.25,-.43+i*.13,0,0,-.08,8);}
 g.flush(gear);
 return{gearObjects:[gear],shopLight};
}
