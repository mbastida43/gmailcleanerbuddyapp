// ============================================================
// Camada Gmail — porta da lógica do servidor Express (src/server.ts do
// projeto web) para chamadas diretas à REST API do Gmail com Bearer token.
// Mantém a mesma semântica validada no app web:
// - análise por amostra de 500 mensagens
// - contagem EXATA (busca from:"..." na conta inteira) para os top 25
// - limpeza via batchModify (até 1000 ids/chamada, TRASH + remove INBOX)
//   com fallback para messages.trash individual
// ============================================================

import { getAccessToken } from './auth';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

const MAX_ANALYZE = 500;
const EXACT_COUNT_LIMIT = 25;

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export interface Offender {
  domain: string;
  count: number;
  sampleCount: number;
  size: number;
  category: string;
}

export interface AnalyzeData {
  totalMessages: number;
  analyzedMessages: number;
  failedMessages: number;
  uniqueSenders: number;
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
  if (res.status === 401 || res.status === 403) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`gmail_api_${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export function validateSender(sender: unknown): sender is string {
  return typeof sender === 'string' && /^[a-zA-Z0-9@._%+-]{3,254}$/.test(sender);
}

export async function getProfile(): Promise<{ email: string }> {
  const data = await gfetch('/profile');
  return { email: data.emailAddress };
}

export async function analyze(): Promise<AnalyzeData> {
  // 1) Amostra: ids das mensagens mais recentes
  let ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({
      maxResults: '500',
      fields: 'messages/id,nextPageToken'
    });
    if (pageToken) q.set('pageToken', pageToken);
    const resp = await gfetch(`/messages?${q.toString()}`);
    ids = ids.concat((resp.messages || []).map((m: { id: string }) => m.id));
    pageToken = resp.nextPageToken;
  } while (pageToken && ids.length < MAX_ANALYZE);

  const toAnalyze = ids.slice(0, MAX_ANALYZE);

  // 2) Remetente de cada mensagem (em lotes paralelos)
  const senderCounts: Record<string, number> = {};
  const senderSizes: Record<string, number> = {};
  const senderCategories: Record<string, string> = {};
  let failedMessages = 0;

  const BATCH_SIZE = 25;
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
        }
      })
    );
  }

  const offenders: Offender[] = Object.keys(senderCounts).map((email) => ({
    domain: email,
    count: senderCounts[email],
    sampleCount: senderCounts[email],
    size: senderSizes[email] || 0,
    category: senderCategories[email]
  }));
  offenders.sort((a, b) => b.count - a.count);

  // 3) Contagem exata (conta inteira) só para os top candidatos
  const toCount = offenders.slice(0, EXACT_COUNT_LIMIT);
  const CONCURRENCY = 6;
  const PAUSE_MS = 200;
  for (let i = 0; i < toCount.length; i += CONCURRENCY) {
    const batch = toCount.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (item) => {
        try {
          item.count = await countThreadsFrom(item.domain);
        } catch (err) {
          if (err instanceof UnauthorizedError) throw err;
          // mantém a contagem da amostra como fallback
        }
      })
    );
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
    offenders,
    top10: offenders.slice(0, 10)
  };
}

// Mesma semântica do Gmail UI: conversas (threads), Spam/Lixeira excluídos.
async function countThreadsFrom(sender: string): Promise<number> {
  let total = 0;
  let pageToken: string | undefined;
  let pages = 0;
  const MAX_COUNT_PAGES = 50;

  do {
    const q = new URLSearchParams({
      q: `from:"${sender}"`,
      maxResults: '500',
      fields: 'threads/id,nextPageToken'
    });
    if (pageToken) q.set('pageToken', pageToken);
    const resp = await gfetch(`/threads?${q.toString()}`);
    total += (resp.threads || []).length;
    pageToken = resp.nextPageToken;
    pages++;
  } while (pageToken && pages < MAX_COUNT_PAGES);

  return total;
}

export async function clean(
  sender: string
): Promise<{ removed: number; failed: number }> {
  if (!validateSender(sender)) {
    throw new Error('invalid_sender');
  }

  // Coleta TODOS os ids (aspas na busca evitam injeção de operadores)
  let messageIds: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  const MAX_CLEAN_PAGES = 50;

  do {
    const q = new URLSearchParams({
      q: `from:"${sender}"`,
      maxResults: '500',
      fields: 'messages/id,nextPageToken',
      includeSpamTrash: 'true'
    });
    if (pageToken) q.set('pageToken', pageToken);
    const resp = await gfetch(`/messages?${q.toString()}`);
    messageIds = messageIds.concat(
      (resp.messages || []).map((m: { id: string }) => m.id)
    );
    pageToken = resp.nextPageToken;
    pages++;
  } while (pageToken && pages < MAX_CLEAN_PAGES);

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

function categorizeSender(email: string): string {
  const domain = email.toLowerCase();
  if (domain.includes('linkedin')) return 'Rede Social';
  if (domain.includes('facebook') || domain.includes('instagram')) return 'Rede Social';
  if (domain.includes('google') || domain.includes('youtube')) return 'Google';
  if (domain.includes('github') || domain.includes('gitlab')) return 'DevOps';
  if (domain.includes('ifood') || domain.includes('uber')) return 'Delivery';
  if (domain.includes('amazon')) return 'Compras';
  if (domain.includes('canva') || domain.includes('figma')) return 'Design';
  if (domain.includes('cloudflare') || domain.includes('aws')) return 'Infraestrutura';
  if (domain.includes('slack') || domain.includes('teams')) return 'Colaboração';
  if (domain.includes('news') || domain.includes('nytimes')) return 'Notícias';
  if (domain.includes('medium') || domain.includes('substack')) return 'Conteúdo';
  return 'Outros';
}
