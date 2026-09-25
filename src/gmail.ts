// ============================================================
// Camada Gmail — porta da lógica do servidor Express (src/server.ts do
// projeto web) para chamadas diretas à REST API do Gmail com Bearer token.
// Regra única desta camada: CONTAGEM EXATA, mensagem por mensagem. Nenhum
// número na tela é amostra, estimativa ou extrapolação.
// - varre os ids da caixa inteira (sem metadado, barato)
// - conhece o remetente de TODAS elas — uma a uma. É o único jeito de a soma
//   dos remetentes fechar com o total da caixa.
// - e por isso mesmo guarda o que aprendeu: remetente e tamanho de uma
//   mensagem não mudam nunca, então só id inédito custa leitura (ver o cache
//   mais abaixo). A exatidão é a mesma; o que cai é o tempo.
// - limpeza via batchModify (até 1000 ids/chamada, TRASH + remove INBOX)
//   com fallback para messages.trash individual
//
// A amostragem de 1000 mensagens que existia aqui foi removida: amostra
// descobre remetente, não conta e-mail. Quem não caía nas 1000 sorteadas
// simplesmente não existia na tela, e a contagem exata por busca — que ficava
// por cima para corrigir — nunca resgata um remetente que nunca foi
// descoberto. Agora não há quem corrigir: todo mundo é lido.
// ============================================================

import { getAccessToken } from './auth';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Trava de sanidade contra paginação que não termina, não limite de produto:
// 2000 páginas × 500 ids = 1 milhão de mensagens. Bater nisso acende o
// `mailboxCapped`, e a tela mostra o número como piso ("1.000.000+").
const MAX_PAGES = 2000;

// Cota do Gmail: 250 unidades por segundo por usuário, e um messages.get custa
// 5 unidades. Teto FÍSICO de 50 mensagens por segundo — ler a caixa inteira
// leva o tempo que leva, e nenhuma concorrência maior acelera: passar do teto
// só rende 429. Seguramos em 45/s para deixar folga para a varredura.
//
// ponytail: leitura ~45 e-mails/s. Caixa de 20 mil ≈ 7 min, 50 mil ≈ 18 min.
// É o preço da exatidão pedida. Se um dia isso incomodar, o caminho NÃO é
// voltar a amostrar — é guardar o resultado por id e reler só o que chegou
// desde a última análise (histórico incremental).
const READ_CONCURRENCY = 20;
const READ_PER_SEC = 45;

// ============================================================
// Cache de identidade por id de mensagem.
//
// Ler o cabeçalho From custa 5 unidades de cota por mensagem, e o Gmail dá 250
// por segundo — 50 mensagens/s, teto físico. Mas o remetente e o tamanho de
// uma mensagem NUNCA mudam: o que muda é o conjunto de ids da caixa, e isso a
// varredura descobre de graça (5 unidades por 500 ids).
//
// Então a varredura manda e a leitura só paga pelos ids que ela nunca viu. A
// primeira análise de uma caixa de 20 mil leva os ~7 minutos de sempre; a
// segunda lê só o que chegou desde então — segundos. Depois de uma limpeza,
// zero: nenhum id novo.
//
// Nada disso afrouxa a exatidão. A conta continua sendo feita sobre o conjunto
// varrido AGORA, mensagem por mensagem; o cache só evita repetir a pergunta
// cuja resposta não muda. Id que saiu da caixa sai do cache no fim da análise.
// ============================================================

/** O que se sabe de uma mensagem. `sender` vazio = lida e sem remetente
 *  utilizável (rascunho, chat, cabeçalho corrompido). */
interface MsgFacts {
  sender: string;
  size: number;
}

const CACHE_PREFIX = 'msgfacts:v1:';

/**
 * `localStorage` não existe no bundle de teste (roda em Node) e pode estar
 * desligado numa webview. Cache ausente é caso normal — custa reler, não
 * errar —, então o acesso é opcional em vez de obrigatório.
 */
function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Formato guardado: os remetentes vão numa lista e cada mensagem referencia o
 * índice. Um endereço como `groups-noreply@linkedin.com` aparece milhares de
 * vezes numa caixa; repetir a string em cada entrada triplicava o JSON e
 * estourava o `localStorage` antes da hora.
 */
