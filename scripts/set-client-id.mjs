// Uso: npm run configure -- SEU_CLIENT_ID.apps.googleusercontent.com
// Grava o Web Client ID do Google Cloud em src/config.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientId = process.argv[2];
if (!clientId || !clientId.endsWith('.apps.googleusercontent.com')) {
  console.error('❌ Informe o Client ID completo. Exemplo:');
  console.error('   npm run configure -- 123456-abc.apps.googleusercontent.com');
  process.exit(1);
}

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/config.ts');
const content = readFileSync(configPath, 'utf8');
const updated = content.replace(
  /GOOGLE_WEB_CLIENT_ID =\s*'[^']*'/,
  `GOOGLE_WEB_CLIENT_ID =\n  '${clientId}'`
);
writeFileSync(configPath, updated);
console.log(`✅ GOOGLE_WEB_CLIENT_ID atualizado em src/config.ts: ${clientId}`);
