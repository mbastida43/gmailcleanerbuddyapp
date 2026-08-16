// ============================================================
// Camada Gmail — porta da lógica do servidor Express (src/server.ts do
// projeto web) para chamadas diretas à REST API do Gmail com Bearer token.
// Mantém a mesma semântica validada no app web:
// - amostra de 1000 mensagens ESPALHADAS pela caixa (ids varridos inteiros,
//   metadado só das 1000 sorteadas) — descobre quem são os remetentes
// - contagem EXATA (busca from:"..." na conta inteira) para cada um deles
// - limpeza via batchModify (até 1000 ids/chamada, TRASH + remove INBOX)
//   com fallback para messages.trash individual
// ============================================================

import { getAccessToken } from './auth';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Quantas mensagens têm o cabeçalho From lido. É o teto CARO: uma chamada por
// mensagem. Mantido em 1000 — o que mudou foi de ONDE essas 1000 saem.
const MAX_ANALYZE = 1000;

// Teto da varredura de ids: 500 por chamada, então 100 páginas = 50.000
// mensagens. Essa parte é barata (ids sem metadado), mas é sequencial — o
// pageToken encadeia — e cada página custa ~200ms. 100 páginas é o ponto em que
// a espera ainda cabe numa análise. Acima de 50.000, a amostra se espalha pelas
// 50.000 mais recentes em vez da caixa toda: continua muito melhor do que as
// 1.000 mais recentes, só não é a caixa inteira.
const MAX_SCAN_PAGES = 100;

// Contagem exata para TODOS os remetentes descobertos, não só para os
// campeões da amostra. Quem escreve uma vez por mês aparecia com contagem 1 e
// afundava para a centésima posição, mesmo tendo dezenas de e-mails na conta
// inteira. Era o caso do groups-noreply@linkedin.com: 1 na amostra, 17 no
// total. Com o limite em 25 ele nunca chegava a ser contado.
// O teto abaixo é só uma trava contra caixas com milhares de remetentes
// distintos, não um ranking.
const EXACT_COUNT_LIMIT = 500;

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'UnauthorizedError';
  }
}

/** Falha da API do Gmail que NÃO se resolve refazendo o login. */
export class GmailApiError extends Error {
  status: number;
  reason: string;
  constructor(status: number, reason: string, message: string) {
    super(message || reason || `gmail_api_${status}`);
    this.name = 'GmailApiError';
    this.status = status;
    this.reason = reason;
  }
}

// Únicos motivos de 403 que significam mesmo "credencial inválida". Os outros
// 403 do Gmail — escopo não concedido (insufficientPermissions), API do Gmail
// desativada no projeto (accessNotConfigured), quota estourada — não melhoram
// com um login novo. Mandar reautenticar nesses casos cria um beco sem saída:
// o usuário entra, toma 403 na primeira chamada e é chutado de volta.
const AUTH_REASONS = new Set(['authError', 'unauthorized', 'invalidCredentials']);

/** Extrai reason/message do corpo de erro padrão das APIs do Google. */
async function readApiError(res: Response): Promise<{ reason: string; message: string }> {
  try {
    const body = await res.json();
    const err = body?.error;
    const first = Array.isArray(err?.errors) ? err.errors[0] : null;
    return {
      reason: String(first?.reason || err?.status || ''),
      message: String(err?.message || '')
    };
  } catch {
    return { reason: '', message: '' };
  }
}

export interface Offender {
  /** Endereço completo do remetente — a unidade de contagem e de limpeza. */
  sender: string;
  /** Só o host, para exibir ao lado. Remetentes NÃO são agrupados por ele:
   *  o LinkedIn, por exemplo, escreve de groups-noreply@, jobs-noreply@,
   *  messages-noreply@ e outros, e cada um é uma linha independente. */
  domain: string;
  count: number;
  sampleCount: number;
  size: number;
  category: string;
  isProtected: boolean;
  /** true quando `count` veio da busca na conta inteira; false quando é só
   *  a contagem da amostra (acontece se a contagem exata falhar). */
  exact: boolean;
}

