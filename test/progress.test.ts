// A promessa do app: o número na tela é o número no Gmail. Este teste guarda a
// aritmética que sustenta isso — cada mensagem da caixa é lida uma vez e
// termina em exatamente um lugar (um remetente, a pilha das sem remetente, ou
// a das que falharam) — e o contador que o usuário vê enquanto isso acontece.
// Roda com: npm test
import { strict as assert } from 'node:assert';
import { analyze, type ProgressPhase } from '../src/gmail';

// O ritmo que segura a cota do Gmail (~45 e-mails/s) não tem por que atrasar o
// teste: ele mede contagem, não tempo. Sem isto, as pausas de ritmo e o recuo
// das retentativas somariam dezenas de segundos de espera ociosa.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((fn: any) => realSetTimeout(fn, 0)) as any;

// Caixa em 3 páginas que SE SOBREPÕEM em 2 ids — a paginação do Gmail repete
// ids na virada de página, e id repetido contado duas vezes é caixa maior do
// que é. Páginas curtas de propósito: o que se testa é a lógica de paginação,
// não o tamanho de página do Gmail.
const PAGE = 60;
const PAGES = 3;
const OVERLAP = 2;
const STRIDE = PAGE - OVERLAP;
// p0: 0..59, p1: 58..117, p2: 116..175 — união 0..175
const MAILBOX = STRIDE * (PAGES - 1) + PAGE;

// Este remetente só existe no FIM da caixa (última página). Enquanto a análise
// lia uma amostra, ele era descoberto por sorte; agora tem de aparecer sempre,
// porque todas as mensagens são lidas.
const OLD_SENDER = 'antigo@exemplo.com';
const OLD_FROM = MAILBOX - PAGE;

// Três destinos possíveis de uma mensagem lida, um id para cada:
const NO_FROM = '7'; // sem cabeçalho From (rascunho, chat) → não atribuída
const JUNK_FROM = '33'; // From que não é endereço → não atribuída
const BROKEN = '13'; // 500 eterno → falha, mesmo depois das retentativas
const FLAKY = '21'; // 429 duas vezes e então OK → NÃO pode se perder

const SENDERS = 12;
const SIZE = 100;

const attempts: Record<string, number> = {};
let senderQueries = 0;

function jsonRes(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}
function errRes(status: number, reason = '') {
  return {
    ok: false,
    status,
    json: async () => ({ error: { errors: [{ reason }], message: 'nope' } })
  } as unknown as Response;
}

globalThis.fetch = (async (input: string) => {
  const url = String(input);

  if (url.includes('/profile')) return jsonRes({ emailAddress: 'eu@exemplo.com' });

  // A análise não faz mais busca por remetente: a leitura já conta tudo. Se
  // alguma voltar, o contador abaixo denuncia.
  if (url.includes('q=from')) {
    senderQueries++;
    return jsonRes({ messages: [] });
  }

  // Varredura: PAGES páginas encadeadas por pageToken, com sobreposição.
  if (url.includes('/messages?')) {
    const token = new URL(url).searchParams.get('pageToken');
    const page = token ? Number(token) : 0;
    return jsonRes({
      messages: Array.from({ length: PAGE }, (_, i) => ({ id: String(page * STRIDE + i) })),
      nextPageToken: page < PAGES - 1 ? String(page + 1) : undefined
    });
  }

  const id = url.split('/messages/')[1]!.split('?')[0]!;
  attempts[id] = (attempts[id] || 0) + 1;

  if (id === BROKEN) return errRes(500);
  if (id === FLAKY && attempts[id]! <= 2) return errRes(429, 'rateLimitExceeded');
  if (id === NO_FROM) return jsonRes({ payload: { headers: [] }, sizeEstimate: SIZE });
  if (id === JUNK_FROM) {
    return jsonRes({ payload: { headers: [{ name: 'From', value: 'sem endereco' }] }, sizeEstimate: SIZE });
  }

  const n = Number(id);
  const from = n >= OLD_FROM ? OLD_SENDER : `r${Math.floor(n / 7) % SENDERS}@exemplo.com`;
  return jsonRes({
    payload: { headers: [{ name: 'From', value: `Fulano <${from}>` }] },
    sizeEstimate: SIZE
  });
}) as typeof fetch;

