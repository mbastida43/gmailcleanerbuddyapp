# Formulário de Segurança de Dados — Play Console

Respostas prontas para **Play Console → Política → Conteúdo do app → Segurança de dados**.

> ⚠️ Isto é uma **declaração formal**. Se divergir do comportamento real do app, o Google
> pode suspender a listagem. Cada resposta abaixo está justificada com o ponto do código
> que a sustenta — se o código mudar, revise este arquivo antes de publicar de novo.

**Status:** a pendência que afetava a pergunta 1 (CDNs externas) foi resolvida em 2026-08-08 —
ver [Antes de enviar](#antes-de-enviar). As respostas abaixo podem ser usadas como estão.

---

## Base factual (auditoria do código, `src/`)

| Fato | Onde | Consequência |
|---|---|---|
| Nenhum servidor próprio. Só chama `gmail.googleapis.com` e `oauth2.googleapis.com` | `src/gmail.ts:13`, `src/auth.ts:86` | Nenhum dado do usuário vai para infraestrutura do desenvolvedor |
| Nenhum SDK de analytics, crash reporting ou anúncio | auditoria: sem Firebase/Crashlytics/Sentry/ads em `src/` | Nada de coleta por terceiros |
| Token OAuth só em memória, expira em ~55 min | `src/auth.ts:18`, `src/auth.ts:58` | Nenhuma credencial persistida |
| `localStorage` guarda **só** o idioma da interface | `src/app.ts:147` | Não é dado pessoal |
| Só o cabeçalho `From` é lido — nunca o corpo da mensagem | `src/gmail.ts:102` (`format=metadata&metadataHeaders=From`) | Conteúdo de e-mail nunca é acessado |
| E-mails vão para o rótulo `TRASH`, não são apagados | `src/gmail.ts:241` | Recuperável por 30 dias |
| Única permissão Android é `INTERNET` | `AndroidManifest.xml:48` | Nenhuma declaração de permissão sensível |

---

## Seção 1 — Coleta e compartilhamento

**"Seu app coleta ou compartilha algum dos tipos de dados do usuário exigidos?"**

### ➜ Resposta: **Não**

**Por que "Não" está correto:** o Google define *coletar* como **transmitir os dados para fora
do dispositivo**. Neste app o fluxo é o inverso — os dados do Gmail vêm **da** API do Google
**para** o aparelho, são processados na memória e nunca são enviados a nenhum outro destino.
Não existe backend do desenvolvedor. As requisições à API do Gmail vão do aparelho direto para
o Google, que já é o provedor da conta do próprio usuário; a documentação do Google não trata
isso como coleta pelo app.

Processamento efêmero (em memória, sem persistir, sem sair do aparelho) também é explicitamente
excluído da definição de coleta.

> **Se o Google questionar**, a resposta é: *"O app é 100% cliente. Não há servidor do
> desenvolvedor. Os dados do Gmail são lidos via API oficial, processados em memória no
> dispositivo e descartados ao encerrar a sessão. Somente o cabeçalho From é lido — nunca o
> corpo das mensagens."*

---

## Seção 2 — Práticas de segurança

| Pergunta | Resposta | Justificativa |
|---|---|---|
| Os dados são criptografados em trânsito? | **Sim** | Todo tráfego é HTTPS (`gmail.googleapis.com`, `oauth2.googleapis.com`) |
| Você oferece um jeito de o usuário pedir exclusão dos dados? | **Não se aplica** | Nenhum dado é coletado ou retido. Sair da conta revoga o token (`src/auth.ts:73`) |
| O app passou por revisão de segurança independente? | **Não** | Marque *Sim* só depois de concluir o CASA (veja o checklist) |

---

## Seção 3 — Outras respostas de "Conteúdo do app"

| Item | Resposta |
|---|---|
| Anúncios | **Não contém anúncios** |
| Compras no app | **Não** |
| Público-alvo | **18 anos ou mais** — não direcionado a crianças |
| Apps para famílias | **Não participar** |
| App de notícias | **Não** |
| App de finanças / saúde / governo | **Não** |
| Rastreamento entre apps (privacidade) | **Não** |
| Classificação de conteúdo | Questionário → tudo "Não". Deve sair **Livre / Everyone** |
| Segurança dos dados — coleta | **Não** (Seção 1) |
| Política de Privacidade | `https://mbastida43.github.io/gmailcleanerbuddy/privacy.html` |

---

## Seção 4 — Divulgação de "Uso Limitado" (obrigatória)

O escopo `gmail.modify` é **restrito**. Além da Segurança de Dados, a Política de Dados do
Usuário dos Serviços de API do Google exige que a política de privacidade afirme explicitamente
a conformidade com o **Limited Use**. Confirme que este texto (ou equivalente) está na
`privacy.html`:

```
O uso das informações recebidas das APIs do Google pelo Gmail Cleaner Buddy adere à
Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos
de Uso Limitado (Limited Use).
```

Sem essa frase literal a verificação OAuth é reprovada.

---

## Antes de enviar

**✅ Resolvido em 2026-08-08.**

A pendência era que o app buscava dois recursos externos em tempo de execução — a fonte Inter
em `fonts.googleapis.com` e as bandeiras do seletor de idioma em `cdn.jsdelivr.net`. Toda
abertura mandava o IP do usuário para essas CDNs, e sem rede a interface abria com fonte
errada e sem bandeiras.

Ambos passaram para dentro do APK:

- `www/assets/fonts/` — Inter em woff2, subsets latino e cirílico, 5 pesos (327 KB)
- `www/assets/flags/` — só as 7 bandeiras que o app usa, em vez da folha inteira do
  flag-icons com centenas de países (99 KB)
- `www/assets/local.css` — declara as duas coisas, preservando os `unicode-range` originais
  para o cirílico só carregar quando a tela está em russo. Gerado por
  `scripts/fetch-local-assets.ps1`; rode-o para atualizar a fonte ou incluir um idioma novo

Custo: **+348 KB** no APK. Em troca, nenhuma chamada de rede para desenhar a interface —
verificado nos assets empacotados, sem nenhuma URL externa restante em `index.html`,
`style.css` ou `local.css`.

Consequência para esta ficha: a resposta "Não coleta" da Seção 1 deixa de ter asterisco. As
únicas conexões do app agora são `gmail.googleapis.com` e `oauth2.googleapis.com` — ambas
para o provedor da própria conta do usuário.

> O chinês continua caindo na fonte do sistema: a Inter não tem glifos CJK, e incluí-los
> multiplicaria o tamanho do APK. Já era assim antes, não é regressão.
