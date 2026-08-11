// ============================================================
// Login nativo do Google (Opção B — sem navegador):
// o plugin @capgo/capacitor-social-login usa as APIs nativas do Google
// Play Services — Credential Manager (caixa de contas que sobe do rodapé)
// e Authorization API (consentimento do escopo do Gmail) — e devolve um
// access token para chamar a REST API do Gmail.
// O token vive só em memória (~1h) — nada persiste no aparelho.
// ============================================================

import { SocialLogin } from '@capgo/capacitor-social-login';
import { GOOGLE_WEB_CLIENT_ID, OAUTH_SCOPE } from './config';

interface TokenState {
  accessToken: string;
  expiresAt: number;
}

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

  await assertScopeGranted(raw);

  token = {
    accessToken: raw,
    // Access tokens do Google duram ~1h; 5min de folga para não usar um
    // token à beira de expirar no meio de uma limpeza
    expiresAt: Date.now() + 55 * 60 * 1000
  };
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
async function assertScopeGranted(accessToken: string): Promise<void> {
  let granted = '';
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return;
    const info = await res.json();
    granted = typeof info?.scope === 'string' ? info.scope : '';
  } catch {
    return;
  }

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