const seen: Array<{ phase: ProgressPhase; done: number; total: number }> = [];

const data = await analyze((phase, done, total) => seen.push({ phase, done, total }));

// ---- 1) A REGRA: toda mensagem da caixa acaba em exatamente um lugar. ----
// É esta soma que faz o número da tela bater com o do Gmail. Se ela falhar,
// alguma mensagem está sendo contada duas vezes ou desaparecendo em silêncio.
const counted = data.offenders.reduce((s, o) => s + o.count, 0);
assert.equal(
  counted + data.unattributedMessages + data.failedMessages,
  data.mailboxMessages,
  'remetentes + não atribuídas + falhas tem de dar o total da caixa'
);
assert.equal(data.unattributedMessages, 2, 'a sem From e a com From inválido');
assert.equal(data.failedMessages, 1, 'só a que falha para sempre');

// ---- 2) A leitura é a caixa INTEIRA, não uma amostra dela. ----
assert.equal(data.totalMessages, data.mailboxMessages, 'lê-se tudo o que se varre');
assert.equal(data.mailboxMessages, MAILBOX, 'id repetido na virada de página conta uma vez');
assert.equal(data.mailboxCapped, false, 'a varredura chegou ao fim da caixa');

// ---- 3) O 429 não perde mensagem: retenta até passar. ----
// Era o furo silencioso — com a caixa inteira sendo lida, estourar a cota é
// rotina, e cada 429 descartado tirava um e-mail da conta final.
assert.equal(attempts[FLAKY], 3, 'duas recusas por cota e uma que passa');
assert.ok(
  data.offenders.some((o) => o.count > 0 && o.sender === `r${Math.floor(Number(FLAKY) / 7) % SENDERS}@exemplo.com`),
  'a mensagem que tomou 429 tem de estar contada no remetente dela'
);
assert.equal(attempts[BROKEN], 6, 'a que nunca passa é tentada 1 + 5 vezes e desiste');

// ---- 4) Nenhuma busca por remetente: a contagem sai da leitura. ----
assert.equal(senderQueries, 0, 'a fase de contagem por busca não existe mais');

// ---- 5) Tamanho é soma, não extrapolação. ----
for (const o of data.offenders) {
  assert.equal(o.size, o.count * SIZE, `${o.sender}: tamanho é a soma das mensagens dele`);
}

// ---- 6) Quem vive no fim da caixa aparece. ----
assert.ok(
  data.offenders.some((o) => o.sender === OLD_SENDER),
  `${OLD_SENDER} só tem e-mails na última página e precisa estar na lista`
);

// ---- 7) O contador que o usuário vê: um passo por e-mail, fecha no total. ----
const reading = seen.filter((s) => s.phase === 'reading');
assert.deepEqual(
  reading.map((s) => s.done),
  Array.from({ length: MAILBOX + 1 }, (_, i) => i),
  'a contagem sobe de 1 em 1, de 0 até o total'
);
assert.ok(reading.every((s) => s.total === MAILBOX), 'o total não muda durante a leitura');
assert.equal(seen[seen.length - 1]?.phase, 'reading', 'a leitura é a última fase');
assert.equal(seen[seen.length - 1]?.done, MAILBOX, 'e fecha no total cheio');

// A pausa de ritmo é anunciada como 'waiting', não como leitura: parado de
// propósito e travado se parecem na tela se ninguém disser qual é qual.
assert.ok(
  seen.some((s) => s.phase === 'waiting'),
  'segurar o ritmo da cota tem de ser reportado como espera'
);

// ---- 8) A varredura vem primeiro e nunca inventa denominador. ----
assert.equal(seen[0]?.phase, 'scanning', 'a varredura é a primeira fase anunciada');
const scan = seen.filter((s) => s.phase === 'scanning');
assert.ok(scan.every((s) => s.total === 0), 'a varredura não pode inventar denominador');
assert.deepEqual(
  scan.map((s) => s.done),
  [0, PAGE, STRIDE + PAGE, MAILBOX],
  'a varredura reporta o que já achou a cada página, sempre crescendo'
);

console.log(
  `ok — ${MAILBOX} mensagens lidas uma a uma: ${counted} em ${data.uniqueSenders} remetentes, ` +
    `${data.unattributedMessages} sem remetente, ${data.failedMessages} falha`
);
