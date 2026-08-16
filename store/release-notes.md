# Notas de versão — Play Console

Texto do campo **"Novidades desta versão"** (Play Console → Versões → a versão →
Notas da versão). Limite do Google: **500 caracteres por idioma**. Os 7 idiomas
são os mesmos da ficha; a Play mostra o do idioma padrão a quem não tem tradução.

Uma seção por versão, a mais nova em cima.

---

## 1.5 (versionCode 6)

O que o testador percebe: a espera continua a mesma, mas parou de parecer
travamento. A demora foi a reclamação nº 1 prevista para o 1.4 — esta versão não
a encurta, mostra o que está acontecendo enquanto ela dura. Por isso a nota fala
de número na tela, não de velocidade: prometer rapidez aqui seria mentira.

A varredura não ganha denominador em nenhum idioma. É ela que descobre o tamanho
da caixa; um total ali seria número inventado, que é o que este app existe para
não fazer.

### 🇧🇷 Português (pt-BR)
```
A espera agora tem número. Os dois trechos mais longos ficavam com o texto parado e pareciam travamento:

• Varredura da caixa: mostra quantos e-mails já encontrou, subindo a cada bloco lido
• Montagem do ranking: mostra o percentual concluído

A varredura não mostra um total porque é justamente ela que descobre o tamanho da sua caixa.

A contagem e a limpeza passaram a usar a mesma lista de mensagens, sem repetição.
```

### 🇺🇸 English (en-US)
```
The wait now has a number. The two longest stretches used to sit on a frozen line and looked like a crash:

• Mailbox scan: shows how many emails it has found so far, rising with each block
• Building the ranking: shows the percentage done

The scan shows no total because it is the step that discovers how big your mailbox is.

Counting and cleaning now use the same message list, with no duplicates.
```

### 🇪🇸 Español (es)
```
La espera ahora tiene número. Los dos tramos más largos se quedaban con el texto quieto y parecían un bloqueo:

• Recorrido del buzón: muestra cuántos correos lleva encontrados, subiendo con cada bloque
• Armado del ranking: muestra el porcentaje completado

El recorrido no muestra un total porque es justo el paso que descubre el tamaño de tu buzón.

El recuento y la limpieza ahora usan la misma lista de mensajes, sin repeticiones.
```

### 🇫🇷 Français (fr)
```
L'attente a enfin un chiffre. Les deux étapes les plus longues restaient figées et ressemblaient à un plantage :

• Parcours de la boîte : affiche le nombre d'e-mails déjà trouvés, qui monte à chaque bloc
• Constitution du classement : affiche le pourcentage effectué

Le parcours n'affiche pas de total car c'est lui qui découvre la taille de votre boîte.

Le comptage et le nettoyage utilisent la même liste, sans doublons.
```

### 🇮🇹 Italiano (it-IT)
```
L'attesa ora ha un numero. I due tratti più lunghi restavano con il testo fermo e sembravano un blocco:

• Scansione della casella: mostra quante email ha già trovato, in crescita a ogni blocco
• Creazione della classifica: mostra la percentuale completata

La scansione non mostra un totale perché è proprio il passaggio che scopre quanto è grande la casella.

Conteggio e pulizia ora usano la stessa lista di messaggi, senza ripetizioni.
```

### 🇷🇺 Русский (ru-RU)
```
У ожидания появилось число. Два самых долгих этапа стояли с неподвижной строкой и выглядели как зависание:

• Просмотр ящика: показывает, сколько писем уже найдено — счётчик растёт с каждым блоком
• Составление рейтинга: показывает процент выполнения

Общее число на первом этапе не показано: именно он и выясняет размер ящика.

Подсчёт и очистка теперь работают с одним и тем же списком писем, без повторов.
```

### 🇨🇳 中文 (zh-CN)
```
等待过程现在有数字了。此前最长的两个阶段文字一直不动，看起来像卡死：

• 扫描邮箱：显示已找到多少封邮件，每读一批就往上加
• 生成排行：显示已完成的百分比

扫描阶段不显示总数，因为正是这一步在算出你的邮箱有多大。

统计和清理现在使用同一份邮件清单，不再重复计算。
```

---

## 1.4 (versionCode 5)

