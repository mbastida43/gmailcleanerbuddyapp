// Empacota o teste trocando src/auth.ts por um stub — o auth de verdade
// importa o plugin nativo do Capacitor, que não existe fora do aparelho.
// (`--alias:` do esbuild só aceita nomes de pacote, não caminhos relativos.)
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Raiz derivada do proprio arquivo, nao do CWD: `node scripts/test.mjs` rodado
// de dentro de qualquer subpasta continua achando o teste.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'node_modules/.cache/progress.test.mjs');

await build({
  entryPoints: [resolve(root, 'test/progress.test.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: OUT,
  plugins: [
    {
      name: 'stub-auth',
      setup(b) {
        b.onResolve({ filter: /^\.\/auth$/ }, () => ({ path: resolve(root, 'test/auth-stub.ts') }));
      }
    }
  ]
});

await import(pathToFileURL(OUT).href);
