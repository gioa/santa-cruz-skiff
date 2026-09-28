import {getRigProfile} from './fishing-rigs.js?v=20260928-pixel-v64';

const profile=rig=>getRigProfile(rig);
export const rigHookSize=rig=>profile(rig).hookSize||'—';
export const rigHookLabel=rig=>{const p=profile(rig);return `${p.hookSize||'—'} ${p.hookStyle==='circle'?'圆形钩':'J 型钩'} × ${p.hooks}`;};
