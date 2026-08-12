# Ficha da Play Store — Gmail Cleaner Buddy

Textos prontos para colar no Play Console (Painel do app → Ficha principal da loja).
Limites do Google: **nome do app ≤ 30 caracteres**, **descrição curta ≤ 80**,
**descrição completa ≤ 4000**.

## Recursos da ficha (já prontos)
- **Ícone 512×512:** `store/icon-512.png`
- **Feature graphic 1024×500:** `store/feature-graphics/feature-<idioma>.png` — um por idioma da ficha.
  Gerados por `node scripts/make-feature-graphic.mjs` a partir de `store/feature-graphic.html`
  (Chrome headless; PNG RGB sem alpha, como a Play exige). Para mudar texto ou visual,
  edite o HTML e rode o script de novo.
- **Screenshots do celular:** `store/screenshots/01-login.png`, `02-analise.png`, `03-ranking.png` — 1179×2556 (tela de celular), em inglês.
  Gerados por `node scripts/make-screenshots.mjs` a partir de `store/screenshot.html`, que monta as telas
  do app com o CSS de produção (`www/style.css`) e **dados de exemplo** — não são capturas de uma conta real.
  A Play cobra que a imagem represente o app de verdade: ao mudar layout ou textos da interface, rode o script de novo.
- **Política de Privacidade (URL pública):** https://mbastida43.github.io/gmailcleanerbuddy/privacy.html
- **App Bundle para upload:** `android/app/build/outputs/bundle/release/app-release.aab`
  (gerado por `npm run build:aab`; os `.apk`/`.aab` não são versionados)

---

## 🇧🇷 Português (pt-BR) — idioma padrão

**Nome do app** (≤30)
```
Gmail Cleaner Buddy
```

**Descrição curta** (≤80)
```
Analise quem mais lota seu Gmail e mande esses remetentes para a lixeira.
```

**Descrição completa** (≤4000)
```
O Gmail Cleaner Buddy encontra os remetentes que mais lotam a sua caixa de entrada e deixa você limpá-los com um toque.

Cansado de milhares de e-mails de newsletters, promoções e notificações? O app analisa a sua conta, monta o ranking "Top 10 Ofensores" — os endereços que mais enviam e-mails repetidos para você — e move todos os e-mails deles para a lixeira de uma vez.

COMO FUNCIONA
• Conecte sua conta com o login oficial do Google (OAuth2).
• O app analisa a sua caixa e conta com precisão quantos e-mails cada remetente enviou.
• Veja o Top 10 Ofensores, com categoria e volume.
• Toque para mandar todos os e-mails de um remetente para a lixeira — ou limpe o Top 10 de uma vez.

PRIVACIDADE EM PRIMEIRO LUGAR
• Login oficial do Google — o app nunca vê a sua senha.
• Nenhuma credencial fica salva no aparelho: o acesso vive só na memória e expira em cerca de 1 hora.
• Os e-mails são movidos para a Lixeira do próprio Gmail (recuperáveis por 30 dias) — nada é apagado permanentemente.
• O app não lê o conteúdo das suas mensagens: apenas o endereço do remetente é usado para montar o ranking.

RECURSOS
• Top 10 Ofensores: os remetentes que mais lotam a sua caixa
• Contagem exata de e-mails por remetente
• Limpeza em massa com um toque
• Categorias automáticas (redes sociais, compras, notícias e mais)
• Interface em Português, Inglês, Espanhol, Francês, Italiano, Russo e Chinês

Recupere o controle da sua caixa de entrada. Baixe o Gmail Cleaner Buddy.
```

---

## 🇺🇸 English (en-US)

**App name** (≤30)
```
Gmail Cleaner Buddy
```

**Short description** (≤80)
```
See who floods your Gmail the most and send those senders to the trash.
```