/**
 * 'scanning' = varrendo os ids da caixa, antes de existir denominador. Ela vem
 * ANTES de 'reading' e é a única fase sem total conhecido — é justamente ela
 * que descobre o tamanho da caixa. Sem esta fase o overlay ficava mudo por
 * ~20s numa caixa grande, que é a cara de um app travado.
 *
 * 'reading' = trabalhando; 'waiting' = parado de propósito, segurando o ritmo
 * para não estourar a cota do Gmail. A interface precisa distinguir os dois,
 * senão a pausa passa por travamento.
 *
 * 'readDone' = a leitura da caixa fechou em N/N; 'ranking' = fase final, SEM
 * números. A contagem N/1000 é a leitura da caixa e só ela: quando
 * reiniciávamos o contador aqui com o total de remetentes (0/342 logo depois
 * de 1000/1000), quem esperava lia como "a análise recomeçou". Um número só,
 * uma vez, até o fim — e um aviso explícito de que ele acabou.
 */
export type ProgressPhase = 'scanning' | 'reading' | 'waiting' | 'readDone' | 'ranking';
export type ProgressFn = (phase: ProgressPhase, done: number, total: number) => void;

export interface AnalyzeData {
  /** Tamanho da amostra — quantas mensagens tiveram o cabeçalho From lido. */
  totalMessages: number;
  analyzedMessages: number;
  failedMessages: number;
  uniqueSenders: number;
  /**
   * Mensagens na conta, no escopo que o app trata (com Spam, sem Lixeira). Sai
   * de graça da varredura de ids, que já precisa percorrer tudo.
   */
  mailboxMessages: number;
  /**
   * true quando a varredura parou no teto (MAX_SCAN_PAGES) em vez de no fim da
   * caixa — aí `mailboxMessages` é um piso, não o total, e a interface precisa
   * dizer "50.000+". Mostrar o número redondo como se fosse exato seria
   * exatamente o tipo de precisão inventada que este app existe para não fazer.
   */
  mailboxCapped: boolean;
  offenders: Offender[];
  top10: Offender[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function gfetch(path: string, init: RequestInit = {}): Promise<any> {
  const token = getAccessToken();
  if (!token) throw new UnauthorizedError();

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const { reason, message } = await readApiError(res);
    if (res.status === 401 || (res.status === 403 && AUTH_REASONS.has(reason))) {
      throw new UnauthorizedError();
    }
    throw new GmailApiError(res.status, reason, message);
  }
  if (res.status === 204) return null;
  return res.json();
}

const MAX_SENDER_PAGES = 50;

/**
 * A consulta por remetente — uma só, usada pela contagem E pela limpeza.
 * Enquanto eram duas, divergiram: a contagem excluía Spam/Lixeira e a limpeza
 * os incluía, então o app sempre movia mais do que tinha mostrado.
 *
 * Escopo: tudo, INCLUSIVE Spam — menos o que já está na Lixeira.
 *
 * O `includeSpamTrash` traz Spam junto, que é o que se quer varrer. Mas ele
 * traria a Lixeira também, e aí um remetente já limpo continuaria pesando no
 * ranking com o mesmo número — para sempre, já que suas mensagens seguem
 * existindo na lixeira por 30 dias. O `-in:trash` corta essa parte: sobra
 * exatamente o que ainda ocupa a caixa e o que o botão de limpar vai mover.
 *
 * Equivalente conferível na busca do Gmail: from:"..." in:anywhere -in:trash
 *
 * As aspas em volta do endereço evitam injeção de operadores de busca.
 */
function buildSenderQuery(sender: string, fields: string): URLSearchParams {
  return new URLSearchParams({
    q: `from:"${sender}" -in:trash`,
    maxResults: '500',
    includeSpamTrash: 'true',
    fields
  });
}

export function validateSender(sender: unknown): sender is string {
  return typeof sender === 'string' && /^[a-zA-Z0-9@._%+-]{3,254}$/.test(sender);
}

/** Host do endereço — só para exibição, nunca para agrupar. */
function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at > 0 ? email.slice(at + 1) : email;
}

