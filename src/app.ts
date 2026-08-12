import * as auth from './auth';
import * as gmail from './gmail';
import type { AnalyzeData } from './gmail';

type Lang = 'pt' | 'en' | 'es' | 'fr' | 'it' | 'ru' | 'zh';

let currentData: AnalyzeData | null = null;
let currentLang: Lang = 'pt';

const LANG_FLAG_CLASSES: Record<Lang, string> = {
  pt: 'fi fi-br', en: 'fi fi-us', es: 'fi fi-es', fr: 'fi fi-fr',
  it: 'fi fi-it', ru: 'fi fi-ru', zh: 'fi fi-cn'
};
const LANG_LABELS: Record<Lang, string> = {
  pt: 'PT', en: 'EN', es: 'ES', fr: 'FR', it: 'IT', ru: 'RU', zh: '中文'
};

// ===================== i18n =====================
const LOCALES: Record<Lang, string> = {
  pt: 'pt-BR', en: 'en-US', es: 'es-ES', fr: 'fr-FR',
  it: 'it-IT', ru: 'ru-RU', zh: 'zh-CN'
};

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  pt: {
    'subtitle': '🔐 Conectado ao Gmail via OAuth2',
    'auth.title': '🔒 Conectar ao Gmail',
    'auth.desc': 'Autorize o acesso à sua conta Gmail para analisar os remetentes que mais lotam sua caixa e movê-los para a lixeira.',
    'auth.loginBtn': 'Entrar com Google',
    'auth.note': '🔐 Autenticação OAuth2 oficial do Google<br>🗑️ Permissão para ler e mover seus emails para a lixeira',
    'results.title': '🏆 Ranking de remetentes',
    'loading.reading': '📖 Lendo emails… {done}/{total}',
    'loading.readingStart': '📖 Lendo a caixa postal…',
    'loading.waiting': '⏳ Aguarde…',
    'loading.readDone': '✅ Leitura concluída — {total} emails',
    'loading.ranking': '⏳ Aguarde… montando o ranking',
    'btn.cleanAll': '🗑️ Limpar Tudo',
    'btn.logout': '🚪 Sair',
    'stat.analyzed': 'Emails analisados',
    'stat.space': 'Espaço total',
    'stat.senders': 'Remetentes únicos',
    'stat.top10': 'Top 10 (emails)',
    'list.title': '📬 Top 10 Ofensores',
    'btn.clean': 'Limpar',
    'toast.authSuccess': '✅ Autenticado com sucesso!',
    'toast.authError': '❌ Erro na autenticação. Tente novamente.',
    'toast.authErrorDetail': '❌ Erro na autenticação: {detail}',
    'toast.authCancelled': '⚠️ Login cancelado',
    'toast.sessionExpired': '🔒 Sessão expirada. Entre novamente.',
    'toast.logoutError': '❌ Erro ao desconectar',
    'toast.loadError': '❌ Erro ao carregar dados',
    'toast.loadErrorDetail': '❌ Erro ao carregar dados: {detail}',
    'toast.analyzeErrorDetail': '❌ Erro ao analisar: {detail}',
    'toast.analyzing': '🔍 Analisando caixa postal...',
    'toast.analyzePartial': '✅ Análise parcial: {ok} ok, {failed} falharam',
    'toast.analyzeDone': '✅ Análise concluída!',
    'toast.analyzeError': '❌ Erro ao analisar',
    'confirm.cleanSender': 'Mover emails de {sender} para a lixeira?',
    'confirm.cleanAll': 'Mover para a lixeira TODOS os {senders} remetentes da lista ({emails} emails)?',
    'toast.cleaned': '✅ {n} emails movidos para a lixeira',
    'toast.cleanAllPartial': '⚠️ {removed} movidos; {failed} falharam',
    'protected.tooltip': 'Sua própria conta — protegida contra limpeza',
    'error.ownAddress': '🔒 Não é possível limpar o seu próprio endereço — isso moveria seus e-mails enviados para a lixeira',
    'cat.social': 'Rede Social',
    'cat.google': 'Google',
    'cat.devops': 'DevOps',
    'cat.delivery': 'Delivery',
    'cat.shopping': 'Compras',
    'cat.design': 'Design',
    'cat.infra': 'Infraestrutura',
    'cat.collab': 'Colaboração',
    'cat.news': 'Notícias',
    'cat.content': 'Conteúdo',
    'cat.other': 'Outros'
  },
  en: {
    'subtitle': '🔐 Connected to Gmail via OAuth2',
    'auth.title': '🔒 Connect to Gmail',
    'auth.desc': 'Authorize access to your Gmail account to analyze the senders that clutter your inbox the most and move them to the trash.',
    'auth.loginBtn': 'Sign in with Google',
    'auth.note': '🔐 Official Google OAuth2 authentication<br>🗑️ Permission to read and move your emails to the trash',
    'results.title': '🏆 Sender ranking',
    'loading.reading': '📖 Reading emails… {done}/{total}',
    'loading.readingStart': '📖 Reading your mailbox…',
    'loading.waiting': '⏳ Please wait…',
    'loading.readDone': '✅ Reading complete — {total} emails',
    'loading.ranking': '⏳ Please wait… building the ranking',
    'btn.cleanAll': '🗑️ Clean All',
    'btn.logout': '🚪 Sign out',
    'stat.analyzed': 'Emails analyzed',
    'stat.space': 'Total space',
    'stat.senders': 'Unique senders',
    'stat.top10': 'Top 10 (emails)',
    'list.title': '📬 Top 10 Offenders',
    'btn.clean': 'Clean',
    'toast.authSuccess': '✅ Successfully authenticated!',
    'toast.authError': '❌ Authentication error. Please try again.',
    'toast.authErrorDetail': '❌ Authentication error: {detail}',
    'toast.authCancelled': '⚠️ Sign-in cancelled',
    'toast.sessionExpired': '🔒 Session expired. Please sign in again.',
    'toast.logoutError': '❌ Error signing out',
    'toast.loadError': '❌ Error loading data',
    'toast.loadErrorDetail': '❌ Error loading data: {detail}',
    'toast.analyzeErrorDetail': '❌ Error analyzing: {detail}',
    'toast.analyzing': '🔍 Analyzing your mailbox...',
    'toast.analyzePartial': '✅ Partial analysis: {ok} ok, {failed} failed',
    'toast.analyzeDone': '✅ Analysis complete!',
    'toast.analyzeError': '❌ Error analyzing',
    'confirm.cleanSender': 'Move emails from {sender} to the trash?',
    'confirm.cleanAll': 'Move ALL {senders} senders on the list to the trash ({emails} emails)?',
    'toast.cleaned': '✅ {n} emails moved to the trash',
    'toast.cleanAllPartial': '⚠️ {removed} moved; {failed} failed',
    'protected.tooltip': 'Your own account — protected from cleaning',
    'error.ownAddress': '🔒 You cannot clean your own address — that would move your sent mail to the trash',
    'cat.social': 'Social',
    'cat.google': 'Google',
    'cat.devops': 'DevOps',
    'cat.delivery': 'Delivery',
    'cat.shopping': 'Shopping',
    'cat.design': 'Design',
    'cat.infra': 'Infrastructure',
    'cat.collab': 'Collaboration',
    'cat.news': 'News',
    'cat.content': 'Content',
    'cat.other': 'Other'
  },
  es: {
    'subtitle': '🔐 Conectado a Gmail vía OAuth2',
    'auth.title': '🔒 Conectar a Gmail',
    'auth.desc': 'Autoriza el acceso a tu cuenta de Gmail para analizar los remitentes que más saturan tu bandeja y moverlos a la papelera.',
    'auth.loginBtn': 'Iniciar sesión con Google',
    'auth.note': '🔐 Autenticación OAuth2 oficial de Google<br>🗑️ Permiso para leer y mover tus correos a la papelera',
    'results.title': '🏆 Ranking de remitentes',
    'loading.reading': '📖 Leyendo correos… {done}/{total}',
    'loading.readingStart': '📖 Leyendo tu buzón…',
    'loading.waiting': '⏳ Espera…',
    'loading.readDone': '✅ Lectura completada — {total} correos',
    'loading.ranking': '⏳ Espera… armando el ranking',
    'btn.cleanAll': '🗑️ Limpiar Todo',
    'btn.logout': '🚪 Salir',
    'stat.analyzed': 'Correos analizados',
    'stat.space': 'Espacio total',
    'stat.senders': 'Remitentes únicos',
    'stat.top10': 'Top 10 (correos)',
    'list.title': '📬 Top 10 Infractores',
    'btn.clean': 'Limpiar',
    'toast.authSuccess': '✅ ¡Autenticado correctamente!',
    'toast.authError': '❌ Error de autenticación. Inténtalo de nuevo.',
    'toast.authErrorDetail': '❌ Error de autenticación: {detail}',
    'toast.authCancelled': '⚠️ Inicio de sesión cancelado',
    'toast.sessionExpired': '🔒 Sesión expirada. Inicia sesión de nuevo.',
    'toast.logoutError': '❌ Error al cerrar sesión',
    'toast.loadError': '❌ Error al cargar los datos',
    'toast.loadErrorDetail': '❌ Error al cargar los datos: {detail}',
    'toast.analyzeErrorDetail': '❌ Error al analizar: {detail}',
    'toast.analyzing': '🔍 Analizando tu buzón...',
    'toast.analyzePartial': '✅ Análisis parcial: {ok} ok, {failed} fallaron',
    'toast.analyzeDone': '✅ ¡Análisis completado!',
    'toast.analyzeError': '❌ Error al analizar',
    'confirm.cleanSender': '¿Mover los correos de {sender} a la papelera?',
    'confirm.cleanAll': '¿Mover a la papelera TODOS los {senders} remitentes de la lista ({emails} correos)?',
    'toast.cleaned': '✅ {n} correos movidos a la papelera',
    'toast.cleanAllPartial': '⚠️ {removed} movidos; {failed} fallaron',
    'protected.tooltip': 'Tu propia cuenta: protegida contra la limpieza',
    'error.ownAddress': '🔒 No puedes limpiar tu propia dirección: eso movería tus correos enviados a la papelera',
    'cat.social': 'Red Social',
    'cat.google': 'Google',
    'cat.devops': 'DevOps',
    'cat.delivery': 'Delivery',
    'cat.shopping': 'Compras',
    'cat.design': 'Diseño',
    'cat.infra': 'Infraestructura',
    'cat.collab': 'Colaboración',
    'cat.news': 'Noticias',
    'cat.content': 'Contenido',
    'cat.other': 'Otros'
  },
  fr: {
    'subtitle': '🔐 Connecté à Gmail via OAuth2',
    'auth.title': '🔒 Se connecter à Gmail',
    'auth.desc': 'Autorisez l’accès à votre compte Gmail pour analyser les expéditeurs qui encombrent le plus votre boîte et les déplacer vers la corbeille.',
    'auth.loginBtn': 'Se connecter avec Google',
    'auth.note': '🔐 Authentification OAuth2 officielle de Google<br>🗑️ Autorisation de lire et déplacer vos e-mails vers la corbeille',
    'results.title': '🏆 Classement des expéditeurs',
    'loading.reading': '📖 Lecture des e-mails… {done}/{total}',
    'loading.readingStart': '📖 Lecture de votre boîte…',
    'loading.waiting': '⏳ Veuillez patienter…',
    'loading.readDone': '✅ Lecture terminée — {total} e-mails',
    'loading.ranking': '⏳ Veuillez patienter… constitution du classement',
    'btn.cleanAll': '🗑️ Tout nettoyer',
    'btn.logout': '🚪 Se déconnecter',
    'stat.analyzed': 'E-mails analysés',
    'stat.space': 'Espace total',
    'stat.senders': 'Expéditeurs uniques',
    'stat.top10': 'Top 10 (e-mails)',
    'list.title': '📬 Top 10 des Indésirables',
    'btn.clean': 'Nettoyer',
    'toast.authSuccess': '✅ Authentification réussie !',
    'toast.authError': '❌ Erreur d’authentification. Veuillez réessayer.',
    'toast.authErrorDetail': '❌ Erreur d’authentification : {detail}',
    'toast.authCancelled': '⚠️ Connexion annulée',
    'toast.sessionExpired': '🔒 Session expirée. Veuillez vous reconnecter.',
    'toast.logoutError': '❌ Erreur lors de la déconnexion',
    'toast.loadError': '❌ Erreur lors du chargement des données',
    'toast.loadErrorDetail': '❌ Erreur lors du chargement des données : {detail}',
    'toast.analyzeErrorDetail': '❌ Erreur lors de l’analyse : {detail}',
    'toast.analyzing': '🔍 Analyse de votre boîte de réception...',
    'toast.analyzePartial': '✅ Analyse partielle : {ok} ok, {failed} échoués',
    'toast.analyzeDone': '✅ Analyse terminée !',
    'toast.analyzeError': '❌ Erreur lors de l’analyse',
    'confirm.cleanSender': 'Déplacer les e-mails de {sender} vers la corbeille ?',
    'confirm.cleanAll': 'Déplacer vers la corbeille TOUS les {senders} expéditeurs de la liste ({emails} e-mails) ?',
    'toast.cleaned': '✅ {n} e-mails déplacés vers la corbeille',
    'toast.cleanAllPartial': '⚠️ {removed} déplacés ; {failed} échoués',
    'protected.tooltip': 'Votre propre compte — protégé du nettoyage',
    'error.ownAddress': '🔒 Impossible de nettoyer votre propre adresse — cela déplacerait vos e-mails envoyés vers la corbeille',
    'cat.social': 'Réseau social',
    'cat.google': 'Google',
    'cat.devops': 'DevOps',
    'cat.delivery': 'Livraison',
    'cat.shopping': 'Achats',
    'cat.design': 'Design',
    'cat.infra': 'Infrastructure',
    'cat.collab': 'Collaboration',
    'cat.news': 'Actualités',
    'cat.content': 'Contenu',
    'cat.other': 'Autres'
  },
  it: {
    'subtitle': '🔐 Connesso a Gmail tramite OAuth2',
    'auth.title': '🔒 Connettersi a Gmail',
    'auth.desc': 'Autorizza l’accesso al tuo account Gmail per analizzare i mittenti che intasano di più la tua casella e spostarli nel cestino.',
    'auth.loginBtn': 'Accedi con Google',
    'auth.note': '🔐 Autenticazione OAuth2 ufficiale di Google<br>🗑️ Autorizzazione a leggere e spostare le tue email nel cestino',
    'results.title': '🏆 Classifica dei mittenti',
    'loading.reading': '📖 Lettura delle email… {done}/{total}',
    'loading.readingStart': '📖 Lettura della casella…',
    'loading.waiting': '⏳ Attendere…',
    'loading.readDone': '✅ Lettura completata — {total} email',
    'loading.ranking': '⏳ Attendere… creazione della classifica',
    'btn.cleanAll': '🗑️ Pulisci tutto',
    'btn.logout': '🚪 Esci',
    'stat.analyzed': 'Email analizzate',
    'stat.space': 'Spazio totale',
    'stat.senders': 'Mittenti unici',
    'stat.top10': 'Top 10 (email)',
    'list.title': '📬 Top 10 Responsabili',
    'btn.clean': 'Pulisci',
    'toast.authSuccess': '✅ Autenticazione riuscita!',
    'toast.authError': '❌ Errore di autenticazione. Riprova.',
    'toast.authErrorDetail': '❌ Errore di autenticazione: {detail}',
    'toast.authCancelled': '⚠️ Accesso annullato',
    'toast.sessionExpired': '🔒 Sessione scaduta. Accedi di nuovo.',
    'toast.logoutError': '❌ Errore durante la disconnessione',
    'toast.loadError': '❌ Errore nel caricamento dei dati',
    'toast.loadErrorDetail': '❌ Errore nel caricamento dei dati: {detail}',
    'toast.analyzeErrorDetail': '❌ Errore durante l’analisi: {detail}',
    'toast.analyzing': '🔍 Analisi della casella in corso...',
    'toast.analyzePartial': '✅ Analisi parziale: {ok} ok, {failed} non riuscite',
    'toast.analyzeDone': '✅ Analisi completata!',
    'toast.analyzeError': '❌ Errore durante l’analisi',
    'confirm.cleanSender': 'Spostare le email di {sender} nel cestino?',
    'confirm.cleanAll': 'Spostare nel cestino TUTTI i {senders} mittenti dell’elenco ({emails} email)?',
    'toast.cleaned': '✅ {n} email spostate nel cestino',
    'toast.cleanAllPartial': '⚠️ {removed} spostate; {failed} non riuscite',
    'protected.tooltip': 'Il tuo account — protetto dalla pulizia',
    'error.ownAddress': '🔒 Non puoi pulire il tuo indirizzo — sposteresti nel cestino le tue email inviate',
    'cat.social': 'Social',
    'cat.google': 'Google',
    'cat.devops': 'DevOps',
    'cat.delivery': 'Consegne',
    'cat.shopping': 'Acquisti',
    'cat.design': 'Design',
    'cat.infra': 'Infrastruttura',
    'cat.collab': 'Collaborazione',
    'cat.news': 'Notizie',
    'cat.content': 'Contenuti',
    'cat.other': 'Altro'
  },
  ru: {
    'subtitle': '🔐 Подключено к Gmail через OAuth2',
    'auth.title': '🔒 Подключиться к Gmail',
    'auth.desc': 'Разрешите доступ к вашему аккаунту Gmail, чтобы проанализировать отправителей, которые больше всего забивают ваш ящик, и переместить их письма в корзину.',
    'auth.loginBtn': 'Войти через Google',
    'auth.note': '🔐 Официальная аутентификация Google OAuth2<br>🗑️ Разрешение читать письма и перемещать их в корзину',
    'results.title': '🏆 Рейтинг отправителей',
    'loading.reading': '📖 Чтение писем… {done}/{total}',
    'loading.readingStart': '📖 Читаем почтовый ящик…',
    'loading.waiting': '⏳ Подождите…',
    'loading.readDone': '✅ Чтение завершено — писем: {total}',
    'loading.ranking': '⏳ Подождите… составляем рейтинг',
    'btn.cleanAll': '🗑️ Очистить всё',
    'btn.logout': '🚪 Выйти',
    'stat.analyzed': 'Писем проанализировано',
    'stat.space': 'Всего места',
    'stat.senders': 'Уникальных отправителей',
    'stat.top10': 'Топ-10 (письма)',
    'list.title': '📬 Топ-10 нарушителей',
    'btn.clean': 'Очистить',
    'toast.authSuccess': '✅ Вход выполнен успешно!',
    'toast.authError': '❌ Ошибка аутентификации. Попробуйте ещё раз.',
    'toast.authErrorDetail': '❌ Ошибка аутентификации: {detail}',
    'toast.authCancelled': '⚠️ Вход отменён',
    'toast.sessionExpired': '🔒 Сессия истекла. Войдите снова.',
    'toast.logoutError': '❌ Ошибка при выходе',
    'toast.loadError': '❌ Ошибка загрузки данных',
    'toast.loadErrorDetail': '❌ Ошибка загрузки данных: {detail}',
    'toast.analyzeErrorDetail': '❌ Ошибка при анализе: {detail}',
    'toast.analyzing': '🔍 Анализ почтового ящика...',
    'toast.analyzePartial': '✅ Частичный анализ: {ok} успешно, {failed} с ошибкой',
    'toast.analyzeDone': '✅ Анализ завершён!',
    'toast.analyzeError': '❌ Ошибка при анализе',
    'confirm.cleanSender': 'Переместить письма от {sender} в корзину?',
    'confirm.cleanAll': 'Переместить в корзину ВСЕХ отправителей из списка — {senders} ({emails} писем)?',
    'toast.cleaned': '✅ {n} писем перемещено в корзину',
    'toast.cleanAllPartial': '⚠️ {removed} перемещено; {failed} с ошибкой',
    'protected.tooltip': 'Ваш собственный аккаунт — защищён от очистки',
    'error.ownAddress': '🔒 Нельзя очистить собственный адрес — это переместит отправленные письма в корзину',
    'cat.social': 'Соцсети',
    'cat.google': 'Google',
    'cat.devops': 'DevOps',
    'cat.delivery': 'Доставка',
    'cat.shopping': 'Покупки',
    'cat.design': 'Дизайн',
    'cat.infra': 'Инфраструктура',
    'cat.collab': 'Совместная работа',
    'cat.news': 'Новости',
    'cat.content': 'Контент',
    'cat.other': 'Другое'
  },
  zh: {
    'subtitle': '🔐 已通过 OAuth2 连接到 Gmail',
    'auth.title': '🔒 连接到 Gmail',
    'auth.desc': '授权访问你的 Gmail 账号，以便分析最占用收件箱的发件人并将其邮件移至垃圾箱。',
    'auth.loginBtn': '使用 Google 登录',
    'auth.note': '🔐 官方 Google OAuth2 身份验证<br>🗑️ 读取邮件并将其移至垃圾箱的权限',
    'results.title': '🏆 发件人排行',
    'loading.reading': '📖 正在读取邮件… {done}/{total}',
    'loading.readingStart': '📖 正在读取收件箱…',
    'loading.waiting': '⏳ 请稍候…',
    'loading.readDone': '✅ 读取完成 — 共 {total} 封邮件',
    'loading.ranking': '⏳ 请稍候… 正在生成排行',
    'btn.cleanAll': '🗑️ 全部清理',
    'btn.logout': '🚪 退出',
    'stat.analyzed': '已分析邮件',
    'stat.space': '总占用空间',
    'stat.senders': '独立发件人',
    'stat.top10': '前 10 名（邮件数）',
    'list.title': '📬 前 10 名骚扰发件人',
    'btn.clean': '清理',
    'toast.authSuccess': '✅ 认证成功！',
    'toast.authError': '❌ 认证失败，请重试。',
    'toast.authErrorDetail': '❌ 认证失败：{detail}',
    'toast.authCancelled': '⚠️ 已取消登录',
    'toast.sessionExpired': '🔒 会话已过期，请重新登录。',
    'toast.logoutError': '❌ 退出时出错',
    'toast.loadError': '❌ 加载数据时出错',
    'toast.loadErrorDetail': '❌ 加载数据时出错：{detail}',
    'toast.analyzeErrorDetail': '❌ 分析时出错：{detail}',
    'toast.analyzing': '🔍 正在分析收件箱…',
    'toast.analyzePartial': '✅ 部分分析完成：{ok} 成功，{failed} 失败',
    'toast.analyzeDone': '✅ 分析完成！',
    'toast.analyzeError': '❌ 分析时出错',
    'confirm.cleanSender': '将来自 {sender} 的邮件移至垃圾箱？',
    'confirm.cleanAll': '将列表中全部 {senders} 位发件人的 {emails} 封邮件移至垃圾箱？',
    'toast.cleaned': '✅ 已将 {n} 封邮件移至垃圾箱',
    'toast.cleanAllPartial': '⚠️ 已移动 {removed} 封；{failed} 封失败',
    'protected.tooltip': '您自己的账户 — 已受保护，不会被清理',
    'error.ownAddress': '🔒 无法清理您自己的地址 — 那会把已发送邮件移到垃圾箱',
    'cat.social': '社交媒体',
    'cat.google': 'Google',
    'cat.devops': 'DevOps',
    'cat.delivery': '外卖配送',
    'cat.shopping': '购物',
    'cat.design': '设计',
    'cat.infra': '基础设施',
    'cat.collab': '协作办公',
    'cat.news': '新闻',
    'cat.content': '内容平台',
    'cat.other': '其他'
  }
};

