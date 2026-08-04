# Formulário de Segurança de Dados — Play Console

Respostas prontas para **Play Console → Política → Conteúdo do app → Segurança de dados**.

> ⚠️ Isto é uma **declaração formal**. Se divergir do comportamento real do app, o Google
> pode suspender a listagem. Cada resposta abaixo está justificada com o ponto do código
> que a sustenta — se o código mudar, revise este arquivo antes de publicar de novo.

**Ler antes de responder:** a pendência da seção [Antes de enviar](#antes-de-enviar) muda a
resposta da pergunta 1. Resolva-a primeiro.

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

**Pendência que precisa ser resolvida — ela afeta a resposta da Seção 1.**

O app empacotado carrega dois recursos externos em tempo de execução (`www/index.html:7-11`):

- `fonts.googleapis.com` / `fonts.gstatic.com` — fonte Inter
- `cdn.jsdelivr.net` — ícones de bandeira dos idiomas

Duas consequências:

1. **Privacidade:** toda abertura do app envia o **IP do usuário** para essas CDNs, sem
   que ele saiba. Isso enfraquece a resposta "Não coleta" e é exatamente o tipo de coisa
   que um revisor atento levanta num app de acesso restrito ao Gmail.
2. **Funcional:** sem internet — ou se a jsDelivr cair — a interface abre com fonte errada e
   sem as bandeiras. Um app empacotado não deveria depender de CDN para renderizar.

**Correção:** baixar a fonte e o CSS de bandeiras para dentro de `www/` e referenciar
localmente. Some a dependência de rede, o app fica correto offline e a declaração
"Não coleta dados" passa a ser inatacável.

Enquanto isso não for feito, a resposta da Seção 1 continua defensável (IP para entrega de
conteúdo não é, por si só, "coleta" na definição do Google), mas é uma aresta desnecessária
num app que de resto tem uma história de privacidade impecável.
