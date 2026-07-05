import * as auth from './auth';
import * as gmail from './gmail';
import type { AnalyzeData } from './gmail';

type Lang = 'pt' | 'en' | 'es' | 'fr';

let currentData: AnalyzeData | null = null;
let currentLang: Lang = 'pt';

const LANG_FLAG_CLASSES: Record<Lang, string> = { pt: 'fi fi-br', en: 'fi fi-us', es: 'fi fi-es', fr: 'fi fi-fr' };
const LANG_LABELS: Record<Lang, string> = { pt: 'PT', en: 'EN', es: 'ES', fr: 'FR' };

// ===================== i18n =====================
const LOCALES: Record<Lang, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES', fr: 'fr-FR' };

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  pt: {
    'subtitle': '🔐 Conectado ao Gmail via OAuth2',
    'auth.title': '🔒 Conectar ao Gmail',
    'auth.desc': 'Autorize o acesso à sua conta Gmail para analisar os remetentes que mais lotam sua caixa e movê-los para a lixeira.',
    'auth.loginBtn': 'Entrar com Google',
    'auth.note': '🔐 Autenticação OAuth2 oficial do Google<br>🗑️ Permissão para ler e mover seus emails para a lixeira',
    'results.title': '🏆 Top 10 remetentes',
    'btn.cleanAll': '🗑️ Limpar Top 10',
    'btn.logout': '🚪 Sair',
    'stat.analyzed': 'Emails analisados',
    'stat.space': 'Espaço total',
    'stat.senders': 'Remetentes únicos',
    'stat.top10': 'Top 10 (emails)',
    'list.title': '📬 Remetentes com mais emails',
    'btn.clean': 'Limpar',
    'toast.authSuccess': '✅ Autenticado com sucesso!',
    'toast.authError': '❌ Erro na autenticação. Tente novamente.',
    'toast.sessionExpired': '🔒 Sessão expirada. Entre novamente.',
    'toast.logoutError': '❌ Erro ao desconectar',
    'toast.loadError': '❌ Erro ao carregar dados',
    'toast.analyzing': '🔍 Analisando caixa postal...',
    'toast.analyzePartial': '✅ Análise parcial: {ok} ok, {failed} falharam',
    'toast.analyzeDone': '✅ Análise concluída!',
    'toast.analyzeError': '❌ Erro ao analisar',
    'confirm.cleanSender': 'Mover emails de {sender} para a lixeira?',
    'confirm.cleanAll': 'Mover TODOS os Top 10 para a lixeira?',
    'toast.cleaned': '✅ {n} emails movidos para a lixeira',
    'toast.cleanAllPartial': '⚠️ {removed} movidos; {failed} falharam'
  },
  en: {
    'subtitle': '🔐 Connected to Gmail via OAuth2',
    'auth.title': '🔒 Connect to Gmail',
    'auth.desc': 'Authorize access to your Gmail account to analyze the senders that clutter your inbox the most and move them to the trash.',
    'auth.loginBtn': 'Sign in with Google',
    'auth.note': '🔐 Official Google OAuth2 authentication<br>🗑️ Permission to read and move your emails to the trash',
    'results.title': '🏆 Top 10 senders',
    'btn.cleanAll': '🗑️ Clean Top 10',
    'btn.logout': '🚪 Sign out',
    'stat.analyzed': 'Emails analyzed',
    'stat.space': 'Total space',
    'stat.senders': 'Unique senders',
    'stat.top10': 'Top 10 (emails)',
    'list.title': '📬 Senders with the most emails',
    'btn.clean': 'Clean',
    'toast.authSuccess': '✅ Successfully authenticated!',
    'toast.authError': '❌ Authentication error. Please try again.',
    'toast.sessionExpired': '🔒 Session expired. Please sign in again.',
    'toast.logoutError': '❌ Error signing out',
    'toast.loadError': '❌ Error loading data',
    'toast.analyzing': '🔍 Analyzing your mailbox...',
    'toast.analyzePartial': '✅ Partial analysis: {ok} ok, {failed} failed',
    'toast.analyzeDone': '✅ Analysis complete!',
    'toast.analyzeError': '❌ Error analyzing',
    'confirm.cleanSender': 'Move emails from {sender} to the trash?',
    'confirm.cleanAll': 'Move ALL Top 10 to the trash?',
    'toast.cleaned': '✅ {n} emails moved to the trash',
    'toast.cleanAllPartial': '⚠️ {removed} moved; {failed} failed'
  },
  es: {
    'subtitle': '🔐 Conectado a Gmail vía OAuth2',
    'auth.title': '🔒 Conectar a Gmail',
    'auth.desc': 'Autoriza el acceso a tu cuenta de Gmail para analizar los remitentes que más saturan tu bandeja y moverlos a la papelera.',
    'auth.loginBtn': 'Iniciar sesión con Google',
    'auth.note': '🔐 Autenticación OAuth2 oficial de Google<br>🗑️ Permiso para leer y mover tus correos a la papelera',
    'results.title': '🏆 Top 10 remitentes',
    'btn.cleanAll': '🗑️ Limpiar Top 10',
    'btn.logout': '🚪 Salir',
    'stat.analyzed': 'Correos analizados',
    'stat.space': 'Espacio total',
    'stat.senders': 'Remitentes únicos',
    'stat.top10': 'Top 10 (correos)',
    'list.title': '📬 Remitentes con más correos',
    'btn.clean': 'Limpiar',
    'toast.authSuccess': '✅ ¡Autenticado correctamente!',
    'toast.authError': '❌ Error de autenticación. Inténtalo de nuevo.',
    'toast.sessionExpired': '🔒 Sesión expirada. Inicia sesión de nuevo.',
    'toast.logoutError': '❌ Error al cerrar sesión',
    'toast.loadError': '❌ Error al cargar los datos',
    'toast.analyzing': '🔍 Analizando tu buzón...',
    'toast.analyzePartial': '✅ Análisis parcial: {ok} ok, {failed} fallaron',
    'toast.analyzeDone': '✅ ¡Análisis completado!',
    'toast.analyzeError': '❌ Error al analizar',
    'confirm.cleanSender': '¿Mover los correos de {sender} a la papelera?',
    'confirm.cleanAll': '¿Mover TODO el Top 10 a la papelera?',
    'toast.cleaned': '✅ {n} correos movidos a la papelera',
    'toast.cleanAllPartial': '⚠️ {removed} movidos; {failed} fallaron'
  },
  fr: {
    'subtitle': '🔐 Connecté à Gmail via OAuth2',
    'auth.title': '🔒 Se connecter à Gmail',
    'auth.desc': 'Autorisez l’accès à votre compte Gmail pour analyser les expéditeurs qui encombrent le plus votre boîte et les déplacer vers la corbeille.',
    'auth.loginBtn': 'Se connecter avec Google',
    'auth.note': '🔐 Authentification OAuth2 officielle de Google<br>🗑️ Autorisation de lire et déplacer vos e-mails vers la corbeille',
    'results.title': '🏆 Top 10 des expéditeurs',
    'btn.cleanAll': '🗑️ Nettoyer le Top 10',
    'btn.logout': '🚪 Se déconnecter',
    'stat.analyzed': 'E-mails analysés',
    'stat.space': 'Espace total',
    'stat.senders': 'Expéditeurs uniques',
    'stat.top10': 'Top 10 (e-mails)',
    'list.title': '📬 Expéditeurs avec le plus d’e-mails',
    'btn.clean': 'Nettoyer',
    'toast.authSuccess': '✅ Authentification réussie !',
    'toast.authError': '❌ Erreur d’authentification. Veuillez réessayer.',
    'toast.sessionExpired': '🔒 Session expirée. Veuillez vous reconnecter.',
    'toast.logoutError': '❌ Erreur lors de la déconnexion',
    'toast.loadError': '❌ Erreur lors du chargement des données',
    'toast.analyzing': '🔍 Analyse de votre boîte de réception...',
    'toast.analyzePartial': '✅ Analyse partielle : {ok} ok, {failed} échoués',
    'toast.analyzeDone': '✅ Analyse terminée !',
    'toast.analyzeError': '❌ Erreur lors de l’analyse',
    'confirm.cleanSender': 'Déplacer les e-mails de {sender} vers la corbeille ?',
    'confirm.cleanAll': 'Déplacer TOUT le Top 10 vers la corbeille ?',
    'toast.cleaned': '✅ {n} e-mails déplacés vers la corbeille',
    'toast.cleanAllPartial': '⚠️ {removed} déplacés ; {failed} échoués'
  }
};

