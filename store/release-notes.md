# Notas de versão — Play Console

Texto do campo **"Novidades desta versão"** (Play Console → Versões → a versão →
Notas da versão). Limite do Google: **500 caracteres por idioma**. Os 7 idiomas
são os mesmos da ficha; a Play mostra o do idioma padrão a quem não tem tradução.

Uma seção por versão, a mais nova em cima.

---

## 1.6 (versionCode 7)

O que o testador percebe: a espera continua a mesma, mas parou de parecer
travamento. A demora foi a reclamação nº 1 prevista para o 1.4 — esta versão não
a encurta, mostra o que está acontecendo enquanto ela dura. Por isso a nota fala
de número na tela, não de velocidade: prometer rapidez aqui seria mentira.

> O `versionCode 6` / `1.5` chegou a ser gerado e nunca subiu. A tela dele tinha
> DOIS números em fases diferentes; virou um percentual único antes de qualquer
> testador ver. Nota de versão descreve o que o usuário recebe, e ninguém
> recebeu o 1.5 — por isso a seção foi reescrita no lugar, não duplicada.

Nenhum idioma promete precisão que não existe na fase de varredura: o percentual
dela vem do teto da varredura, não de um total conhecido, e isso não é dito ao
usuário porque para ele o número é um só, de 0 a 100.

### 🇧🇷 Português (pt-BR)
```
A espera agora tem um número só: de 0% a 100%, do começo ao fim da análise. Antes eram três contadores em sequência, e cada troca parecia recomeço. Nas pausas o texto vira "Aguarde" e o número segura onde está.

A análise não ficou mais rápida — ela varre a caixa inteira de propósito. O que mudou é dar para ver que ela está andando.

A contagem por remetente também foi corrigida: faltavam e-mails reenviados dentro de uma mesma conversa.
```

### 🇺🇸 English (en-US)
```
The wait now has a single number: 0% to 100%, from the start of the analysis to the end. There used to be three counters in a row, and every switch looked like a restart. During pauses the text says "Please wait" and the number holds.

The analysis is not faster — it scans your whole mailbox on purpose. What changed is that you can see it moving.

Per-sender counting was fixed too: resent emails inside the same conversation were being missed.
```

### 🇪🇸 Español (es)
```
La espera ahora tiene un solo número: de 0% a 100%, del inicio al final del análisis. Antes eran tres contadores seguidos y cada cambio parecía un reinicio. En las pausas el texto pasa a "Espera" y el número se mantiene.

El análisis no es más rápido: recorre todo el buzón a propósito. Lo que cambió es que ahora se ve que avanza.

También se corrigió el recuento por remitente: faltaban correos reenviados dentro de una misma conversación.
```

### 🇫🇷 Français (fr)
```
L'attente a désormais un seul chiffre : de 0 % à 100 %, du début à la fin de l'analyse. Il y avait trois compteurs successifs, et chaque changement ressemblait à un redémarrage. Pendant les pauses, le texte devient « Veuillez patienter » et le chiffre reste en place.

L'analyse n'est pas plus rapide : elle parcourt toute la boîte volontairement. Ce qui change, c'est qu'on la voit avancer.

Le comptage par expéditeur est corrigé : les e-mails renvoyés dans une même conversation manquaient.
```

### 🇮🇹 Italiano (it-IT)
```
L'attesa ora ha un solo numero: da 0% a 100%, dall'inizio alla fine dell'analisi. Prima erano tre contatori in fila e ogni cambio sembrava un riavvio. Nelle pause il testo diventa "Attendere" e il numero resta fermo.

L'analisi non è più veloce: percorre tutta la casella di proposito. Quello che cambia è che ora si vede avanzare.

Corretto anche il conteggio per mittente: mancavano le email rinviate all'interno della stessa conversazione.
```

### 🇷🇺 Русский (ru-RU)
```
У ожидания теперь один номер: от 0% до 100%, от начала анализа до конца. Раньше было три счётчика подряд, и каждая смена выглядела как перезапуск. Во время пауз появляется «Подождите», а число остаётся на месте.

Быстрее анализ не стал — он намеренно просматривает весь ящик. Изменилось то, что теперь видно его движение.

Исправлен и подсчёт по отправителю: терялись повторно присланные письма внутри одной переписки.
```

### 🇨🇳 中文 (zh-CN)
```
等待现在只有一个数字：从 0% 到 100%，覆盖整个分析过程。此前是三个接连出现的计数器，每次切换都像重新开始。暂停时文字会变成"请稍候"，数字保持不变。

分析并没有变快——它有意扫描整个邮箱。变化在于你能看到它在推进。

发件人统计也修好了：同一会话中重发的邮件此前会漏掉。
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
