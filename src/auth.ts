// ============================================================
// Login nativo do Google (Opção B — sem navegador):
// o plugin @capgo/capacitor-social-login usa as APIs nativas do Google
// Play Services — Credential Manager (caixa de contas que sobe do rodapé)
// e Authorization API (consentimento do escopo do Gmail) — e devolve um
// access token para chamar a REST API do Gmail.
// O token vive só em memória (~1h) — nada persiste no aparelho. Quando ele
// vence no meio de uma análise longa, renewToken() pega outro em silêncio.
// ============================================================

import { registerPlugin } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { GOOGLE_WEB_CLIENT_ID, OAUTH_SCOPE } from './config';

interface TokenState {
  accessToken: string;
  expiresAt: number;
  /** Id da conta no Google: a renovação só aceita token da MESMA conta. */
  sub: string;
  /** E-mail da conta: a renovação pede o token direto para ela, sem seletor. */
  email: string;
}

// Plugin nativo do próprio app (GmailTokenPlugin.java): token novo pela
// Authorization API, preso à conta, sem abrir tela nenhuma.
const GmailToken = registerPlugin<{
  renew(options: { email: string; scope: string }): Promise<{ accessToken: string }>;
}>('GmailToken');

let token: TokenState | null = null;
let initialized = false;

/** Inicializa o plugin. Chamar UMA vez, na inicialização do app. */
export async function initAuth(): Promise<void> {
  if (initialized) return;
  await SocialLogin.initialize({
    google: { webClientId: GOOGLE_WEB_CLIENT_ID }
  });
  initialized = true;
}

/**
 * Abre a caixa nativa do Android para escolher a conta Google e consentir
 * o acesso ao Gmail. Resolve quando o access token estiver em mãos.
 */
export async function signIn(): Promise<void> {
  await initAuth();

  // Sem forcePrompt: apesar do nome sugestivo, o plugin só honra essa opção
  // no iOS — no Android quem manda no seletor de conta é o Credential Manager.
  const res: any = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: [OAUTH_SCOPE]
    }
  });

  // O formato do retorno varia entre versões do plugin — cobre os dois
  const raw =
    res?.result?.accessToken?.token ??
    (typeof res?.result?.accessToken === 'string' ? res.result.accessToken : null);

  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('no_access_token');
  }

  const info = await tokenInfo(raw);
  assertScopeGranted(info);
  token = {
    accessToken: raw,
    expiresAt: expiresAtOf(info),
    sub: info?.sub || '',
    email: info?.email || ''
  };
}

interface TokenInfo {
  scope: string;
  expiresIn: number;
  sub: string;
  email: string;
}

/** O que o Google diz do token. null = não deu para perguntar (rede etc.). */
async function tokenInfo(accessToken: string): Promise<TokenInfo | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return null;
    const info = await res.json();
    return {
      scope: typeof info?.scope === 'string' ? info.scope : '',
      expiresIn: Number(info?.expires_in) || 0,
      sub: typeof info?.sub === 'string' ? info.sub : '',
      email: typeof info?.email === 'string' ? info.email : ''
    };
  } catch {
    return null;
  }
}

// Validade exata, dita pelo Google. Sem folga de propósito: vencer aqui antes
// de vencer lá faria a renovação receber de volta o MESMO token (o Android
// guarda o token até ele expirar). Sem resposta do Google, ~1h menos 5 min.
function expiresAtOf(info: TokenInfo | null): number {
  return Date.now() + (info?.expiresIn ? info.expiresIn * 1000 : 55 * 60 * 1000);
}

/**
 * Pega um token novo SEM tela, para a sessão não cair no meio da leitura.
 *
 * A primeira análise de uma caixa grande passa de 1 hora (45 e-mails/s), e o
 * token do Google dura 1 hora: antes, a análise morria com "sessão expirada"
 * e perdia tudo o que já tinha lido. O Android já tem a autorização do Gmail
 * concedida, então a Authorization API devolve um token novo em silêncio.
 * Não usa SocialLogin.refresh(): ele passa pelo Credential Manager, que abre
 * o seletor de contas a cada hora quando há mais de uma conta autorizada no
 * aparelho — o usuário tinha de clicar na mesma conta de novo.
 *
 * Uma renovação por vez: as 20 leituras paralelas batem no vencimento juntas
 * e todas esperam a mesma. false = não deu (conta saiu, outra conta, sem
 * rede) — aí sim a sessão cai, como antes.
 */
let renewing: Promise<boolean> | null = null;
export function renewToken(): Promise<boolean> {
  renewing ??= doRenew().finally(() => {
    renewing = null;
  });
  return renewing;
}

async function doRenew(): Promise<boolean> {
  const previous = token;
  if (!previous) return false; // nunca entrou, ou clicou em Sair
  try {
    if (!previous.email) return false; // sem a conta, não dá para pedir sem tela
    const res = await GmailToken.renew({ email: previous.email, scope: OAUTH_SCOPE });
    const raw = res?.accessToken;
    if (typeof raw !== 'string' || raw.length === 0) return false;
    const info = await tokenInfo(raw);
    // Outra conta no meio da análise misturaria caixas: nunca.
    if (info?.sub && previous.sub && info.sub !== previous.sub) return false;
    if (info?.scope && !info.scope.split(/\s+/).includes(OAUTH_SCOPE)) return false;
    if (token !== previous) return false; // clicou em Sair durante a renovação
    token = { ...previous, accessToken: raw, expiresAt: expiresAtOf(info), sub: info?.sub || previous.sub };
    return true;
  } catch {
    return false;
  }
}

/**
 * Confere com o Google quais escopos o token realmente carrega.
 *
 * O fluxo nativo pode devolver um token perfeitamente válido cujo
 * consentimento cobre só os escopos básicos (email/profile/openid): a
 * autorização de escopo mora num cache do Play Services separado do
 * Credential Manager que o logout limpa, então ela pode ficar defasada. Sem
 * esta conferência, o token só denuncia o problema lá na frente, como um 403
 * na primeira chamada ao Gmail — que o app traduzia para "sessão expirada",
 * mandando o usuário refazer um login que nunca ia resolver.
 *
 * Melhor-esforço: se a própria checagem falhar (rede, formato inesperado),
 * seguimos com o login em vez de barrar por causa do diagnóstico.
 */
function assertScopeGranted(info: TokenInfo | null): void {
  const granted = info?.scope || '';
  if (granted && !granted.split(/\s+/).includes(OAUTH_SCOPE)) {
    throw new Error(`missing_scope: ${OAUTH_SCOPE} (concedidos: ${granted})`);
  }
}

/** Access token válido, ou null se ausente/expirado. */
export function getAccessToken(): string | null {
  if (!token || Date.now() >= token.expiresAt) return null;
  return token.accessToken;
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * Encerra a sessão: descarta o token daqui e limpa o estado de credenciais
 * do lado nativo.
 *
 * NÃO revoga o token no Google, de propósito. Revogar não encerra só a
 * sessão — apaga a CONCESSÃO da conta neste client OAuth. Com o app em modo
 * Testing, o login seguinte então teria de refazer a tela de consentimento
 * inteira do escopo restrito `gmail.modify`, que só contas cadastradas em
 * "Test users" conseguem aceitar — era isso que impedia de reentrar depois
 * de clicar em Sair. Nada fica guardado no aparelho de qualquer forma: o
 * token só existe nesta variável em memória e expira sozinho em ~1h.
 */
export async function signOut(): Promise<void> {
  token = null;

  try {
    await SocialLogin.logout({ provider: 'google' });
  } catch {
    /* logout nativo é melhor-esforço */
  }
}