export async function getProfile(): Promise<{ email: string }> {
  const data = await gfetch('/profile');
  return { email: data.emailAddress };
}

// Cache do endereço próprio, chaveado pelo token. clean() consulta o perfil a
// cada chamada (é a trava que impede limpar a própria conta) — com o botão
// "Limpar Tudo" percorrendo centenas de remetentes, isso virava centenas de
// buscas do mesmo perfil, que não muda. Chavear pelo token faz o cache se
// invalidar sozinho ao trocar de conta: token novo, perfil novo. Sem isso a
// trava protegeria o endereço da conta ANTERIOR — falha de segurança, não só
// de desempenho.
let ownEmailCache: { token: string; email: string } | null = null;

/**
 * Endereço da conta logada, em minúsculas. Falha não é cacheada: a próxima
 * chamada tenta de novo.
 *
 * `required` decide o que fazer quando o /profile falha, e a diferença importa:
 *
 * - análise (`false`): devolve '' e segue. Um erro transitório aqui não pode
 *   derrubar a leitura inteira da caixa; o custo é só o cadeado não aparecer.
 * - limpeza (`true`): lança. Ali o endereço é a trava que impede o usuário de
 *   mandar a própria caixa de enviados para a lixeira, e trava que não sabe o
 *   que proteger tem de recusar, nunca liberar.
 */
async function getOwnEmail(required = false): Promise<string> {
  const token = getAccessToken();
  if (!token) throw new UnauthorizedError();
  if (ownEmailCache && ownEmailCache.token === token) return ownEmailCache.email;

  try {
    const profile = await getProfile();
    const email = (profile.email || '').trim().toLowerCase();
    // Perfil sem endereço é resposta inesperada, não conta como sucesso: sem
    // isso o '' seria cacheado e desligaria a trava por uma hora inteira.
    if (!email) throw new Error('empty_profile_email');
    ownEmailCache = { token, email };
    return email;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (required) throw new Error('own_address_unknown');
    return '';
  }
}

