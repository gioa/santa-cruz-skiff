import test from 'node:test';
import assert from 'node:assert/strict';
import {rodPoseFromDrag} from '../dist/pixel-fishing-input.js';

test('touching the rod preserves its pose and relative drags adjust both axes without jumping',()=>{
 const pose={elevation:38,azimuth:-45};assert.deepEqual(rodPoseFromDrag(pose,0,0),pose);
 assert.deepEqual(rodPoseFromDrag(pose,50,-35,{width:200,height:140}),{elevation:59.25,azimuth:0});
 assert.deepEqual(rodPoseFromDrag(pose,-1000,1000),{elevation:5,azimuth:-110});assert.deepEqual(rodPoseFromDrag(pose,1000,-1000),{elevation:85,azimuth:110});
 assert.deepEqual(rodPoseFromDrag(pose,NaN,Infinity),pose);
});
