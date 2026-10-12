// Substitui src/auth.ts no teste: o auth de verdade importa o plugin nativo do
// Capacitor no topo do módulo, que não carrega fora do aparelho.
//
// `stubAuth` deixa o teste da sessão vencer o token e ver a renovação.
export const stubAuth = { token: 'fake-token' as string | null, renewals: 0, canRenew: true };

export function getAccessToken(): string | null {
  return stubAuth.token;
}

export async function renewToken(): Promise<boolean> {
  stubAuth.renewals++;
  if (!stubAuth.canRenew) return false;
  stubAuth.token = 'novo-token';
  return true;
}
