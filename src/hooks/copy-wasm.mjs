import fs from 'fs';
import path from 'path';

const src = 'node_modules/@earthyscience/netcdf4-wasm/dist';
const dest = 'public/';

fs.mkdirSync(dest, { recursive: true });

fs.readdirSync(src)
  .filter(f => f.endsWith('.wasm'))
  .forEach(f => {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
    console.log(`✓ ${f}`);
  });