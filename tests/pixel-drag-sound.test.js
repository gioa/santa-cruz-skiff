import test from 'node:test';
import assert from 'node:assert/strict';
import {dragToothSamples} from '../dist/pixel-drag-sound.js';

test('approved sharp tooth is finite, bounded and fully decays at common audio rates',()=>{
 for(const rate of [8000,44100,48000,96000]){
  const a=dragToothSamples(rate,()=>.5);
  assert.equal(a.length,Math.ceil(rate*.04));
  assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<.1));
  assert.ok(a.some(v=>Math.abs(v)>.005));
  assert.ok(a.slice(Math.ceil(rate*.03)).every(v=>v===0));
 }
});

test('tooth has high metallic resonances rather than the previous low-pitched knock',()=>{
 const rate=48000,a=dragToothSamples(rate,()=>.5);
 const energy=f=>{let re=0,im=0;for(let i=0;i<a.length;i++){const phase=2*Math.PI*f*i/rate;re+=a[i]*Math.cos(phase);im+=a[i]*Math.sin(phase);}return re*re+im*im;};
 const primary=440*2**((110.6-69)/12),upper=440*2**((120.4-69)/12);
 assert.ok(energy(primary)>energy(1100)*100);
 assert.ok(energy(upper)>energy(1100)*20);
});