export async function analyze(onProgress?: ProgressFn): Promise<AnalyzeData> {
  const report: ProgressFn = onProgress || (() => {});

  // A listagem abaixo não filtra por pasta, então traz também os enviados —
  // por isso o próprio dono da conta costuma liderar a lista. Ele permanece
  // visível (sumir sem explicação seria pior), mas marcado como isProtected
  // para a interface desabilitar o botão de limpar.
  const ownEmail = await getOwnEmail();

  // 1) Varredura: ids da caixa INTEIRA, sem metadado nenhum.
  //
  // Mesmo escopo de buildSenderQuery — inclui Spam, exclui a Lixeira — para que
  // a descoberta enxergue exatamente o universo que a contagem conta e o botão
  // limpa. Enquanto a listagem aqui ignorava o Spam, um remetente que só caía
  // lá jamais era descoberto, embora fosse contado e limpo normalmente se
  // chegasse à lista por outro caminho.
  report('scanning', 0, 0);
  // Set, não array: a paginação do Gmail repete ids na virada de página, e id
  // repetido aqui vira mensagem contada duas vezes — caixa maior do que é.
  const seenIds = new Set<string>();
  let pageToken: string | undefined;
  let scanned = 0;
  do {
    const q = new URLSearchParams({
      q: '-in:trash',
      maxResults: '500',
      includeSpamTrash: 'true',
      fields: 'messages/id,nextPageToken'
    });
    if (pageToken) q.set('pageToken', pageToken);
    const resp = await gfetch(`/messages?${q.toString()}`);
    for (const m of (resp.messages || []) as Array<{ id: string }>) seenIds.add(m.id);
    pageToken = resp.nextPageToken;
    scanned++;
  } while (pageToken && scanned < MAX_SCAN_PAGES);

  // Sobrou pageToken = paramos no teto, não no fim da caixa.
  const mailboxCapped = !!pageToken;
  const allIds = [...seenIds];

  // 2) Amostra ESPALHADA pela caixa toda, não as 1000 mais recentes.
  //
  // A amostra antiga era o começo da lista — algo como 60 dias de caixa. Quem
  // despejou 500 e-mails e parou de escrever há dois anos simplesmente não
  // existia no ranking: não era contagem errada, era remetente ausente, e
  // nenhuma contagem exata resgata quem nunca foi descoberto.
  //
  // Pegando 1 a cada N ao longo da lista inteira, a chance de descobrir um
  // remetente cresce com o tamanho dele — que é exatamente o critério do app.
  // Numa caixa de 40 mil, N=40: quem tem 500 e-mails aparece praticamente
  // sempre, e quem tem 3 quase nunca. É a troca certa aqui, porque quem tem 3
  // e-mails nunca foi o problema de ninguém. O passo é fracionário de
  // propósito: arredondá-lo para baixo amontoaria a amostra no início da lista,
  // que é o viés de recência que estamos tirando.
  const step = Math.max(1, allIds.length / MAX_ANALYZE);
  const toAnalyze: string[] = [];
  for (let i = 0; toAnalyze.length < MAX_ANALYZE; i++) {
    const idx = Math.floor(i * step);
    if (idx >= allIds.length) break;
    toAnalyze.push(allIds[idx]!);
  }

  // 3) Remetente de cada mensagem (em lotes paralelos)
  const senderCounts: Record<string, number> = {};
  const senderSizes: Record<string, number> = {};
  const senderCategories: Record<string, string> = {};
  let failedMessages = 0;

  // Um passo por E-MAIL, não por lote de 25. O contador é o número real de
  // mensagens já lidas: sobe uma a uma conforme cada resposta chega, e o
  // último incremento escreve 1000. Antes ele era reportado ANTES do lote, ia
  // de 0 a 975 aos pulos e a fase terminava sem nunca escrever 1000 — o
  // usuário esperava por um número que não vinha.
  const BATCH_SIZE = 25;
  let read = 0;
  report('reading', 0, toAnalyze.length);
  for (let i = 0; i < toAnalyze.length; i += BATCH_SIZE) {
    const batch = toAnalyze.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (id) => {
        try {
          const details = await gfetch(
            `/messages/${id}?format=metadata&metadataHeaders=From&fields=payload/headers,sizeEstimate`
          );
          const headers: Array<{ name?: string; value?: string }> =
            details.payload?.headers || [];
          const fromHeader = headers.find((h) => h.name === 'From');
          if (!fromHeader?.value) return;

          const emailMatch =
            fromHeader.value.match(/<(.+?)>/) ||
            fromHeader.value.match(/([^\s]+@[^\s]+)/);
          const raw = emailMatch ? emailMatch[1] : fromHeader.value;
          const senderEmail = String(raw).trim().toLowerCase();
          if (!validateSender(senderEmail)) return;

          senderCounts[senderEmail] = (senderCounts[senderEmail] || 0) + 1;
          senderSizes[senderEmail] =
            (senderSizes[senderEmail] || 0) + (details.sizeEstimate || 0);
          if (!senderCategories[senderEmail]) {
            senderCategories[senderEmail] = categorizeSender(senderEmail);
          }
        } catch (err) {
          if (err instanceof UnauthorizedError) throw err;
          failedMessages++;
        } finally {
          // No finally: os `return` acima (sem cabeçalho From, remetente
          // inválido) também são mensagens lidas. Fora daqui, elas sumiriam
          // da contagem e o total nunca fecharia.
          report('reading', ++read, toAnalyze.length);
        }
      })
    );
  }

  // Batida de "acabou" antes de sair da fase: sem ela, o 1000/1000 é
  // substituído no mesmo quadro pela fase seguinte e ninguém vê a leitura
  // terminar — que é justamente o momento que o usuário está esperando.
  // Um segundo parado dentro de uma análise de ~1min paga esse aviso.
  report('readDone', toAnalyze.length, toAnalyze.length);
  await sleep(1000);

  const offenders: Offender[] = Object.keys(senderCounts).map((email) => ({
    sender: email,
    domain: domainOf(email),
    count: senderCounts[email],
    sampleCount: senderCounts[email],
    size: senderSizes[email] || 0,
    category: senderCategories[email],
    isProtected: !!ownEmail && email === ownEmail,
    exact: false
  }));
  offenders.sort((a, b) => b.count - a.count);

  // 4) Contagem exata (conta inteira) para todos os remetentes descobertos.
  // Concorrência e pausa calibradas pela cota do Gmail (250 unidades por
  // segundo por usuário; cada busca custa 5): ~20 req/s = ~100 unidades/s,
  // com folga confortável.
  const toCount = offenders.slice(0, EXACT_COUNT_LIMIT);
  const CONCURRENCY = 8;
  const PAUSE_MS = 150;
  // PERCENTUAL, não um segundo contador. O total daqui (remetentes) é conhecido
  // desde o início, então esconder o progresso era esconder informação que
  // existia. O que não podia voltar era o CONTADOR: 0/342 logo depois de
  // 1000/1000 lia-se como "a análise recomeçou". 0% → 100% não se confunde com
  // a contagem de e-mails, é outra unidade na tela.
  let counted = 0;
  if (toCount.length > 0) report('ranking', 0, toCount.length);
  for (let i = 0; i < toCount.length; i += CONCURRENCY) {
    const batch = toCount.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (item) => {
        try {
          item.count = await countMessagesFrom(item.sender);
          item.exact = true;
        } catch (err) {
          if (err instanceof UnauthorizedError) throw err;
          // mantém a contagem da amostra como fallback
        } finally {
          // No finally: remetente que falhou também já foi tentado. Fora daqui,
          // a barra pararia antes de 100% sempre que uma contagem falhasse.
          counted++;
        }
      })
    );
    report('ranking', counted, toCount.length);
    if (i + CONCURRENCY < toCount.length) {
      await sleep(PAUSE_MS);
    }
  }

  offenders.sort((a, b) => b.count - a.count);

  return {
    totalMessages: toAnalyze.length,
    analyzedMessages: toAnalyze.length - failedMessages,
    failedMessages,
    uniqueSenders: offenders.length,
    mailboxMessages: allIds.length,
    mailboxCapped,
    offenders,
    top10: offenders.slice(0, 10)
  };
}

