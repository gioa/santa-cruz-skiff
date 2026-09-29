// Tiny static server for development and QA: never caches, so edited modules
// (which no longer carry ?v= strings) are always fresh.   node scripts/serve.mjs [dir] [port]
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'dist'),port=Number(process.argv[3]||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.map':'application/json','.txt':'text/plain','.woff2':'font/woff2','.glb':'model/gltf-binary','.hdr':'application/octet-stream'};
createServer(async(req,res)=>{
 try{
  let file=path.join(root,decodeURIComponent(new URL(req.url,'http://x').pathname));
  if(!file.startsWith(root)){res.writeHead(403).end();return;}
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(await readFile(file));
 }catch{res.writeHead(404).end('not found');}
}).listen(port,()=>console.log(`serving ${root} on http://localhost:${port}`));
