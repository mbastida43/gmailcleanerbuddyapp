// A paginação do Gmail repete ids na virada de página. Enquanto a contagem
// somava o TAMANHO de cada página, o id repetido era contado duas vezes: o
// número na tela ficava maior do que a busca do Gmail mostrava, e maior do que
// o que o botão de limpar de fato move. Só aparecia acima de 500 mensagens —
// abaixo disso existe uma página só e não há virada.
//
// A regra que este teste protege: id repetido conta uma vez. Roda com: npm test
import { strict as assert } from 'node:assert';
import { clean } from '../src/gmail';

const OWN = 'eu@exemplo.com';
const SENDER = 'newsletter@exemplo.com';

// 'c' vem nas DUAS páginas — é a repetição que inflava o número.
const PAGE_1 = ['a', 'b', 'c'];
const PAGE_2 = ['c', 'd'];
const UNIQUE = 4;

let movedIds: string[] = [];

function jsonRes(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

globalThis.fetch = (async (input: string, init?: RequestInit) => {
  const url = String(input);

  if (url.includes('/profile')) return jsonRes({ emailAddress: OWN });

  if (url.includes('/messages/batchModify')) {
    movedIds = movedIds.concat(JSON.parse(String(init?.body)).ids);
    return jsonRes({});
  }

  if (url.includes('q=from')) {
    const second = url.includes('pageToken=');
    return jsonRes({
      messages: (second ? PAGE_2 : PAGE_1).map((id) => ({ id })),
      ...(second ? {} : { nextPageToken: 'p2' })
    });
  }

  throw new Error('URL inesperada no teste: ' + url);
}) as typeof fetch;

const { removed, failed } = await clean(SENDER);

assert.equal(failed, 0);
assert.equal(removed, UNIQUE, 'id repetido nas duas páginas conta uma vez só');
assert.equal(
  new Set(movedIds).size,
  movedIds.length,
  'a chamada de mover não pode levar o mesmo id duas vezes'
);

console.log('✅ duplicate-ids: contagem e limpeza ignoram ids repetidos');
