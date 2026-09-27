import * as THREE from './vendor/three.module.js';

// Ordinary portable instruments stay in the boat rather than hovering over the view.
export function createDeckInstruments(){
 const group=new THREE.Group(),rubber=new THREE.MeshStandardMaterial({color:0x172021,roughness:.82}),steel=new THREE.MeshStandardMaterial({color:0x7e8984,roughness:.36,metalness:.78});
 const compass=new THREE.Group();compass.position.set(-.48,.79,-.32);group.add(compass);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.13,.145,.075,40),rubber);compass.add(base);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.124,.009,8,48),steel);rim.rotation.x=Math.PI/2;rim.position.y=.048;compass.add(rim);
 const dial=document.createElement('canvas');dial.width=dial.height=512;const c=dial.getContext('2d');c.fillStyle='#111c20';c.fillRect(0,0,512,512);c.translate(256,256);c.strokeStyle='#d9d8b9';
 for(let a=0;a<360;a+=5){c.save();c.rotate(a*Math.PI/180);c.lineWidth=a%30?2:4;c.beginPath();c.moveTo(0,-222);c.lineTo(0,a%30?-208:-196);c.stroke();if(a%30===0){c.fillStyle=a===0?'#c25f45':'#c9ccb1';c.font=a%90?'24px sans-serif':'bold 40px sans-serif';c.textAlign='center';c.fillText(a%90?a.toString():['N','E','S','W'][a/90],0,-160);}c.restore();}
 const dialTexture=new THREE.CanvasTexture(dial);dialTexture.colorSpace=THREE.SRGBColorSpace;
 const card=new THREE.Group(),face=new THREE.Mesh(new THREE.CircleGeometry(.119,48),new THREE.MeshStandardMaterial({map:dialTexture,roughness:.6,emissive:0x61725d,emissiveIntensity:.16}));face.rotation.x=-Math.PI/2;card.add(face);card.position.y=.045;compass.add(card);
 const lubber=new THREE.Mesh(new THREE.BoxGeometry(.006,.004,.06),new THREE.MeshStandardMaterial({color:0xb96342,roughness:.8}));lubber.position.set(0,.056,-.085);compass.add(lubber);
 const cover=new THREE.Mesh(new THREE.SphereGeometry(.123,32,16,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xaac4c6,transparent:true,opacity:.16,roughness:.08,metalness:.1,depthWrite:false}));cover.scale.y=.32;cover.position.y=.049;compass.add(cover);
 const watch=new THREE.Group();watch.position.set(.49,.83,-.31);watch.rotation.set(-.2,0,.15);group.add(watch);
 const strap=new THREE.Mesh(new THREE.BoxGeometry(.083,.026,.25),rubber);watch.add(strap);
 const casing=new THREE.Mesh(new THREE.BoxGeometry(.115,.035,.105),steel);casing.position.y=.02;watch.add(casing);
 const screen=document.createElement('canvas');screen.width=512;screen.height=384;const ink=screen.getContext('2d');const screenTexture=new THREE.CanvasTexture(screen);screenTexture.colorSpace=THREE.SRGBColorSpace;
 const lcd=new THREE.Mesh(new THREE.PlaneGeometry(.096,.071),new THREE.MeshStandardMaterial({map:screenTexture,roughness:.38,emissiveMap:screenTexture,emissive:0xffffff,emissiveIntensity:.34}));lcd.rotation.x=-Math.PI/2;lcd.position.y=.039;watch.add(lcd);
 let last='',dialHeading=0;
 function update({time,bearing,dt}){let difference=(bearing*Math.PI/180-dialHeading+Math.PI*3)%(Math.PI*2)-Math.PI;dialHeading+=difference*(1-Math.exp(-dt*4));card.rotation.y=dialHeading;if(time===last)return;last=time;ink.fillStyle='#3c473b';ink.fillRect(0,0,512,384);ink.fillStyle='#a4b397';ink.font='26px monospace';ink.textAlign='center';ink.fillText('WATER RESIST',256,75);ink.font='bold 84px monospace';ink.fillText(time.slice(0,5),256,216);ink.font='30px monospace';ink.fillText(time.slice(6)+'  ·  LOCAL',256,302);screenTexture.needsUpdate=true;}
 return{group,update};
}
