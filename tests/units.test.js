import test from 'node:test';
import assert from 'node:assert/strict';
import {knotsToMps,mpsToKmh,formatWind,formatSpeed} from '../dist/units.js';

test('display conversions use exact SI definitions without changing source values',()=>{
 const windKnots=10,vesselMps=3;
 assert.equal(knotsToMps(3600),1852);
 assert.equal(mpsToKmh(vesselMps),10.8);
 assert.equal(formatWind(windKnots),'5.1 m/s');
 assert.equal(formatSpeed(vesselMps),'10.8 km/h');
 assert.equal(windKnots,10);
 assert.equal(vesselMps,3);
});

test('reverse vessel speed, calm wind and rounding remain readable',()=>{
 assert.equal(formatSpeed(-3),'10.8 km/h');
 assert.equal(formatSpeed(-0),'0.0 km/h');
 assert.equal(formatWind(0),'0.0 m/s');
 assert.equal(formatWind(-2),'0.0 m/s');
 assert.equal(formatWind(10,0),'5 m/s');
 assert.equal(formatSpeed(1/3,2),'1.20 km/h');
});

test('missing or non-finite readings never display as zero or NaN',()=>{
 for(const value of[undefined,null,NaN,Infinity,-Infinity,'3']){
  assert.equal(formatWind(value),'— m/s');
  assert.equal(formatSpeed(value),'— km/h');
 }
});

test('display precision is bounded safely',()=>{
 assert.equal(formatSpeed(1,100),'3.600 km/h');
 assert.equal(formatSpeed(1,-1),'4 km/h');
 assert.equal(formatSpeed(1,NaN),'3.6 km/h');
});
