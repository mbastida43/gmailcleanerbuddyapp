// Contador de leitura: o que o usuário vê enquanto espera.
// A regra é uma só — um número, subindo de 1 em 1, que fecha no total e não
// volta. Roda com: npm test
import { strict as assert } from 'node:assert';
import { analyze, type ProgressPhase } from '../src/gmail';

const TOTAL = 1000;
const SENDERS = 12;

// Mensagens que não rendem remetente também são mensagens LIDAS: a de índice
// 7 volta sem cabeçalho From (o `return` cedo) e a 13 falha na rede (o
// `catch`). Se o contador não passasse pelo finally, o total nunca fecharia.
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

  // Listagem da amostra: duas páginas de 500
  if (url.includes('/messages?')) {
    const page = url.includes('pageToken') ? 1 : 0;
    return jsonRes({
      messages: Array.from({ length: 500 }, (_, i) => ({ id: String(page * 500 + i) })),
      nextPageToken: 'next'
    });
  }

  // Detalhe de uma mensagem
  const id = url.split('/messages/')[1]!.split('?')[0]!;
  if (id === BROKEN) return { ok: false, status: 500, json: async () => ({}) } as unknown as Response;
  if (id === NO_FROM) return jsonRes({ payload: { headers: [] }, sizeEstimate: 10 });
  return jsonRes({
    payload: { headers: [{ name: 'From', value: `Fulano <r${Number(id) % SENDERS}@exemplo.com>` }] },
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

console.log(`ok — ${reading.length} passos de leitura, fecha em ${TOTAL}, ${data.uniqueSenders} remetentes`);
