// Conversa com 2+ e-mails é lida num threads.get só (10 unidades de cota para
// N e-mails, em vez de 5×N). O que este teste guarda: a viagem é
// compartilhada, a contagem não — cada e-mail ainda conta pelo SEU From.
// Roda com: npm test
import { strict as assert } from 'node:assert';
import { analyze } from '../src/gmail';

const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((fn: any) => realSetTimeout(fn, 0)) as any;

// id → [threadId, remetente]. Na conversa T1 cada e-mail é de alguém
// diferente: contar a conversa pelo primeiro From erraria dois deles.
const MAILBOX: Record<string, [string, string]> = {
  a: ['T1', 'ana@exemplo.com'],
  b: ['T1', 'bia@exemplo.com'],
  c: ['T1', 'ana@exemplo.com'],
  d: ['d', 'davi@exemplo.com'], // sozinha na conversa → messages.get
  g: ['T4', 'gil@exemplo.com'],
  h: ['T4', 'gil@exemplo.com'] // a conversa não a devolve → falha contada
};

const calls: string[] = [];
const msg = (id: string) => ({
  id,
  payload: { headers: [{ name: 'From', value: `X <${MAILBOX[id]![1]}>` }] },
  sizeEstimate: 10
});
const jsonRes = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

globalThis.fetch = (async (input: string) => {
  const url = String(input);
  if (url.includes('/profile')) return jsonRes({ emailAddress: 'eu@exemplo.com' });
  if (url.includes('/messages?')) {
    return jsonRes({ messages: Object.entries(MAILBOX).map(([id, [threadId]]) => ({ id, threadId })) });
  }
  const thread = url.match(/\/threads\/([^?]+)/)?.[1];
  if (thread) {
    calls.push(`thread:${thread}`);
    const ids = Object.keys(MAILBOX).filter((id) => MAILBOX[id]![0] === thread && id !== 'h');
    return jsonRes({ messages: ids.map(msg) });
  }
  const id = url.split('/messages/')[1]!.split('?')[0]!;
  calls.push(`message:${id}`);
  return jsonRes(msg(id));
}) as typeof fetch;

const reading: number[] = [];
const data = await analyze((phase, done) => phase === 'reading' && reading.push(done));

assert.deepEqual(calls.sort(), ['message:d', 'thread:T1', 'thread:T4'], 'uma viagem por conversa');

const count = Object.fromEntries(data.offenders.map((o) => [o.sender, o.count]));
assert.deepEqual(
  count,
  { 'ana@exemplo.com': 2, 'bia@exemplo.com': 1, 'davi@exemplo.com': 1, 'gil@exemplo.com': 1 },
  'cada e-mail conta pelo seu próprio From'
);
assert.equal(data.failedMessages, 1, 'o e-mail que a conversa não trouxe é falha, não some');
const counted = data.offenders.reduce((s, o) => s + o.count, 0);
assert.equal(counted + data.unattributedMessages + data.failedMessages, data.mailboxMessages);
assert.deepEqual(reading, [0, 1, 2, 3, 4, 5, 6], 'o contador sobe de e-mail em e-mail');

console.log(`✅ threads: ${data.mailboxMessages} e-mails em ${calls.length} viagens, contados um a um`);