function loadCache(email: string): Map<string, MsgFacts> {
  const facts = new Map<string, MsgFacts>();
  const store = storage();
  if (!store || !email) return facts;
  try {
    const raw = store.getItem(CACHE_PREFIX + email);
    if (!raw) return facts;
    const parsed = JSON.parse(raw);
    const senders: unknown = parsed?.senders;
    const msgs: unknown = parsed?.msgs;
    if (!Array.isArray(senders) || !msgs || typeof msgs !== 'object') return facts;
    for (const [id, entry] of Object.entries(msgs as Record<string, unknown>)) {
      if (!Array.isArray(entry)) continue;
      const sender = senders[Number(entry[0])];
      facts.set(id, {
        sender: typeof sender === 'string' ? sender : '',
        size: Number(entry[1]) || 0
      });
    }
  } catch {
    // Cache corrompido é cache ausente: a análise relê e reescreve. Nunca vale
    // derrubar uma análise por causa de um atalho de desempenho.
    facts.clear();
  }
  return facts;
}

function saveCache(email: string, facts: Map<string, MsgFacts>): void {
  const store = storage();
  if (!store || !email) return;
  try {
    const index = new Map<string, number>();
    const senders: string[] = [];
    const msgs: Record<string, [number, number]> = {};
    for (const [id, f] of facts) {
      let i = index.get(f.sender);
      if (i === undefined) {
        i = senders.push(f.sender) - 1;
        index.set(f.sender, i);
      }
      msgs[id] = [i, f.size];
    }
    store.setItem(CACHE_PREFIX + email, JSON.stringify({ senders, msgs }));
  } catch {
    // ponytail: o localStorage estoura por volta de 5 MB, ~100 mil mensagens.
    // Estourar só custa reler na próxima análise, então descartamos o cache em
    // silêncio em vez de quebrar uma análise que já terminou certa. Se caixas
    // desse tamanho virarem regra, o caminho é IndexedDB.
    try {
      store.removeItem(CACHE_PREFIX + email);
    } catch {
      /* nem remover deu: segue sem cache */
    }
  }
}

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
  /** Quantas mensagens deste remetente existem na caixa. Contadas uma a uma,
   *  lendo o cabeçalho From de cada mensagem — não é busca, nem estimativa,
   *  nem amostra escalada. */
  count: number;
  /** Soma dos sizeEstimate das mesmas `count` mensagens. Também exata: era
   *  extrapolada pela razão count/amostra, que inventava bytes. */
  size: number;
  category: string;
  isProtected: boolean;
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
 * Duas fases, não três: a 'ranking' (contagem exata por busca) deixou de
 * existir porque a leitura já conta tudo. Ela só era necessária para corrigir
 * o que a amostra errava.
 *
 * Cada fase manda done/total no seu próprio universo (ids varridos, e-mails
 * lidos). Quem transforma isso num percentual ÚNICO de 0 a 100 é a interface.
 */
export type ProgressPhase = 'scanning' | 'reading' | 'waiting';
export type ProgressFn = (phase: ProgressPhase, done: number, total: number) => void;

export interface AnalyzeData {
  /** Mensagens consideradas na análise: a caixa inteira, igual a
   *  `mailboxMessages`. Mantido como campo próprio porque é o que a interface
   *  usa para falar do universo analisado. */
  totalMessages: number;
  /** Mensagens cuja identidade se conhece — lidas agora ou vindas do cache de
   *  análises anteriores. `totalMessages - analyzedMessages` é exatamente
   *  `failedMessages`. */
  analyzedMessages: number;
  failedMessages: number;
  uniqueSenders: number;
  /**
   * Mensagens na conta, no escopo que o app trata (com Spam, sem Lixeira). Sai
   * de graça da varredura de ids, que já precisa percorrer tudo.
   */
  mailboxMessages: number;
  /**
   * Mensagens lidas que não renderam remetente: sem cabeçalho From (rascunho,
   * mensagem de chat) ou com um endereço que não passa na validação. Contam na
   * caixa mas não em nenhum remetente — é a única diferença legítima entre
   * `mailboxMessages` e a soma dos `count`, e por isso vai para a tela em vez
   * de ficar escondida.
   */
  unattributedMessages: number;
  /**
   * true quando a varredura parou na trava de sanidade (MAX_PAGES, 1 milhão de
   * mensagens) em vez de no fim da caixa — aí `mailboxMessages` é um piso e a
   * interface precisa dizer "+". Mostrar o número redondo como se fosse exato
   * seria exatamente o tipo de precisão inventada que este app existe para não
   * fazer.
   */
  mailboxCapped: boolean;
  offenders: Offender[];
  top10: Offender[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Erros que somem sozinhos: cota estourada e indisponibilidade momentânea do
// Gmail. Um 429 no meio da leitura era contado como failedMessages — mensagem
// descartada, e a contagem na tela ficava MENOR do que a do Gmail sem nenhum
// aviso. Com a caixa inteira sendo lida, 429 deixa de ser exceção e passa a ser
// rotina; descartar não é opção quando o produto é o número exato.
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 5;

async function gfetch(path: string, init: RequestInit = {}): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const token = getAccessToken();
    if (!token) throw new UnauthorizedError();

    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });
    if (res.ok) {
      if (res.status === 204) return null;
      return res.json();
    }

    const { reason, message } = await readApiError(res);
    if (res.status === 401 || (res.status === 403 && AUTH_REASONS.has(reason))) {
      throw new UnauthorizedError();
    }
    // O 403 de cota (rateLimitExceeded / userRateLimitExceeded) é transitório
    // como o 429, e o Gmail usa os dois para a mesma coisa.
    const retriable =
      RETRY_STATUS.has(res.status) ||
      (res.status === 403 && /rateLimitExceeded/i.test(reason));
    if (!retriable || attempt >= MAX_RETRIES) {
      throw new GmailApiError(res.status, reason, message);
    }
    // 300ms, 600, 1200, 2400, 4800 — tempo de sobra para a média móvel da cota
    // baixar, sem prender a análise por minutos.
    await sleep(300 * 2 ** attempt);
  }
}

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
 * Equivalente conferível na busca do Gmail: é a MESMA string, literalmente —
 * cole no campo de busca e o número tem de bater. Com "Visualização de conversa"
 * desativada, porque o Gmail conta conversas quando ela está ligada.
 *
 * As aspas em volta do endereço evitam injeção de operadores de busca.
 */