function t(key: string, params: Record<string, string | number> = {}): string {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.pt;
  let str = dict[key] ?? TRANSLATIONS.pt[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return str;
}

function applyLanguage(lang: string): void {
  const safeLang: Lang = (lang in TRANSLATIONS ? lang : 'pt') as Lang;
  currentLang = safeLang;
  localStorage.setItem('lang', safeLang);
  document.documentElement.lang = LOCALES[safeLang];

  const flagEl = document.getElementById('langFlag');
  const labelEl = document.getElementById('langLabel');
  if (flagEl) flagEl.className = LANG_FLAG_CLASSES[safeLang];
  if (labelEl) labelEl.textContent = LANG_LABELS[safeLang];

  document.querySelectorAll<HTMLElement>('#langMenu [data-lang]').forEach((li) => {
    li.classList.toggle('active', (li as HTMLElement).dataset['lang'] === safeLang);
  });

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n')!);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.getAttribute('data-i18n-html')!);
  });

  if (currentData) renderResults(currentData);
}

window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('loginButton')?.addEventListener('click', loginGoogle);
  document.getElementById('cleanAllButton')?.addEventListener('click', cleanAll);
  document.getElementById('logoutButton')?.addEventListener('click', logout);

  const langBtn = document.getElementById('langBtn');
  const langMenu = document.getElementById('langMenu');
  langBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = langMenu?.classList.toggle('open');
    langBtn.setAttribute('aria-expanded', String(!!open));
  });
  document.addEventListener('click', () => {
    langMenu?.classList.remove('open');
    langBtn?.setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll<HTMLElement>('#langMenu [data-lang]').forEach((li) => {
    li.addEventListener('click', () => {
      applyLanguage(li.dataset['lang']!);
      langMenu?.classList.remove('open');
      langBtn?.setAttribute('aria-expanded', 'false');
    });
  });

  const saved = localStorage.getItem('lang');
  const browser = (navigator.language || 'pt').slice(0, 2);
  applyLanguage(saved || (browser in TRANSLATIONS ? browser : 'pt'));

  // Prepara o plugin de login nativo do Google
  try {
    await auth.initAuth();
  } catch (error) {
    console.error('Erro ao inicializar o login nativo:', error);
  }

  if (auth.isAuthenticated()) {
    await loadUserData();
  }
});

