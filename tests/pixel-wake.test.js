import test from 'node:test';
import assert from 'node:assert/strict';
import {wakeProfile,wakeOrigin} from '../dist/pixel-wake.js';
import {SKIFF_HULL_OUTLINE} from '../dist/pixel-boat-geometry.js';
test('wake expands, strengthens and lasts longer with actual speed, not engine power',()=>{
 for(const speed of[0,.1,NaN,Infinity])assert.equal(wakeProfile(speed).active,false);
 const slow=wakeProfile(.5),fast=wakeProfile(4);
 for(const key of['width','expansion','opacity','foam','duration'])assert.ok(fast[key]>slow[key],key);
 assert.ok(fast.spacing<slow.spacing);assert.deepEqual(wakeProfile(-2),wakeProfile(2));assert.deepEqual(wakeProfile(500),wakeProfile(5));
});
test('wake originates behind the moving hull across headings and reverse',()=>{
 assert.deepEqual(wakeOrigin(10,20,0,2),{x:10,z:26.12});
 const right=wakeOrigin(10,20,Math.PI/2,2);assert.ok(Math.abs(right.x-16.12)<1e-9);assert.ok(Math.abs(right.z-20)<1e-9);
 assert.ok(wakeOrigin(10,20,0,-2).z<20);
});
test('shared shadow/sprite hull has a pointed bow and a narrowed flat transom',()=>{
 const bow=SKIFF_HULL_OUTLINE.filter(p=>p[1]===1);assert.deepEqual(bow,[[24,1]]);
 assert.deepEqual(SKIFF_HULL_OUTLINE.filter(p=>p[1]===78),[[39,78],[9,78]]);assert.ok(Object.isFrozen(SKIFF_HULL_OUTLINE));
});