function buildSenderQuery(sender: string, fields: string): URLSearchParams {
  return new URLSearchParams({
    // `in:anywhere` explícito, além do includeSpamTrash. Não é redundância: numa
    // caixa real, `from:"x" -in:trash` devolveu 256 mensagens onde
    // `from:x in:anywhere -in:trash` (a mesma busca digitada no Gmail) devolvia
    // 265 — faltavam exatamente as segundas mensagens de conversas com reenvio.
    // O app dava 256 e a limpeza teria deixado 9 para trás.
    q: `from:"${sender}" in:anywhere -in:trash`,
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
      // MESMA string de buildSenderQuery, menos o `from:`. O `in:anywhere`
      // não é decoração: sem ele, `-in:trash` devolvia 256 onde
      // `in:anywhere -in:trash` devolvia 265 — faltavam as segundas mensagens
      // de conversas com reenvio. Enquanto a varredura não o tinha, essas
      // mensagens não eram lidas, logo não eram contadas para ninguém, e a
      // soma dos remetentes não fechava com a caixa.
      q: 'in:anywhere -in:trash',
      maxResults: '500',
      includeSpamTrash: 'true',
      fields: 'messages/id,nextPageToken'
    });
    if (pageToken) q.set('pageToken', pageToken);
    const resp = await gfetch(`/messages?${q.toString()}`);
    for (const m of (resp.messages || []) as Array<{ id: string }>) seenIds.add(m.id);
    pageToken = resp.nextPageToken;
    scanned++;
    // Número CRESCENTE, sem denominador — o denominador é o que esta fase está
    // descobrindo. É a fase mais longa da análise (até 100 páginas em série) e
    // era a única sem número nenhum: meio minuto de texto parado é a cara de um
    // app travado. Um total que sobe a cada página prova que algo acontece.
    report('scanning', seenIds.size, 0);
  } while (pageToken && scanned < MAX_PAGES);

  // Sobrou pageToken = paramos na trava de sanidade, não no fim da caixa.
  const mailboxCapped = !!pageToken;
  const allIds = [...seenIds];

  // 2) O que já se sabe sai do cache; o resto é lido.
  //
  // `facts` é um Map CHAVEADO POR ID, e é essa escolha que garante a exatidão:
  // um id só pode ter uma entrada, então uma mensagem não tem como ser contada
  // duas vezes, venha ela do cache ou da leitura. A contagem por remetente é
  // derivada disso no fim, nunca incrementada no caminho.
  //
  // Sem cache útil, isto é idêntico ao que era antes: lê tudo, uma por uma.
  const cached = ownEmail ? loadCache(ownEmail) : new Map<string, MsgFacts>();
  const facts = new Map<string, MsgFacts>();
  const toRead: string[] = [];
  for (const id of allIds) {
    const hit = cached.get(id);
    if (hit) facts.set(id, hit);
    else toRead.push(id);
  }

  let failedMessages = 0;

  // Um passo por E-MAIL, não por lote: o contador é o número real de mensagens
  // já lidas, sobe uma a uma conforme cada resposta chega, e o último
  // incremento escreve o total cheio. O denominador é o que falta LER, não o
  // tamanho da caixa — numa segunda análise são 80 mensagens, não 20 mil, e
  // fingir o contrário deixaria a barra parada em 99%.
  let read = 0;
  report('reading', 0, toRead.length);
  for (let i = 0; i < toRead.length; i += READ_CONCURRENCY) {
    const batch = toRead.slice(i, i + READ_CONCURRENCY);
    const startedAt = Date.now();
    await Promise.all(
      batch.map(async (id) => {
        try {
          const details = await gfetch(
            `/messages/${id}?format=metadata&metadataHeaders=From&fields=payload/headers,sizeEstimate`
          );
          const headers: Array<{ name?: string; value?: string }> =
            details.payload?.headers || [];
          const fromHeader = headers.find((h) => h.name === 'From');

          const emailMatch = fromHeader?.value
            ? fromHeader.value.match(/<(.+?)>/) ||
              fromHeader.value.match(/([^\s]+@[^\s]+)/)
            : null;
          const raw = emailMatch ? emailMatch[1] : fromHeader?.value;
          const senderEmail = String(raw || '').trim().toLowerCase();
          // Remetente vazio = lida e sem remetente utilizável (rascunho,
          // mensagem de chat, cabeçalho corrompido). Ela EXISTE na caixa, então
          // entra no Map do mesmo jeito em vez de desaparecer — era o buraco
          // silencioso que abria diferença entre o total da caixa e a soma da
          // lista. Vai para o cache também: relê-la não mudaria o resultado.
          facts.set(id, {
            sender: validateSender(senderEmail) ? senderEmail : '',
            size: Number(details.sizeEstimate) || 0
          });
        } catch (err) {
          if (err instanceof UnauthorizedError) throw err;
          // gfetch já retentou 429/5xx cinco vezes. Chegar aqui é erro que não
          // passa, e a tela avisa quantas foram (toast.analyzePartial): número
          // exato inclui dizer o que não deu para contar. Não entra no cache —
          // a próxima análise tenta de novo.
          failedMessages++;
        } finally {
          // No finally: a sem remetente e a que falhou também foram lidas.
          // Fora daqui, o contador nunca fecharia no total.
          report('reading', ++read, toRead.length);
        }
      })
    );
    // Ritmo, não pausa fixa: segura o lote no tempo que a cota permite. Uma
    // pausa constante ou desperdiça cota (rede rápida) ou estoura (rede lenta
    // que já demorou mais que o devido).
    const owedMs = (batch.length / READ_PER_SEC) * 1000 - (Date.now() - startedAt);
    if (owedMs > 0 && i + READ_CONCURRENCY < toRead.length) {
      report('waiting', read, toRead.length);
      await sleep(owedMs);
    }
  }

  // Guarda só os ids desta varredura — o Map já é exatamente isso, então o
  // cache se poda sozinho: mensagem que foi para a lixeira sai dele aqui, sem
  // nenhuma limpeza explícita.
  if (ownEmail) saveCache(ownEmail, facts);

  // 3) Contagem: uma passada pelo Map. Derivar em vez de incrementar durante a
  // leitura é o que faz "cada mensagem conta uma vez" ser verdade por
  // construção, e não por disciplina de quem mexer no laço depois.
  const senderCounts = new Map<string, number>();
  const senderSizes = new Map<string, number>();
  let unattributedMessages = 0;
  for (const { sender, size } of facts.values()) {
    if (!sender) {
      unattributedMessages++;
      continue;
    }
    senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
    senderSizes.set(sender, (senderSizes.get(sender) || 0) + size);
  }

  const offenders: Offender[] = [...senderCounts].map(([email, count]) => ({
    sender: email,
    domain: domainOf(email),
    count,
    size: senderSizes.get(email) || 0,
    category: categorizeSender(email),
    isProtected: !!ownEmail && email === ownEmail
  }));
  offenders.sort((a, b) => b.count - a.count);

  return {
    totalMessages: allIds.length,
    analyzedMessages: facts.size,
    failedMessages,
    unattributedMessages,
    uniqueSenders: offenders.length,
    mailboxMessages: allIds.length,
    mailboxCapped,
    offenders,
    top10: offenders.slice(0, 10)
  };
}

/**
 * Ids das mensagens do remetente, sem repetição — a lista que a limpeza move.
 *
 * Mesmo escopo da varredura de analyze() (`in:anywhere -in:trash`, com Spam),
 * de propósito: o número contado na leitura e o conjunto movido por esta lista
 * têm de ser o mesmo, senão o botão limpa mais ou menos do que a tela
 * prometeu. A lista é consultada na hora do clique, não guardada da análise —
 * e-mail que chegou depois também é desse remetente.
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
  } while (pageToken && pages < MAX_PAGES);

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