function showAuthScreen(): void {
  currentData = null;
  document.getElementById('resultsScreen')!.style.display = 'none';
  document.getElementById('authScreen')!.style.display = 'block';
}

// Token ausente/expirado: volta para a tela de login
function handleUnauthorized(): void {
  toast(t('toast.sessionExpired'));
  showAuthScreen();
}

async function loginGoogle(): Promise<void> {
  try {
    // Abre a caixa nativa do Android (contas do aparelho + consentimento)
    await auth.signIn();
    toast(t('toast.authSuccess'));
    await loadUserData();
  } catch (error) {
    console.error('Erro no login:', error);
    toast(t('toast.authError'));
  }
}

async function logout(): Promise<void> {
  try {
    await auth.signOut();
    showAuthScreen();
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    toast(t('toast.logoutError'));
  }
}

async function loadUserData(): Promise<void> {
  showLoading();
  try {
    const userData = await gmail.getProfile();
    document.getElementById('userEmail')!.textContent = `📧 ${userData.email}`;

    document.getElementById('authScreen')!.style.display = 'none';
    document.getElementById('resultsScreen')!.style.display = 'block';

    await refreshAnalysis();
  } catch (error: any) {
    if (error instanceof gmail.UnauthorizedError) {
      handleUnauthorized();
      return;
    }
    console.error('Erro ao carregar dados:', error);
    toast(t('toast.loadError'));
  } finally {
    hideLoading();
  }
}

async function refreshAnalysis(): Promise<void> {
  showLoading();
  toast(t('toast.analyzing'));
  try {
    const data: AnalyzeData = await gmail.analyze();
    currentData = data;
    renderResults(data);
    if (data.failedMessages > 0) {
      toast(t('toast.analyzePartial', { ok: data.analyzedMessages, failed: data.failedMessages }));
    } else {
      toast(t('toast.analyzeDone'));
    }
  } catch (error: any) {
    if (error instanceof gmail.UnauthorizedError) {
      handleUnauthorized();
      return;
    }
    console.error('Erro na análise:', error);
    toast(t('toast.analyzeError'));
  } finally {
    hideLoading();
  }
}

