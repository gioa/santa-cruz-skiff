// Data files live in ./data beside the pages. Bundled code is not next to them,
// so browsers resolve against the page; Node (tests, scripts) uses this file.
const base=()=>typeof document!=='undefined'&&document.baseURI?document.baseURI:import.meta.url;
export const siteUrl=path=>new URL(path,base());
export const dataUrl=name=>siteUrl(`./data/${name}`);
export const loadData=(name,message)=>fetch(dataUrl(name)).then(r=>{if(!r.ok)throw Error(message||`${name} unavailable`);return r.json();});
