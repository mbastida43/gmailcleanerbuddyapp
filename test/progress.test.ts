// Contador de leitura: o que o usuário vê enquanto espera.
// A regra é uma só — um número, subindo de 1 em 1, que fecha no total e não
// volta. Roda com: npm test
import { strict as assert } from 'node:assert';
import { analyze, type ProgressPhase } from '../src/gmail';

const TOTAL = 1000;
const SENDERS = 12;

// Caixa de 1500 mensagens em 3 páginas — maior que a amostra de 1000, que é o
// caso que interessa: é a diferença entre varrer a caixa e ver só o começo dela.
const PAGE = 500;
const PAGES = 3;
const MAILBOX = PAGE * PAGES;

// As mensagens de índice >= 1000 são as ANTIGAS: ficam fora das 1000 mais
// recentes, que era toda a amostra antiga. Este remetente só existe nelas.
const OLD_SENDER = 'antigo@exemplo.com';

// Mensagens que não rendem remetente também são mensagens LIDAS: a de índice
// 7 volta sem cabeçalho From (o `return` cedo) e a 13 falha na rede (o
// `catch`). Se o contador não passasse pelo finally, o total nunca fecharia.
// Ambas caem na amostra: com passo 1,5 os índices são 0,1,3,4,6,7,9,10,12,13…
const NO_FROM = '7';
const BROKEN = '13';

function jsonRes(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

globalThis.fetch = (async (input: string) => {
  const url = String(input);

  if (url.includes('/profile')) return jsonRes({ emailAddress: 'eu@exemplo.com' });

  // Contagem exata de um remetente (tem q=from:)
  if (url.includes('q=from')) return jsonRes({ messages: [{ id: 'x' }, { id: 'y' }] });

  // Varredura da caixa: PAGES páginas encadeadas por pageToken, e aí acaba.
  // Sem o fim, a varredura só pararia no teto e o teste não veria a caixa
  // inteira — que é o que ele existe para checar.
  if (url.includes('/messages?')) {
    const token = new URL(url).searchParams.get('pageToken');
    const page = token ? Number(token) : 0;
    return jsonRes({
      messages: Array.from({ length: PAGE }, (_, i) => ({ id: String(page * PAGE + i) })),
      nextPageToken: page < PAGES - 1 ? String(page + 1) : undefined
    });
  }

  // Detalhe de uma mensagem
  const id = url.split('/messages/')[1]!.split('?')[0]!;
  if (id === BROKEN) return { ok: false, status: 500, json: async () => ({}) } as unknown as Response;
  if (id === NO_FROM) return jsonRes({ payload: { headers: [] }, sizeEstimate: 10 });
  // Remetente por BLOCO de 40 ids, não por `n % SENDERS`: um passo de amostra
  // fracionário pula índices em progressão (com 1,5 nunca cai em n≡2 mod 3) e,
  // se o remetente também for periódico no índice, os dois períodos batem e o
  // mock "esconde" remetentes por aritmética — defeito do teste, não do app.
  // Caixa de verdade não alterna remetente de mensagem em mensagem.
  const n = Number(id);
  const from = n >= TOTAL ? OLD_SENDER : `r${Math.floor(n / 40) % SENDERS}@exemplo.com`;
  return jsonRes({
    payload: { headers: [{ name: 'From', value: `Fulano <${from}>` }] },
    sizeEstimate: 100
  });
}) as typeof fetch;

const seen: Array<{ phase: ProgressPhase; done: number; total: number }> = [];

const data = await analyze((phase, done, total) => seen.push({ phase, done, total }));

const reading = seen.filter((s) => s.phase === 'reading');

// 1) Um passo por e-mail: 0, 1, 2, … TOTAL — sem pulos e sem repetições.
assert.deepEqual(
  reading.map((s) => s.done),
  Array.from({ length: TOTAL + 1 }, (_, i) => i),
  'a contagem deve subir de 1 em 1, de 0 até o total'
);

// 2) O denominador é sempre o mesmo número: nada de trocar de total no meio.
assert.ok(reading.every((s) => s.total === TOTAL), 'o total não pode mudar durante a leitura');

// 3) A leitura termina anunciando que terminou, no total cheio.
const after = seen.slice(seen.indexOf(reading[reading.length - 1]!) + 1);
assert.equal(after[0]?.phase, 'readDone', 'depois do último e-mail vem o aviso de leitura concluída');
assert.equal(after[0]?.done, TOTAL);

// 4) A fase final e anunciada — e sem numeros. O `every` sozinho passava com
// a lista vazia: apagar o report('ranking') de gmail.ts deixava o teste verde.
assert.ok(
  seen.some((s) => s.phase === 'ranking'),
  'a fase de ranking precisa ser reportada'
);
assert.ok(
  after.slice(1).every((s) => s.phase === 'ranking'),
  'depois da leitura só entram fases sem contador'
);

// 5) A mensagem quebrada é contabilizada como falha, não sumiu da conta.
assert.equal(data.failedMessages, 1);
assert.equal(data.totalMessages, TOTAL);
assert.equal(data.top10.length, 10);

// 6) A varredura vem antes de tudo e não mostra número: é ela que descobre o
// denominador, então não teria o que mostrar.
assert.equal(seen[0]?.phase, 'scanning', 'a varredura é a primeira fase anunciada');
assert.ok(
  seen.filter((s) => s.phase === 'scanning').every((s) => s.done === 0 && s.total === 0),
  'a varredura não reporta contador'
);

// 7) O remetente que só tem e-mails ANTIGOS aparece. Era o buraco: a amostra
// antiga eram as 1000 primeiras da lista, e ele vive da 1000 em diante — nunca
// era descoberto, e contagem exata nenhuma resgata quem não foi descoberto.
// Se a amostra voltar a ser `allIds.slice(0, MAX_ANALYZE)`, esta linha quebra.
assert.ok(
  data.offenders.some((o) => o.sender === OLD_SENDER),
  `${OLD_SENDER} vive só na parte antiga da caixa e precisa entrar na amostra`
);

// 8) Os 12 remetentes recentes continuam todos lá: espalhar a amostra não pode
// custar quem já aparecia. São 12 + o antigo.
assert.equal(data.uniqueSenders, SENDERS + 1);

console.log(
  `ok — ${reading.length} passos de leitura, fecha em ${TOTAL}, ` +
    `${data.uniqueSenders} remetentes de uma caixa de ${MAILBOX}`
);