// Atualização otimista: remove o remetente limpo da lista local e re-renderiza
// na hora, sem pagar os ~25s de uma nova análise completa. O 11º colocado sobe
// para o Top 10 (o servidor conta com exatidão os 25 primeiros justamente para
// isso). Um F5 refaz a análise completa quando o usuário quiser re-verificar.
function removeSenderLocally(sender: string): void {
  if (!currentData) return;
  currentData.offenders = currentData.offenders.filter((o) => o.domain !== sender);
  currentData.top10 = currentData.offenders.slice(0, 10);
  currentData.uniqueSenders = currentData.offenders.length;
  renderResults(currentData);
}

function renderResults(data: AnalyzeData): void {
  document.getElementById('totalEmails')!.textContent = formatNumber(data.totalMessages);
  document.getElementById('totalSize')!.textContent = formatSize(data.offenders.reduce((s, o) => s + o.size, 0));
  document.getElementById('uniqueSenders')!.textContent = formatNumber(data.uniqueSenders);
  document.getElementById('top10Count')!.textContent = formatNumber(data.top10.reduce((s, o) => s + o.count, 0));

  const list = document.getElementById('offendersList')!;
  list.innerHTML = '';

  data.top10.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'offender';

    const rank = document.createElement('div');
    rank.className = `rank ${i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : ''}`;
    rank.textContent = String(i + 1);

    const details = document.createElement('div');
    const domainEl = document.createElement('div');
    domainEl.className = 'domain';
    domainEl.textContent = item.domain;
    const categoryEl = document.createElement('div');
    categoryEl.className = 'cat';
    categoryEl.textContent = item.category;
    details.appendChild(domainEl);
    details.appendChild(categoryEl);

    const count = document.createElement('div');
    count.className = 'count';
    const countNum = document.createElement('span');
    countNum.textContent = formatNumber(item.count);
    const sizeSmall = document.createElement('small');
    sizeSmall.textContent = formatSize(item.size);
    count.appendChild(countNum);
    count.appendChild(sizeSmall);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-clean-single';
    button.textContent = t('btn.clean');
    button.addEventListener('click', () => cleanSender(item.domain));

    row.appendChild(rank);
    row.appendChild(details);
    row.appendChild(count);
    row.appendChild(button);
    list.appendChild(row);
  });
}

async function cleanSender(sender: string): Promise<void> {
  if (!confirm(t('confirm.cleanSender', { sender }))) return;
  showLoading();
  try {
    const data = await gmail.clean(sender);
    toast(t('toast.cleaned', { n: data.removed }));
    removeSenderLocally(sender);
  } catch (error: any) {
    if (error instanceof gmail.UnauthorizedError) {
      handleUnauthorized();
      return;
    }
    console.error('Erro ao limpar:', error);
    toast(`❌ ${error.message}`);
  } finally {
    hideLoading();
  }
}

async function cleanAll(): Promise<void> {
  if (!currentData?.top10?.length) return;
  if (!confirm(t('confirm.cleanAll'))) return;

  showLoading();
  let totalRemoved = 0;
  let totalFailed = 0;

  // Cópia da lista: removeSenderLocally mexe no top10 durante o loop
  const targets = [...currentData.top10];
  for (const item of targets) {
    try {
      const data = await gmail.clean(item.domain);
      totalRemoved += data.removed || 0;
      totalFailed += data.failed || 0;
      removeSenderLocally(item.domain);
    } catch (error: any) {
      if (error instanceof gmail.UnauthorizedError) {
        hideLoading();
        handleUnauthorized();
        return;
      }
      totalFailed++;
    }
  }

  if (totalFailed > 0) {
    toast(t('toast.cleanAllPartial', { removed: totalRemoved, failed: totalFailed }));
  } else {
    toast(t('toast.cleaned', { n: totalRemoved }));
  }
  hideLoading();
}

function showLoading(): void { document.getElementById('loading')!.classList.add('show'); }
function hideLoading(): void { document.getElementById('loading')!.classList.remove('show'); }

function toast(msg: string): void {
  const el = document.getElementById('toast')!;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function formatNumber(n: number): string { return Number(n).toLocaleString(LOCALES[currentLang] || 'pt-BR'); }

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