**Full description** (≤4000)
```
Gmail Cleaner Buddy finds the senders that flood your inbox the most and lets you clean them out with a single tap.

Tired of thousands of newsletters, promotions and notifications? The app scans your account, builds the "Top 10 Offenders" ranking — the addresses that send you the most repeated emails — and moves all of their emails to the trash at once.

HOW IT WORKS
• Connect your account with the official Google sign-in (OAuth2).
• The app scans your inbox and counts exactly how many emails each sender sent.
• See the Top 10 Offenders, with category and volume.
• Tap to send every email from a sender to the trash — or clean the whole Top 10 at once.

PRIVACY FIRST
• Official Google sign-in — the app never sees your password.
• No credentials are stored on your device: access lives only in memory and expires in about 1 hour.
• Emails are moved to Gmail's own Trash (recoverable for 30 days) — nothing is permanently deleted.
• The app does not read the content of your messages: only the sender address is used to build the ranking.

FEATURES
• Top 10 Offenders: the senders flooding your inbox
• Exact email count per sender
• One-tap bulk cleanup
• Automatic categories (social, shopping, news and more)
• Interface in Portuguese, English, Spanish, French, Italian, Russian and Chinese

Take back control of your inbox. Download Gmail Cleaner Buddy.
```

---

## 🇪🇸 Español (es)

**Nombre de la app** (≤30)
```
Gmail Cleaner Buddy
```

**Descripción corta** (≤80)
```
Descubre quién llena más tu Gmail y envía esos remitentes a la papelera.
```

**Descripción completa** (≤4000)
```
Gmail Cleaner Buddy encuentra los remitentes que más llenan tu bandeja de entrada y te permite limpiarlos con un solo toque.

¿Cansado de miles de boletines, promociones y notificaciones? La app analiza tu cuenta, arma el ranking "Top 10 Infractores" —las direcciones que más correos repetidos te envían— y mueve todos sus correos a la papelera de una vez.

CÓMO FUNCIONA
• Conecta tu cuenta con el inicio de sesión oficial de Google (OAuth2).
• La app analiza tu bandeja y cuenta con precisión cuántos correos envió cada remitente.
• Mira el Top 10 Infractores, con categoría y volumen.
• Toca para enviar todos los correos de un remitente a la papelera, o limpia el Top 10 de una vez.

LA PRIVACIDAD PRIMERO
• Inicio de sesión oficial de Google: la app nunca ve tu contraseña.
• No se guardan credenciales en el dispositivo: el acceso vive solo en memoria y caduca en aproximadamente 1 hora.
• Los correos se mueven a la Papelera del propio Gmail (recuperables durante 30 días); nada se elimina de forma permanente.
• La app no lee el contenido de tus mensajes: solo se usa la dirección del remitente para armar el ranking.

FUNCIONES
• Top 10 Infractores: los remitentes que más llenan tu bandeja
• Conteo exacto de correos por remitente
• Limpieza masiva con un toque
• Categorías automáticas (redes sociales, compras, noticias y más)
• Interfaz en portugués, inglés, español, francés, italiano, ruso y chino

Recupera el control de tu bandeja de entrada. Descarga Gmail Cleaner Buddy.
```

---

## 🇫🇷 Français (fr)

**Nom de l'appli** (≤30)
```
Gmail Cleaner Buddy
```

**Description courte** (≤80)
```
Voyez qui remplit le plus votre Gmail et envoyez ces expéditeurs à la corbeille.
```

**Description complète** (≤4000)
```
Gmail Cleaner Buddy identifie les expéditeurs qui encombrent le plus votre boîte de réception et vous laisse les nettoyer d'un simple appui.

Fatigué de milliers de newsletters, promotions et notifications ? L'appli analyse votre compte, établit le classement « Top 10 des Indésirables » — les adresses qui vous envoient le plus d'e-mails répétés — et déplace tous leurs e-mails vers la corbeille en une fois.

COMMENT ÇA MARCHE
• Connectez votre compte avec la connexion officielle Google (OAuth2).
• L'appli analyse votre boîte et compte précisément combien d'e-mails chaque expéditeur a envoyés.
• Consultez le Top 10 des Indésirables, avec catégorie et volume.
• Appuyez pour envoyer tous les e-mails d'un expéditeur à la corbeille, ou nettoyez tout le Top 10 d'un coup.

LA CONFIDENTIALITÉ D'ABORD
• Connexion officielle Google : l'appli ne voit jamais votre mot de passe.
• Aucun identifiant n'est stocké sur l'appareil : l'accès ne vit qu'en mémoire et expire au bout d'environ 1 heure.
• Les e-mails sont déplacés vers la Corbeille de Gmail (récupérables pendant 30 jours) ; rien n'est supprimé définitivement.
• L'appli ne lit pas le contenu de vos messages : seule l'adresse de l'expéditeur sert à établir le classement.

FONCTIONNALITÉS
• Top 10 des Indésirables : les expéditeurs qui encombrent votre boîte
• Comptage exact des e-mails par expéditeur
• Nettoyage groupé en un appui
• Catégories automatiques (réseaux sociaux, achats, actualités et plus)
• Interface en portugais, anglais, espagnol, français, italien, russe et chinois

Reprenez le contrôle de votre boîte de réception. Téléchargez Gmail Cleaner Buddy.
```