function t(key: string, params: Record<string, string | number> = {}): string {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.pt;
  let str = dict[key] ?? TRANSLATIONS.pt[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    // Substituição por função: os valores agora incluem mensagens cruas de
    // erro do Google, e um '$&' perdido no meio seria interpretado como
    // padrão de replace se passássemos a string direto.
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), () => String(v));
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

// O plugin nativo entrega o motivo real da falha ora em .message, ora em
// .code (USER_CANCELLED, access_denied, 12501...). Sem olhar os dois, "conta
// fora dos Test users" fica indistinguível de "usuário fechou a caixa".
function describeError(error: any): string {
  const raw = error?.message || error?.code || '';
  return String(raw).trim();
}

function isCancellation(error: any): boolean {
  const signal = `${error?.code ?? ''} ${error?.message ?? ''}`.toUpperCase();
  return signal.includes('CANCEL');
}

async function loginGoogle(): Promise<void> {
  try {
    // Abre a caixa nativa do Android (contas do aparelho + consentimento)
    await auth.signIn();
    toast(t('toast.authSuccess'));
    await loadUserData();
  } catch (error: any) {
    console.error('Erro no login:', error);
    // Fechar a caixa de contas não é falha: merece aviso neutro, não um
    // erro vermelho pedindo para "tentar de novo".
    if (isCancellation(error)) {
      toast(t('toast.authCancelled'));
      return;
    }
    const detail = describeError(error);
    toast(detail ? t('toast.authErrorDetail', { detail }) : t('toast.authError'));
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
    const detail = describeError(error);
    toast(detail ? t('toast.loadErrorDetail', { detail }) : t('toast.loadError'));
  } finally {
    hideLoading();
  }
}

