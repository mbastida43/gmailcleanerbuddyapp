// Gera as 3 capturas de tela do app a partir de store/screenshot.html.
//
//   node scripts/make-screenshots.mjs
//
// Mesmo caminho do feature graphic: Chrome instalado em modo headless, sem
// dependencia npm. Defina CHROME_PATH se o seu Chrome estiver em outro lugar.
//
// Tamanho: 393x852 CSS a 3x = 1179x2556 — a proporcao de um celular atual
// (~9:19.5). As tres saem IGUAIS: na Play Store e no site elas aparecem lado a
// lado, e uma com recorte diferente das outras salta aos olhos.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Aponta para o shell, nao para a tela: e ele que fixa os 393px de viewport
// num iframe. Ver o comentario em store/screenshot-frame.html.
const template = resolve(root, 'store/screenshot-frame.html');
const outDir = resolve(root, 'store/screenshots');

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

// CHROME_PATH errado precisa doer: caindo na lista de candidatos, um caminho
// invalido era filtrado em silencio e o script usava outro navegador — a
// variavel existe justamente para NAO usar o padrao.
if (process.env.CHROME_PATH && !existsSync(process.env.CHROME_PATH)) {
  console.error(`CHROME_PATH aponta para um arquivo inexistente: ${process.env.CHROME_PATH}`);
  process.exit(1);
}

const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('Chrome nao encontrado. Defina CHROME_PATH apontando para o executavel.');
  process.exit(1);
}

const WIDTH = 393;
const HEIGHT = 852;
const SCALE = 3;

const SHOTS = [
  { file: '01-login.png', query: 'screen=login' },
  { file: '02-analise.png', query: 'screen=reading' },
  // A lista comeca depois do cabecalho e dos quatro numeros. Rolar ate ela e o
  // que um usuario faria no aparelho — melhor do que esticar a imagem ate
  // caber os 10, que nao e uma tela de celular nenhuma.
  { file: '03-ranking.png', query: 'screen=ranking&scroll=470' },
];

mkdirSync(outDir, { recursive: true });

for (const { file, query } of SHOTS) {
  const out = resolve(outDir, file);
  // Apaga antes: o existsSync la embaixo so prova alguma coisa se o arquivo
  // nao existir de antemao. Com a imagem da rodada anterior no lugar, um
  // Chrome que saisse com codigo 0 sem escrever nada passava por sucesso e a
  // captura velha seguia para o commit.
  rmSync(out, { force: true });

  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    // --window-size em px de CSS; o device-scale-factor multiplica so a saida.
    `--force-device-scale-factor=${SCALE}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--virtual-time-budget=2000',
    `--screenshot=${out}`,
    `${pathToFileURL(template).href}?${query}`,
  ], { stdio: 'ignore' });

  if (!existsSync(out)) {
    console.error(`Falhou ao gerar ${file}`);
    process.exit(1);
  }
  console.log(`ok  store/screenshots/${file}  ${WIDTH * SCALE}x${HEIGHT * SCALE}`);
}

console.log('\nPronto. As mesmas 3 imagens servem a pagina do GitHub Pages e a ficha da Play Store.');
