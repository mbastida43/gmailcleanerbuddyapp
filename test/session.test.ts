// A primeira análise de uma caixa grande passa de 1 hora, e o token do Google
// dura 1 hora. A regra que este teste guarda: o token vencer no meio da
// leitura NÃO derruba a análise — renova em silêncio e termina, sem perder
// nenhum e-mail. Roda com: npm test
import { strict as assert } from 'node:assert';
import { analyze } from '../src/gmail';
import { stubAuth } from './auth-stub';

const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((fn: any) => realSetTimeout(fn, 0)) as any;

const TOTAL = 60;
let reads = 0;

function jsonRes(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

globalThis.fetch = (async (input: string, init?: RequestInit) => {
  const url = String(input);
  const auth = String((init?.headers as any)?.Authorization || '');
  // O Google recusa o token velho depois da 25ª leitura: venceu no meio.
  if (auth === 'Bearer fake-token' && reads >= 25) {
    return { ok: false, status: 401, json: async () => ({}) } as unknown as Response;
  }
  if (url.includes('/profile')) return jsonRes({ emailAddress: 'eu@exemplo.com' });
  if (url.includes('/messages?')) {
    return jsonRes({ messages: Array.from({ length: TOTAL }, (_, i) => ({ id: String(i) })) });
  }
  reads++;
  return jsonRes({
    payload: { headers: [{ name: 'From', value: 'x@exemplo.com' }] },
    sizeEstimate: 1
  });
}) as typeof fetch;

// 1) Venceu no meio da leitura: renova e termina com a caixa inteira.
const data = await analyze();
assert.ok(stubAuth.renewals >= 1, 'o token vencido tem de ser renovado');
assert.equal(data.failedMessages, 0, 'nenhum e-mail se perde na troca de token');
assert.equal(data.analyzedMessages, TOTAL);

// 2) Já vencido antes de começar (app parado mais de 1h): renova e segue.
stubAuth.token = null;
const before = stubAuth.renewals;
await analyze();
assert.equal(stubAuth.renewals, before + 1);

// 3) Renovação impossível (saiu da conta, outra conta): aí sim cai, como antes.
stubAuth.token = null;
stubAuth.canRenew = false;
await assert.rejects(analyze(), (err: Error) => err.name === 'UnauthorizedError');

// 4) Tela apagada quando o token vence: NÃO tenta renovar em segundo plano
//    (lá a renovação falhava e dava "sessão expirada"); espera a tela voltar.
const listeners: Array<() => void> = [];
const doc = {
  hidden: true,
  addEventListener: (_: string, fn: () => void) => listeners.push(fn),
  removeEventListener: () => {}
};
(globalThis as any).document = doc;
stubAuth.token = null;
stubAuth.canRenew = true;
const hiddenRenewals = stubAuth.renewals;
let finished = false;
const pending = analyze().then(() => (finished = true));
await new Promise((r) => realSetTimeout(r, 20));
assert.equal(finished, false, 'com a tela apagada a análise espera, não cai');
assert.equal(stubAuth.renewals, hiddenRenewals, 'não renova com a tela apagada');
doc.hidden = false;
listeners.forEach((fn) => fn());
await pending;
assert.equal(stubAuth.renewals, hiddenRenewals + 1);

// 5) A rede some no meio da leitura (tela apagando, troca de Wi-Fi): repete o
//    mesmo pedido e nenhum e-mail se perde.
(globalThis as any).localStorage?.clear?.(); // sem cache: lê tudo de novo
const realFetch = globalThis.fetch;
let drops = 3;
globalThis.fetch = (async (input: string, init?: RequestInit) => {
  if (String(input).includes('format=metadata') && drops-- > 0) throw new TypeError('Failed to fetch');
  return realFetch(input, init);
}) as typeof fetch;
const net = await analyze();
assert.ok(drops < 0, 'a leitura passou pelas quedas de rede');
assert.equal(net.failedMessages, 0, 'queda de rede não perde e-mail');
assert.equal(net.analyzedMessages, TOTAL);

console.log('ok — token vencido renova, tela apagada espera, rede caída repete: 5 casos');
