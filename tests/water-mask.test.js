import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {waterPointInsideHull} from '../dist/env-water.js';
import {createSkiff} from '../dist/boat.js';

// Canvas shading is irrelevant here: intersect the actual rendered hull triangles.
const gradient={addColorStop(){}};
const context=new Proxy({}, {get:(_,key)=>['createLinearGradient','createRadialGradient'].includes(key)?()=>gradient:()=>{},set:(o,key,value)=>(o[key]=value,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const boat=createSkiff();
const hull=boat.children.filter(o=>o.name.startsWith('red clinker strake'));
for(const mesh of hull)mesh.material.side=THREE.DoubleSide;
boat.updateMatrixWorld(true);

test('water remains outside the wet hull instead of cutting the maximum-beam footprint',()=>{
 assert.equal(waterPointInsideHull(0,0,0),true);
 assert.equal(waterPointInsideHull(.8,0,0),false);
 assert.equal(waterPointInsideHull(0,-1,0),false);
 assert.equal(waterPointInsideHull(0,1.2,0),false);
 assert.equal(waterPointInsideHull(0,0,2.18),false);
});

test('heeled pitched and heaving water mask never exposes water outside actual hull triangles',()=>{
 const ray=new THREE.Raycaster(),local=new THREE.Vector3(),inverse=new THREE.Matrix4(),transform=new THREE.Matrix4(),rotation=new THREE.Quaternion(),direction=new THREE.Vector3();
 let samples=0;
 for(const [roll,pitch,yaw,heave] of [[0,0,0,0],[.10,.10,0,0],[-.18,.12,1.4,.14],[.25,-.17,-2,-.16]]){
  rotation.setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ'));
  transform.compose(new THREE.Vector3(0,heave,0),rotation,new THREE.Vector3(1,1,1));
  inverse.copy(transform).invert();
  for(let x=-1.7;x<=1.7;x+=.067)for(let z=-3;z<=3;z+=.083){
   local.set(x,0,z).applyMatrix4(inverse);
   if(!waterPointInsideHull(local.x,local.y,local.z))continue;
   samples++;
   ray.set(local,direction.set(local.x<0?-1:1,0,0));
   assert.ok(ray.intersectObjects(hull,false).length>0,`Water cut outside hull at ${local.toArray()}`);
  }
 }
 assert.ok(samples>2000,'Regression must cover both sides of every boat pose');
});