O que o testador percebe: o ranking passa a encontrar remetente antigo, e a
análise **demora mais** por causa disso. A demora é a primeira coisa que alguém
reporta como bug, então ela é dita na segunda linha, não escondida no fim.

> Estas notas foram escritas para o 1.3, que nunca chegou a subir — o total real
> da caixa entrou logo depois e virou 1.4. O texto foi atualizado no lugar em vez
> de ganhar uma seção nova: nota de versão descreve o que o usuário recebe, e o
> usuário nunca recebeu o 1.3. Uma seção para uma versão que não existiu na loja
> só confundiria quem for consultar isto daqui a seis meses.

### 🇧🇷 Português (pt-BR)
```
Agora o ranking enxerga a caixa inteira, não só os e-mails recentes. Quem despejou centenas de mensagens e sumiu há dois anos era invisível — agora aparece.

Por isso a análise demora alguns segundos a mais. É de propósito: ela varre a caixa toda antes de montar a lista.

Também nesta versão:
• O Spam entra na contagem (a Lixeira, não)
• Uma nota nova explica por que o número aqui difere do da busca do Gmail
• A tela mostra quantos e-mails a sua conta tem
```

### 🇺🇸 English (en-US)
```
The ranking now sees your whole mailbox, not just recent emails. A sender that dumped hundreds of messages and went quiet two years ago used to be invisible — now it shows up.

So the analysis takes a few seconds longer. It is deliberate: it scans the whole mailbox before building the list.

Also:
• Spam is counted (Trash is not)
• A new note explains why the number here differs from Gmail search
• The screen now shows how many emails your account has
```

### 🇪🇸 Español (es)
```
Ahora el ranking ve todo el buzón, no solo los correos recientes. Quien soltó cientos de mensajes y desapareció hace dos años era invisible; ahora aparece.

Por eso el análisis tarda unos segundos más. Es a propósito: recorre todo el buzón antes de armar la lista.

También:
• El Spam entra en el recuento (la Papelera no)
• Una nota nueva explica por qué el número difiere de la búsqueda de Gmail
• La pantalla muestra cuántos correos tiene tu cuenta
```

### 🇫🇷 Français (fr)
```
Le classement voit désormais toute la boîte, pas seulement les e-mails récents. Un expéditeur qui a déversé des centaines de messages puis s'est tu il y a deux ans était invisible : il apparaît enfin.

L'analyse prend donc quelques secondes de plus. C'est voulu : elle parcourt toute la boîte avant de constituer la liste.

Également :
• Le spam est compté (pas la corbeille)
• Une note explique l'écart avec la recherche Gmail
• L'écran affiche combien d'e-mails contient votre compte
```

### 🇮🇹 Italiano (it-IT)
```
Ora la classifica vede l'intera casella, non solo le email recenti. Un mittente che ha riversato centinaia di messaggi e ha smesso di scrivere due anni fa era invisibile: adesso compare.

Per questo l'analisi impiega qualche secondo in più. È voluto: percorre tutta la casella prima di creare l'elenco.

Inoltre:
• Lo spam viene conteggiato (il cestino no)
• Una nota spiega la differenza con la ricerca di Gmail
• La schermata mostra quante email contiene il tuo account
```

### 🇷🇺 Русский (ru-RU)
```
Теперь рейтинг видит весь ящик, а не только свежие письма. Отправитель, который вывалил сотни писем и замолчал два года назад, раньше был невидим — теперь он появляется.

Поэтому анализ идёт на несколько секунд дольше. Так задумано: он просматривает весь ящик, прежде чем составить список.

Ещё:
• Спам учитывается (корзина — нет)
• Новая заметка объясняет расхождение с поиском Gmail
• На экране видно, сколько писем в аккаунте
```

### 🇨🇳 中文 (zh-CN)
```
排行榜现在会查看整个邮箱，而不只是最近的邮件。两年前倾倒了几百封邮件后就不再来信的发件人，以前完全看不到，现在会出现。

因此分析会多花几秒钟。这是有意为之：它会先扫描整个邮箱，再生成列表。

本次更新还包括：
• 垃圾邮件现在计入统计（回收站不计）
• 新增说明，解释这里的数字为何与 Gmail 搜索不同
• 界面会显示账户里共有多少封邮件
```
