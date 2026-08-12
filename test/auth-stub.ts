// Substitui src/auth.ts no teste: o auth de verdade importa o plugin nativo do
// Capacitor no topo do módulo, que não carrega fora do aparelho.
export function getAccessToken(): string | null {
  return 'fake-token';
}
