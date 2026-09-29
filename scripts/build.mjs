// Production build: bundles each page's modules (shared chunks split out),
// fingerprints JS/CSS with content hashes and rewrites the HTML to point at
// them. `dist/` stays the unbundled source that tests and `npm run dev` use.
//   node scripts/build.mjs [outdir=build]
import {build} from 'esbuild';
import {cp,rm,mkdir,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'dist');
const out=path.resolve(root,process.argv[2]||'build');
const ENTRIES=['pixel-game.js','pacifica-game.js','pixel-locations.js','game.js'];
const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,10);

export async function buildSite(outdir=out,{quiet=false}={}){
 await rm(outdir,{recursive:true,force:true});await mkdir(outdir,{recursive:true});
 // Everything except top-level JS/CSS (those are bundled or fingerprinted below).
 await cp(source,outdir,{recursive:true,filter:file=>{
  const rel=path.relative(source,file);if(!rel)return true;
  return rel.includes(path.sep)||!/\.(js|css)$/.test(rel);
 }});
 const result=await build({
  entryPoints:ENTRIES.map(f=>path.join(source,f)),absWorkingDir:root,
  bundle:true,splitting:true,format:'esm',target:['es2022'],minify:true,sourcemap:'linked',
  outdir:path.join(outdir,'js'),entryNames:'[name]-[hash]',chunkNames:'chunk-[hash]',
  alias:{three:path.join(source,'vendor/three.module.js')},metafile:true,logLevel:quiet?'silent':'warning',
 });
 const entryOutput={},chunkImports={};
 for(const [file,meta]of Object.entries(result.metafile.outputs)){
  if(file.endsWith('.map'))continue;
  const rel=path.relative(outdir,path.join(root,file)).split(path.sep).join('/');
  if(meta.entryPoint)entryOutput[path.basename(meta.entryPoint)]=rel;
  chunkImports[rel]=meta.imports.filter(i=>i.kind==='import-statement').map(i=>path.relative(outdir,path.join(root,i.path)).split(path.sep).join('/'));
 }
 const cssOutput={};
 for(const file of (await readdir(source)).filter(f=>f.endsWith('.css'))){
  const text=await readFile(path.join(source,file),'utf8'),name=`${file.replace(/\.css$/,'')}-${hash(text)}.css`;
  await writeFile(path.join(outdir,name),text);cssOutput[file]=name;
 }
 const preloads=entry=>{const seen=new Set(),walk=f=>{for(const c of chunkImports[f]||[])if(!seen.has(c)){seen.add(c);walk(c);}};walk(entry);return[...seen];};
 const pages=(await readdir(outdir)).filter(f=>f.endsWith('.html'));
 for(const page of pages){
  let html=await readFile(path.join(outdir,page),'utf8');
  html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,'');
  html=html.replace(/(href=")\.\/([\w.-]+\.css)(")/g,(m,a,file,b)=>cssOutput[file]?`${a}./${cssOutput[file]}${b}`:m);
  const links=[];
  html=html.replace(/(<script type="module" src=")\.\/([\w.-]+\.js)(")/g,(m,a,file,b)=>{
   const output=entryOutput[file];if(!output)throw new Error(`${page} loads ${file}, which is not a build entry`);
   for(const chunk of preloads(output))links.push(`<link rel="modulepreload" href="./${chunk}">`);
   return `${a}./${output}${b}`;
  });
  if(links.length)html=html.replace('</head>',[...new Set(links)].join('')+'</head>');
  await writeFile(path.join(outdir,page),html);
 }
 if(!quiet){
  const js=Object.keys(chunkImports);let total=0;for(const f of js)total+=(await stat(path.join(outdir,f))).size;
  console.log(`built ${pages.length} pages, ${js.length} JS files (${Math.round(total/1024)} KB minified) → ${path.relative(root,outdir)}/`);
 }
 return{entryOutput,cssOutput,chunkImports,metafile:result.metafile};
}
if(import.meta.url===`file://${process.argv[1]}`)await buildSite();