/**
 * Quantos EMAILS (mensagens) o remetente mandou.
 *
 * Contava conversas (/threads) antes, e isso desencontrava o número em dois
 * lugares: uma conversa com cinco respostas aparecia como 1 na lista, e a
 * limpeza depois relatava as 5 mensagens que de fato moveu. A interface fala
 * em "emails" — então a unidade é a mensagem.
 *
 * Usa exatamente a mesma consulta de clean(), inclusive o escopo: o número
 * ao lado do ofensor é a promessa do que o botão vai mover.
 */
async function countMessagesFrom(sender: string): Promise<number> {
  return (await listSenderIds(sender)).length;
}

/**
 * Ids das mensagens do remetente, sem repetição — a lista que a contagem mede e
 * que a limpeza move. Uma função só para os dois: enquanto eram dois laços
 * iguais, um contava e o outro movia, e nada garantia que fossem o mesmo
 * conjunto.
 *
 * O Set é a correção de um erro real: `total += página.length` somava o mesmo
 * id duas vezes quando a paginação do Gmail o devolvia em duas páginas — e ela
 * devolve, na virada de página de resultados grandes. Só aparecia acima de 500
 * mensagens (a primeira página), que é exatamente onde os números na tela
 * ficavam maiores do que a busca do Gmail mostrava.
 */
async function listSenderIds(sender: string): Promise<string[]> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const q = buildSenderQuery(sender, 'messages/id,nextPageToken');
    if (pageToken) q.set('pageToken', pageToken);
    const resp = await gfetch(`/messages?${q.toString()}`);
    for (const m of (resp.messages || []) as Array<{ id: string }>) ids.add(m.id);
    pageToken = resp.nextPageToken;
    pages++;
  } while (pageToken && pages < MAX_SENDER_PAGES);

  return [...ids];
}

