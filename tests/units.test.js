import test from 'node:test';
import assert from 'node:assert/strict';
import {metersToFeet,cmToInches,kgToPounds,gramsToOunces,metersToMiles,mpsToMph,knotsToMph,celsiusToFahrenheit,formatNumber,formatWind,formatSpeed,formatDepth,formatLength,formatWeight,formatSinker,formatDistance,formatTemperature,formatLegacyCatchNote} from '../dist/units.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('US display conversions use exact definitions and preserve source readings',()=>{
 close(metersToFeet(.3048),1);close(cmToInches(2.54),1);
 close(kgToPounds(.45359237),1);close(gramsToOunces(28.349523125),1);
 close(metersToMiles(1609.344),1);close(mpsToMph(.44704),1);
 close(knotsToMph(1),1852/1609.344);close(celsiusToFahrenheit(0),32);close(celsiusToFahrenheit(100),212);
 const source={length:53,kg:2.87,depth:30,temperature:15,wind:10,speed:3};
 assert.equal(formatLength(source.length),'20.9 in');assert.equal(formatWeight(source.kg),'6.33 lb');
 assert.equal(formatDepth(source.depth),'98.4 ft');assert.equal(formatSinker(85),'3.00 oz');
 assert.equal(formatDistance(1609.344),'1.00 mi');assert.equal(formatTemperature(source.temperature),'59.0 °F');
 assert.equal(formatWind(source.wind),'11.5 mph');assert.equal(formatSpeed(source.speed),'6.7 mph');
 assert.deepEqual(source,{length:53,kg:2.87,depth:30,temperature:15,wind:10,speed:3});
});

test('reverse speed and wind clamp stay readable; cold temperatures retain their sign',()=>{
 assert.equal(formatSpeed(-3),'6.7 mph');assert.equal(formatSpeed(-0),'0.0 mph');
 assert.equal(formatWind(0),'0.0 mph');assert.equal(formatWind(-2),'0.0 mph');
 assert.equal(formatWind(10,0),'12 mph');assert.equal(formatTemperature(-40),'-40.0 °F');
});

test('missing and invalid readings are not mistaken for zero',()=>{
 const formatters=[[formatWind,'mph'],[formatSpeed,'mph'],[formatDepth,'ft'],[formatLength,'in'],[formatWeight,'lb'],[formatSinker,'oz'],[formatDistance,'mi'],[formatTemperature,'°F']];
 for(const value of[undefined,null,NaN,Infinity,-Infinity,'3'])for(const [format,unit] of formatters)assert.equal(format(value),`— ${unit}`);
});

test('precision is bounded and legacy catch notes convert without rewriting other entries',()=>{
 assert.equal(formatNumber(1,100),'1.000');assert.equal(formatNumber(1.2,-1),'1');assert.equal(formatNumber(1.2,NaN),'1.2');
 assert.equal(formatLegacyCatchNote('留鱼 长蛇齿单线鱼 · 53 cm / 2.87 kg。'),'留鱼 长蛇齿单线鱼 · 20.9 in / 6.33 lb。');
 assert.equal(formatLegacyCatchNote('放流 岩鱼 · 10.6 in / 0.95 lb。'),'放流 岩鱼 · 10.6 in / 0.95 lb。');
 assert.equal(formatLegacyCatchNote('第 12 次沿船边下线。'),'第 12 次沿船边下线。');
});
