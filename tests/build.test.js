import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildSite} from '../scripts/build.mjs';

test('the production build bundles each page, fingerprints assets and leaves no broken or versioned references', async () => {
  const out = await mkdtemp(path.join(tmpdir(), 'skiff-build-'));
  try {
    const {metafile} = await buildSite(out, {quiet: true});
    const pages = (await readdir(out)).filter(f => f.endsWith('.html'));
    assert.ok(pages.includes('index.html') && pages.includes('pacifica.html') && pages.includes('half-moon-bay.html'));
    for (const page of pages) {
      const html = await readFile(path.join(out, page), 'utf8');
      assert.doesNotMatch(html, /\.(?:js|css)\?v=/, `${page} still carries a manual version string`);
      for (const [, ref] of html.matchAll(/(?:src|href)="\.\/([^"#?]+\.(?:js|css))"/g)) await access(path.join(out, ref));
      for (const [, ref] of html.matchAll(/<script type="module" src="\.\/([^"]+)"/g)) assert.match(ref, /^js\/[\w-]+-[A-Z0-9]{8}\.js$/, `${page} → ${ref} is fingerprinted`);
    }
    // Beach pages never pull in the Santa Cruz depth grid or seafloor map.
    const pacifica = Object.entries(metafile.outputs).find(([, m]) => m.entryPoint?.endsWith('pacifica-game.js'));
    const reach = new Set(), walk = file => { if (reach.has(file)) return; reach.add(file); for (const i of metafile.outputs[file]?.imports || []) walk(i.path); };
    walk(pacifica[0]);
    const inputs = [...reach].flatMap(f => Object.keys(metafile.outputs[f]?.inputs || {}));
    assert.ok(!inputs.some(i => /bathymetry\.js|pixel-seafloor\.js/.test(i)), 'shore pages stay light');
    await access(path.join(out, 'data/bathymetry.json'));
  } finally { await rm(out, {recursive: true, force: true}); }
});
