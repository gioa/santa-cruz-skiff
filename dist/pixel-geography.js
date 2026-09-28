// Pixel-edition wharf: one straight, constant-width deck. Keep the coastal
// geography and GPS projection unchanged; only simplify the playable wharf.
export * from './geography.js?v=20260928-pixel-v80';

export const PIXEL_PIER_BOUNDS=Object.freeze({minX:-30,maxX:24,minZ:-483,maxZ:263});
const {minX,maxX,minZ,maxZ}=PIXEL_PIER_BOUNDS;
export const pierRings=Object.freeze([Object.freeze([
 Object.freeze({x:minX,z:minZ}),Object.freeze({x:maxX,z:minZ}),
 Object.freeze({x:maxX,z:maxZ}),Object.freeze({x:minX,z:maxZ}),
 Object.freeze({x:minX,z:minZ}),
])]);
export function onPier(x,z){return x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ;}
