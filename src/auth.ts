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

  const res: any = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: [OAUTH_SCOPE],
      forcePrompt: true
    }
  });

  // O formato do retorno varia entre versões do plugin — cobre os dois
  const raw =
    res?.result?.accessToken?.token ??
    (typeof res?.result?.accessToken === 'string' ? res.result.accessToken : null);

  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('no_access_token');
  }

  token = {
    accessToken: raw,
    // Access tokens do Google duram ~1h; 5min de folga para não usar um
    // token à beira de expirar no meio de uma limpeza
    expiresAt: Date.now() + 55 * 60 * 1000
  };
}

/** Access token válido, ou null se ausente/expirado. */
export function getAccessToken(): string | null {
  if (!token || Date.now() >= token.expiresAt) return null;
  return token.accessToken;
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/** Encerra a sessão nativa e revoga o token no Google. */
export async function signOut(): Promise<void> {
  const current = token?.accessToken;
  token = null;

  try {
    await SocialLogin.logout({ provider: 'google' });
  } catch {
    /* logout nativo é melhor-esforço */
  }

  if (current) {
    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(current)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
    } catch {
      /* revogação é melhor-esforço; o token expira sozinho em ~1h */
    }
  }
}
