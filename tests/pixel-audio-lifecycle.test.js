import test from 'node:test';
import assert from 'node:assert/strict';
import {bindAudioLifecycle} from '../dist/pixel-audio-lifecycle.js';

test('tab, BFCache and ordinary touch returns all retry, even after an already-visible resume',()=>{
  const page=new EventTarget(),doc=new EventTarget(),calls=[];doc.hidden=false;
  const dispose=bindAudioLifecycle({setPaused:value=>calls.push(value)},{page,document:doc});
  assert.deepEqual(calls,[],'binding never starts audio before playing');
  page.dispatchEvent(new Event('pagehide'));page.dispatchEvent(new Event('pageshow'));
  page.dispatchEvent(new Event('blur'));page.dispatchEvent(new Event('focus'));
  doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));doc.dispatchEvent(new Event('pointerdown'));
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));
  for(const type of ['pointerdown','touchend','keydown','click'])doc.dispatchEvent(new Event(type));
  assert.deepEqual(calls,[true,false,true,false,true,false,false,false,false,false]);
  dispose();page.dispatchEvent(new Event('blur'));doc.dispatchEvent(new Event('click'));
  assert.equal(calls.length,10);
});