async function refreshAnalysis(): Promise<void> {
  showLoading();
  toast(t('toast.analyzing'));
  try {
    const data: AnalyzeData = await gmail.analyze(reportProgress);
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
    const detail = describeError(error);
    toast(detail ? t('toast.analyzeErrorDetail', { detail }) : t('toast.analyzeError'));
  } finally {
    hideLoading();
  }
}

// Atualização otimista: remove o remetente limpo da lista local e re-renderiza
// na hora, sem pagar a análise completa de novo (que agora leva ~1min, porque
// conta exatamente TODOS os remetentes, não só os 25 primeiros). Reabrir o app
// refaz a análise quando o usuário quiser re-verificar.
function removeSenderLocally(sender: string): void {
  removeSendersLocally([sender]);
}

/**
 * Versão em lote: o "Limpar Tudo" remove centenas de remetentes, e chamar a
 * versão de um em um redesenharia a lista inteira uma vez por remetente.
 */
function removeSendersLocally(senders: string[]): void {
  if (!currentData || senders.length === 0) return;
  const removed = new Set(senders);
  currentData.offenders = currentData.offenders.filter((o) => !removed.has(o.sender));
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

  // Sempre os 10 maiores ofensores. A contagem exata roda para todos os
  // remetentes descobertos (ver EXACT_COUNT_LIMIT em gmail.ts), mas isso serve
  // para ACERTAR quem são os 10 — não para alongar a lista. Antes, com a
  // contagem exata limitada aos 25 primeiros da amostra, um remetente com
  // poucos e-mails recentes e muitos no total podia ficar de fora do pódio
  // por engano.
  data.top10.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'offender';

    const rank = document.createElement('div');
    rank.className = `rank ${i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : ''}`;
    rank.textContent = String(i + 1);

    const details = document.createElement('div');
    const domainEl = document.createElement('div');
    domainEl.className = 'domain';
    domainEl.textContent = item.sender;
    if (item.isProtected) {
      // Cadeado depois do endereço: sinaliza "protegido", não "removido" —
      // por isso um ícone, e não texto taxado.
      const lock = document.createElement('span');
      lock.className = 'lock';
      lock.textContent = ' 🔒';
      lock.title = t('protected.tooltip');
      lock.setAttribute('aria-label', t('protected.tooltip'));
      domainEl.appendChild(lock);
    }
    // Domínio ao lado da categoria: identifica de quem é o endereço sem
    // esconder que cada remetente do mesmo domínio é uma linha separada.
    const categoryEl = document.createElement('div');
    categoryEl.className = 'cat';
    categoryEl.textContent = `${item.domain} · ${t(item.category)}`;
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
    if (item.isProtected) {
      button.disabled = true;
      button.title = t('protected.tooltip');
      button.setAttribute('aria-disabled', 'true');
    } else {
      button.addEventListener('click', () => cleanSender(item.sender));
    }

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
    // A trava do próprio endereço não é falha técnica: merece a explicação
    // traduzida, não o código cru que gmail.clean() lança.
    if (error?.message === 'own_address') {
      toast(t('error.ownAddress'));
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

  // "Limpar Tudo" = todos os e-mails dos 10 ofensores em tela, não a conta
  // inteira. A conta do próprio usuário fica de fora: clean() a recusaria e o
  // botão acabaria reportando uma falha que não é falha.
  const targets = currentData.top10.filter((o) => !o.isProtected);
  if (targets.length === 0) return;

  // A confirmação mostra o tamanho do estrago antes de perguntar: são 10
  // remetentes, mas podem somar milhares de e-mails.
  const totals = {
    senders: formatNumber(targets.length),
    emails: formatNumber(targets.reduce((sum, o) => sum + o.count, 0))
  };
  if (!confirm(t('confirm.cleanAll', totals))) return;

  showLoading();
  let totalRemoved = 0;
  let totalFailed = 0;
  let done = 0;
  let unauthorized = false;
  const cleaned: string[] = [];

  // Em ondas, não um de cada vez. A cota do Gmail é de 250 unidades por
  // segundo por usuário, e cada remetente custa ~55 (5 para listar + 50 para o
  // batchModify). Quatro por vez com 700ms de pausa dá ~185 unidades/s —
  // abaixo do teto. Com 10 remetentes que costumam somar milhares de e-mails,
  // a diferença aparece na varredura de cada um.
  const CONCURRENCY = 4;
  const PAUSE_MS = 700;

  for (let i = 0; i < targets.length && !unauthorized; i += CONCURRENCY) {
    reportProgress('reading', done, targets.length);
    const wave = targets.slice(i, i + CONCURRENCY);

    await Promise.all(
      wave.map(async (item) => {
        try {
          const data = await gmail.clean(item.sender);
          totalRemoved += data.removed || 0;
          totalFailed += data.failed || 0;
          cleaned.push(item.sender);
        } catch (error: any) {
          // Não relança: uma rejeição aqui abortaria as outras da mesma onda
          // sem contabilizar o que elas já fizeram.
          if (error instanceof gmail.UnauthorizedError) unauthorized = true;
          else totalFailed++;
        } finally {
          done++;
        }
      })
    );

    if (!unauthorized && i + CONCURRENCY < targets.length) {
      reportProgress('waiting', done, targets.length);
      await sleep(PAUSE_MS);
    }
  }

  // Um redesenho só, no fim, em vez de um por remetente.
  removeSendersLocally(cleaned);
  hideLoading();

  if (unauthorized) {
    handleUnauthorized();
    return;
  }

  if (totalFailed > 0) {
    toast(t('toast.cleanAllPartial', { removed: totalRemoved, failed: totalFailed }));
  } else {
    toast(t('toast.cleaned', { n: totalRemoved }));
  }
}

function showLoading(): void { document.getElementById('loading')!.classList.add('show'); }

function hideLoading(): void {
  document.getElementById('loading')!.classList.remove('show');
  setLoadingStatus('');
  // Zera a fase anunciada: sem isso, uma segunda análise comecaria na mesma
  // fase da anterior e o leitor de tela nao anunciaria nada.
  announcePhase('', '');
}

/** Texto sob o spinner. String vazia limpa. */
function setLoadingStatus(text: string): void {
  document.getElementById('loadingStatus')!.textContent = text;
}

/**
 * Anúncio para leitor de tela. Só é escrito quando a FASE muda: o texto visível
 * muda uma vez por e-mail e, se isso fosse para a região viva, o leitor falaria
 * ininterruptamente durante os ~30s da leitura.
 */
let announcedPhase: gmail.ProgressPhase | '' = '';
function announcePhase(phase: gmail.ProgressPhase | '', text: string): void {
  if (phase === announcedPhase) return;
  announcedPhase = phase;
  document.getElementById('loadingAnnounce')!.textContent = text;
}

/** Traduz o progresso de gmail.ts para o texto do overlay. */
function reportProgress(phase: gmail.ProgressPhase, done: number, total: number): void {
  const text =
    phase === 'waiting' ? t('loading.waiting')
    : phase === 'ranking' ? t('loading.ranking')
    : phase === 'readDone' ? t('loading.readDone', { total: formatNumber(total) })
    : t('loading.reading', { done: formatNumber(done), total: formatNumber(total) });

  setLoadingStatus(text);
  // Na leitura, anuncia só a entrada na fase — sem o contador, que e o que
  // mudava a cada mensagem. As demais fases sao uma frase fixa cada.
  announcePhase(phase, phase === 'reading' ? t('loading.readingStart') : text);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