export async function clean(
  sender: string
): Promise<{ removed: number; failed: number }> {
  if (!validateSender(sender)) {
    throw new Error('invalid_sender');
  }

  // Trava de segurança: limpar o próprio endereço esvaziaria a pasta de
  // enviados — incluindo e-mails que o usuário manda para si mesmo para
  // guardar. A interface já desabilita o botão nessa linha; isto cobre o caso
  // de a chamada chegar por outro caminho (tela em cache, ranking antigo).
  //
  // `required: true` faz a trava falhar FECHADA. Antes, um /profile com erro
  // devolvia '' e a comparação abaixo virava sempre falsa — a trava sumia
  // exatamente quando não dava para saber o que proteger. Como a análise lista
  // os enviados, o endereço do próprio usuário costuma liderar o ranking: uma
  // falha passageira de rede bastava para "Limpar Tudo" varrer a caixa de
  // enviados dele.
  const ownEmail = await getOwnEmail(true);
  if (sender.trim().toLowerCase() === ownEmail) {
    throw new Error('own_address');
  }

  // Mesma lista que a contagem mediu — o número ao lado do ofensor é a promessa
  // do que sai daqui. Sem repetição: id repetido inflava o `removed` relatado.
  const messageIds = await listSenderIds(sender);

  if (messageIds.length === 0) {
    return { removed: 0, failed: 0 };
  }

  // batchModify: até 1000 ids numa chamada. Remover INBOX junto evita o
  // efeito "incompleto" (mensagens seguindo visíveis em buscas da caixa).
  let removed = 0;
  let failed = 0;
  const BATCH_MODIFY_MAX = 1000;
  for (let i = 0; i < messageIds.length; i += BATCH_MODIFY_MAX) {
    const chunk = messageIds.slice(i, i + BATCH_MODIFY_MAX);
    try {
      await gfetch('/messages/batchModify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: chunk,
          addLabelIds: ['TRASH'],
          removeLabelIds: ['INBOX']
        })
      });
      removed += chunk.length;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      // Plano B: individual, em lotes paralelos pequenos
      const TRASH_CONCURRENCY = 10;
      const TRASH_PAUSE_MS = 120;
      for (let j = 0; j < chunk.length; j += TRASH_CONCURRENCY) {
        const batch = chunk.slice(j, j + TRASH_CONCURRENCY);
        await Promise.all(
          batch.map(async (id) => {
            try {
              await gfetch(`/messages/${id}/trash`, { method: 'POST' });
              removed++;
            } catch (innerErr) {
              if (innerErr instanceof UnauthorizedError) throw innerErr;
              failed++;
            }
          })
        );
        if (j + TRASH_CONCURRENCY < chunk.length) {
          await sleep(TRASH_PAUSE_MS);
        }
      }
    }
  }

  return { removed, failed };
}

// Devolve uma CHAVE de i18n, não texto pronto — quem traduz é a camada de
// interface (TRANSLATIONS em app.ts). Antes isto retornava português fixo,
// que vazava para a tela em qualquer idioma.
function categorizeSender(email: string): string {
  const domain = email.toLowerCase();
  if (domain.includes('linkedin')) return 'cat.social';
  if (domain.includes('facebook') || domain.includes('instagram')) return 'cat.social';
  if (domain.includes('google') || domain.includes('youtube')) return 'cat.google';
  if (domain.includes('github') || domain.includes('gitlab')) return 'cat.devops';
  if (domain.includes('ifood') || domain.includes('uber')) return 'cat.delivery';
  if (domain.includes('amazon')) return 'cat.shopping';
  if (domain.includes('canva') || domain.includes('figma')) return 'cat.design';
  if (domain.includes('cloudflare') || domain.includes('aws')) return 'cat.infra';
  if (domain.includes('slack') || domain.includes('teams')) return 'cat.collab';
  if (domain.includes('news') || domain.includes('nytimes')) return 'cat.news';
  if (domain.includes('medium') || domain.includes('substack')) return 'cat.content';
  return 'cat.other';
}