---

## 🇷🇺 Русский (ru-RU)

**Название приложения** (≤30)
```
Gmail Cleaner Buddy
```

**Краткое описание** (≤80)
```
Узнайте, кто забивает ваш Gmail, и отправьте этих отправителей в корзину.
```

**Полное описание** (≤4000)
```
Gmail Cleaner Buddy находит отправителей, которые больше всего забивают ваш почтовый ящик, и позволяет очистить их одним касанием.

Устали от тысяч рассылок, промоакций и уведомлений? Приложение анализирует ваш аккаунт, составляет рейтинг «Топ-10 нарушителей» — адреса, которые чаще всего присылают вам повторяющиеся письма, — и разом перемещает все их письма в корзину.

КАК ЭТО РАБОТАЕТ
• Подключите аккаунт через официальный вход Google (OAuth2).
• Приложение анализирует ящик и точно подсчитывает, сколько писем отправил каждый отправитель.
• Посмотрите Топ-10 нарушителей с категорией и объёмом.
• Коснитесь, чтобы отправить в корзину все письма одного отправителя — или весь Топ-10 сразу.

КОНФИДЕНЦИАЛЬНОСТЬ ПРЕЖДЕ ВСЕГО
• Официальный вход Google — приложение никогда не видит ваш пароль.
• На устройстве не сохраняются учётные данные: доступ живёт только в памяти и истекает примерно через 1 час.
• Письма перемещаются в собственную Корзину Gmail (восстановимы 30 дней) — ничего не удаляется навсегда.
• Приложение не читает содержимое сообщений: для рейтинга используется только адрес отправителя.

ВОЗМОЖНОСТИ
• Топ-10 нарушителей: отправители, забивающие ваш ящик
• Точный подсчёт писем по каждому отправителю
• Массовая очистка одним касанием
• Автоматические категории (соцсети, покупки, новости и другое)
• Интерфейс на португальском, английском, испанском, французском, итальянском, русском и китайском

Верните контроль над почтовым ящиком. Скачайте Gmail Cleaner Buddy.
```

---

## 🇨🇳 中文 (zh-CN)

**应用名称** (≤30)
```
Gmail Cleaner Buddy
```

**简短说明** (≤80)
```
找出谁在塞满你的 Gmail，一键把这些发件人的邮件移入垃圾箱。
```

**完整说明** (≤4000)
```
Gmail Cleaner Buddy 找出最占用你收件箱的发件人，让你一键清理。

厌倦了成千上万的订阅邮件、促销和通知？应用会分析你的账号，生成「前 10 名骚扰发件人」排行榜——那些反复给你发信最多的地址——并一次性把他们的所有邮件移入垃圾箱。

工作原理
• 使用官方 Google 登录（OAuth2）连接你的账号。
• 应用分析你的收件箱，精确统计每个发件人发送了多少封邮件。
• 查看前 10 名骚扰发件人，附带分类和容量。
• 轻点即可将某个发件人的全部邮件移入垃圾箱——或一次清理整个前 10 名。

隐私优先
• 官方 Google 登录——应用绝不会看到你的密码。
• 设备上不保存任何凭据：访问令牌只存在于内存中，约 1 小时后过期。
• 邮件会移入 Gmail 自己的垃圾箱（30 天内可恢复）——不会永久删除任何内容。
• 应用不会读取邮件内容：排行榜只使用发件人地址。

功能
• 前 10 名骚扰发件人：最占用你收件箱的发件人
• 按发件人精确统计邮件数量
• 一键批量清理
• 自动分类（社交媒体、购物、新闻等）
• 支持葡萄牙语、英语、西班牙语、法语、意大利语、俄语和中文界面

夺回收件箱的控制权。立即下载 Gmail Cleaner Buddy。
```
