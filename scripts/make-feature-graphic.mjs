// Gera os feature graphics 1024x500 da Play Store a partir de
// store/feature-graphic.html, um por idioma da ficha.
//
//   node scripts/make-feature-graphic.mjs
//
// Usa o Chrome instalado em modo headless — nao precisa de dependencia npm.
// Defina CHROME_PATH se o seu Chrome estiver em outro lugar.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = resolve(root, 'store/feature-graphic.html');
const outDir = resolve(root, 'store/feature-graphics');

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('Chrome nao encontrado. Defina CHROME_PATH apontando para o executavel.');
  process.exit(1);
}

const LOCALES = ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'it-IT', 'ru-RU', 'zh-CN'];

mkdirSync(outDir, { recursive: true });

for (const lang of LOCALES) {
  const out = resolve(outDir, `feature-${lang}.png`);
  const url = `${pathToFileURL(template).href}?lang=${lang}`;

  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1024,500',
    `--screenshot=${out}`,
    url,
  ], { stdio: 'ignore' });

  if (!existsSync(out)) {
    console.error(`Falhou ao gerar ${lang}`);
    process.exit(1);
  }
  console.log(`ok  store/feature-graphics/feature-${lang}.png`);
}

console.log('\nPronto. Suba cada arquivo na ficha do idioma correspondente no Play Console.');
