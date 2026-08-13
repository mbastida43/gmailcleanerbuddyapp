// A trava que impede o usuário de mandar a própria caixa de enviados para a
// lixeira. Como a análise lista os enviados, o endereço do próprio dono
// costuma liderar o ranking — se esta trava falhar, "Limpar Tudo" varre a
// correspondência enviada dele.
//
// A regra que este teste protege: quando não dá para saber QUAL conta
// proteger, a limpeza recusa. Falha fechada, nunca aberta. Roda com: npm test
import { strict as assert } from 'node:assert';
import { clean } from '../src/gmail';

const OWN = 'eu@exemplo.com';
const OTHER = 'newsletter@exemplo.com';

let profileOk = true;
let modifyCalls = 0;

function jsonRes(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

globalThis.fetch = (async (input: string, init?: RequestInit) => {
  const url = String(input);

  if (url.includes('/profile')) {
    if (!profileOk) {
      return { ok: false, status: 500, json: async () => ({}) } as unknown as Response;
    }
    return jsonRes({ emailAddress: OWN });
  }

  if (url.includes('/messages/batchModify')) {
    modifyCalls++;
    return jsonRes({});
  }

  // Listagem por remetente: uma página, duas mensagens
  if (url.includes('q=from')) {
    return jsonRes({ messages: [{ id: 'a' }, { id: 'b' }] });
  }

  throw new Error('URL inesperada no teste: ' + url + ' ' + (init?.method || ''));
}) as typeof fetch;

async function rejectsWith(p: Promise<unknown>, message: string): Promise<void> {
  await assert.rejects(p, (err: Error) => {
    assert.equal(err.message, message);
    return true;
  });
}

// 1) /profile fora do ar: a trava não sabe o que proteger e RECUSA.
//    Este é o caso que regrediu uma vez — getOwnEmail devolvia '' e a
//    comparação virava sempre falsa, liberando geral.
//    A ordem importa: falha não é cacheada, então este vem antes.
profileOk = false;
await rejectsWith(clean(OTHER), 'own_address_unknown');
assert.equal(modifyCalls, 0, 'nada pode ser movido quando a trava não sabe o que proteger');

// 2) /profile de volta: o próprio endereço segue recusado.
profileOk = true;
await rejectsWith(clean(OWN), 'own_address');
assert.equal(modifyCalls, 0, 'o próprio endereço nunca é movido');

// 3) Caminho normal: outro remetente é limpo.
const res = await clean(OTHER);
assert.equal(res.removed, 2);
assert.equal(res.failed, 0);
assert.equal(modifyCalls, 1);

// 4) Variação de caixa e espaço não driblam a trava.
await rejectsWith(clean('  EU@Exemplo.COM  '.trim()), 'own_address');

console.log('ok — trava do próprio endereço falha fechada, 4 casos');
