// Gera os icones do app a partir de store/icon-art.svg.
//
//   node scripts/make-icons.mjs
//
// Escreve os 20 PNGs de android/app/src/main/res/mipmap-* e o icone 512x512
// da ficha da Play. Para trocar o icone: edite store/icon-art.svg (e a cor
// --brand no store/icon.html, se mudar a paleta) e rode de novo.
//
// Usa o Chrome instalado em modo headless — nao precisa de dependencia npm.
// Defina CHROME_PATH se o seu Chrome estiver em outro lugar.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = resolve(root, 'store/icon.html');
const resDir = resolve(root, 'android/app/src/main/res');

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

if (!existsSync(resolve(root, 'store/icon-art.svg'))) {
  console.error('Falta store/icon-art.svg — e dele que os icones sao gerados.');
  process.exit(1);
}

// Tamanhos que o Android espera por densidade. O icone legado (ic_launcher e
// ic_launcher_round) e menor que as camadas do adaptativo porque estas ultimas
// sao cortadas pela mascara do launcher: 108dp desenhados para 72dp visiveis.
const DENSITIES = [
  { dir: 'mipmap-mdpi',    legacy: 48,  adaptive: 108 },
  { dir: 'mipmap-hdpi',    legacy: 72,  adaptive: 162 },
  { dir: 'mipmap-xhdpi',   legacy: 96,  adaptive: 216 },
  { dir: 'mipmap-xxhdpi',  legacy: 144, adaptive: 324 },
  { dir: 'mipmap-xxxhdpi', legacy: 192, adaptive: 432 },
];

// Chrome headless tem largura minima de janela (~500px): pedir --window-size=48
// nao encolhe a pagina, renderiza no minimo e corta o resto. Entao a pagina e
// sempre montada em 512x512 e quem reduz e o device-scale-factor, que multiplica
// o raster de saida. 512 e potencia de dois e todos os alvos dividem exato, sem
// arredondamento.
const BASE = 512;

function shoot(mode, size, out) {
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--force-device-scale-factor=${size / BASE}`,
    // fundo transparente: e o que deixa os cantos de fora do circulo vazados
    '--default-background-color=00000000',
    `--window-size=${BASE},${BASE}`,
    `--screenshot=${out}`,
    `${pathToFileURL(template).href}?mode=${mode}`,
  ], { stdio: 'ignore' });

  if (!existsSync(out)) {
    console.error(`Falhou ao gerar ${out}`);
    process.exit(1);
  }
}

for (const { dir, legacy, adaptive } of DENSITIES) {
  shoot('legacy', legacy,   resolve(resDir, dir, 'ic_launcher.png'));
  shoot('round',  legacy,   resolve(resDir, dir, 'ic_launcher_round.png'));
  shoot('fg',     adaptive, resolve(resDir, dir, 'ic_launcher_foreground.png'));
  shoot('bg',     adaptive, resolve(resDir, dir, 'ic_launcher_background.png'));
  console.log(`ok  ${dir}  (${legacy}px legado, ${adaptive}px adaptativo)`);
}

// Icone da ficha da Play: 512x512.
shoot('legacy', 512, resolve(root, 'store/icon-512.png'));
console.log('ok  store/icon-512.png');

console.log('\nPronto. Rode `npm run build:apk` para ver o icone novo no aparelho.');
