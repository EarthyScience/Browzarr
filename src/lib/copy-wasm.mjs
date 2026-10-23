import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const src = 'node_modules/@earthyscience/netcdf4-wasm/dist';
const dest = 'public/';

fs.mkdirSync(dest, { recursive: true });

fs.readdirSync(src)
  .filter(f => f.endsWith('.wasm'))
  .forEach(f => {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
    console.log(`✓ ${f}`);
  });

// Patch the invalid syntax in the gribberish WASM loader if it is installed
try {
  const require = createRequire(import.meta.url);
  const loaderPath = require.resolve('@mattnucc/gribberish-wasm32-wasi/gribberish-js.wasm32-wasi.wasm_.loader.mjs');
  if (fs.existsSync(loaderPath)) {
    let content = fs.readFileSync(loaderPath, 'utf8');
    if (content.includes('import { thread-spawn } from "wasi";')) {
      content = content.replace(
        'import { thread-spawn } from "wasi";',
        '/* import { thread-spawn } from "wasi"; */'
      );
      fs.writeFileSync(loaderPath, content, 'utf8');
      console.log('✓ patched @mattnucc/gribberish-wasm32-wasi loader syntax error');
    }
  }
} catch (e) {
  console.log('⚠ skipped gribberish WASM loader patching (package not installed or already patched)');
}