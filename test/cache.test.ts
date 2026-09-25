// O cache por id existe para uma coisa só: não pagar cota por uma pergunta
// cuja resposta não muda. Só vale se ele não custar exatidão — e é isso que
// este teste guarda. A regra: duas análises seguidas da MESMA caixa têm de dar
// exatamente os mesmos números, com a segunda não lendo quase nada.
// Roda com: npm test
import { strict as assert } from 'node:assert';
import { analyze } from '../src/gmail';

// As retentativas e o ritmo de cota não têm por que atrasar o teste.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((fn: any) => realSetTimeout(fn, 0)) as any;

// localStorage de mentira: em Node ele não existe, e sem ele o cache se
// desliga (é o comportamento correto, e é o que os outros testes exercitam).
// Aqui queremos justamente o caminho COM cache.
const stored = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => stored.get(k) ?? null,
  setItem: (k: string, v: string) => void stored.set(k, v),
  removeItem: (k: string) => void stored.delete(k),
  clear: () => stored.clear(),
  key: () => null,
  length: 0
};

const OWN = 'eu@exemplo.com';
const BROKEN = '9'; // 500 eterno: falha, e falha NÃO se guarda em cache

// A caixa muda entre as análises — é o caso que importa, porque é o que
// acontece de verdade: chega e-mail novo, e-mail antigo vai para a lixeira.
let mailbox: string[] = [];
const reads: Record<string, number> = {};

const senderOf = (id: string) => `s${Number(id) % 3}@exemplo.com`;
const sizeOf = (id: string) => Number(id) * 10;

function jsonRes(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

globalThis.fetch = (async (input: string) => {
  const url = String(input);
  if (url.includes('/profile')) return jsonRes({ emailAddress: OWN });
  if (url.includes('/messages?')) {
    return jsonRes({ messages: mailbox.map((id) => ({ id })) });
  }
  const id = url.split('/messages/')[1]!.split('?')[0]!;
  reads[id] = (reads[id] || 0) + 1;
  if (id === BROKEN) {
    return { ok: false, status: 500, json: async () => ({}) } as unknown as Response;
  }
  return jsonRes({
    payload: { headers: [{ name: 'From', value: `Fulano <${senderOf(id)}>` }] },
    sizeEstimate: sizeOf(id)
  });
}) as typeof fetch;

/** A invariante do app, conferida a cada análise. */
function checkExact(data: Awaited<ReturnType<typeof analyze>>, where: string) {
  const counted = data.offenders.reduce((s, o) => s + o.count, 0);
  assert.equal(
    counted + data.unattributedMessages + data.failedMessages,
    data.mailboxMessages,
    `${where}: remetentes + não atribuídas + falhas tem de dar o total da caixa`
  );
  assert.equal(data.mailboxMessages, mailbox.length, `${where}: total da caixa`);
  // Tamanho por remetente: soma dos tamanhos reais das mensagens dele que
  // estão na caixa. Vindo do cache ou lido agora, tem de dar no mesmo.
  for (const o of data.offenders) {
    const expected = mailbox
      .filter((id) => id !== BROKEN && senderOf(id) === o.sender)
      .reduce((s, id) => s + sizeOf(id), 0);
    assert.equal(o.size, expected, `${where}: tamanho de ${o.sender}`);
  }
}

function readCount(): number {
  return Object.values(reads).reduce((a, b) => a + b, 0);
}

// ---- 1ª análise: caixa fria, lê tudo. ----
mailbox = Array.from({ length: 20 }, (_, i) => String(i));
const first = await analyze();
checkExact(first, '1ª análise');
assert.equal(first.failedMessages, 1, '1ª: só a mensagem quebrada falha');
assert.equal(
  Object.keys(reads).filter((id) => id !== BROKEN).length,
  19,
  '1ª: as 19 mensagens boas são lidas'
);

// ---- 2ª análise: mesma caixa. Nada novo para ler. ----
const readsBefore = readCount();
for (const id of Object.keys(reads)) delete reads[id];
const second = await analyze();
checkExact(second, '2ª análise');

assert.deepEqual(
  Object.keys(reads),
  [BROKEN],
  '2ª: só a que falhou é tentada de novo — falha não entra no cache'
);
assert.ok(readsBefore > readCount(), '2ª análise tem de custar menos que a 1ª');

// O ponto todo: mesmo resultado, sem ler.
assert.deepEqual(
  second.offenders.map((o) => [o.sender, o.count, o.size]),
  first.offenders.map((o) => [o.sender, o.count, o.size]),
  'a 2ª análise tem de dar exatamente os mesmos números que a 1ª'
);
assert.equal(second.uniqueSenders, first.uniqueSenders);
assert.equal(second.failedMessages, 1, '2ª: a quebrada continua falhando');

// ---- 3ª análise: 5 mensagens saíram (lixeira) e 5 chegaram. ----
// Lê SÓ as novas, e as que saíram desaparecem da contagem: o cache se poda
// pela varredura, que é quem sabe o que ainda está na caixa.
mailbox = [...mailbox.slice(5), ...Array.from({ length: 5 }, (_, i) => String(20 + i))];
for (const id of Object.keys(reads)) delete reads[id];
const third = await analyze();
checkExact(third, '3ª análise');

assert.deepEqual(
  Object.keys(reads).sort(),
  ['20', '21', '22', '23', '24', BROKEN].sort(),
  '3ª: lê as 5 que chegaram e retenta a quebrada, nada mais'
);
assert.equal(third.mailboxMessages, 20, '3ª: a caixa continua com 20 mensagens');

// As que foram para a lixeira não podem seguir contadas — era o risco óbvio de
// um cache: mostrar remetente que o usuário já limpou.
const goneIds = ['0', '1', '2', '3', '4'];
for (const o of third.offenders) {
  const inMailbox = mailbox.filter((id) => senderOf(id) === o.sender && id !== BROKEN).length;
  assert.equal(o.count, inMailbox, `3ª: ${o.sender} conta só o que está na caixa`);
}
assert.ok(goneIds.every((id) => !mailbox.includes(id)), 'sanidade do próprio teste');

// E o cache guardado tem exatamente os ids da caixa atual, nem um a mais.
const raw = JSON.parse(stored.get(`msgfacts:v1:${OWN}`)!);
assert.deepEqual(
  Object.keys(raw.msgs).sort(),
  mailbox.filter((id) => id !== BROKEN).sort(),
  'o cache guarda os ids da varredura atual — sem a que falhou, sem as que saíram'
);

console.log(
  `✅ cache: 1ª análise leu ${readsBefore} vezes, 2ª leu ${1}, ` +
    `3ª leu só as 5 novas — mesmos números nas três`
);
