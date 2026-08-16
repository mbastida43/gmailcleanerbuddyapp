# Checklist de publicação — Play Store

Passo a passo na ordem que funciona. As fases 1 e 2 rodam **em paralelo** e são as
demoradas — comece por elas.

Legenda: ✅ pronto no repo · ⬜ depende de você · ⚠️ atenção

---

## O que falta para subir — resumo

Do lado do repo não falta nada: binário, assets, textos da ficha e notas da versão estão
prontos e conferidos. Tudo que resta acontece em consoles do Google, na sua conta, e por
isso nenhuma parte disso pode ser automatizada daqui. Três perguntas diferentes, três
respostas diferentes — misturá-las é o que faz a pessoa achar que está travada:

**1. O que falta para o upload acontecer**
- ⬜ **Conta no Play Console verificada** (Fase 2). É o único bloqueador do upload em si.
      US$ 25 + verificação de identidade, que leva de horas a dias. Sem ela não existe
      tela onde soltar o arquivo.

**2. O que falta para o app FUNCIONAR na mão do testador** — some do radar se você só
pensar no upload, e o sintoma parece bug do app:
- ⬜ Cada testador cadastrado como **Test user** no Google Cloud (Fase 1). Sem isso ele
      instala, abre e toma `403 access_denied` no login.
- ⬜ **SHA-1 do Play App Signing** no client Android, cadastrado **depois** do primeiro
      upload (Fase 4). O Google reassina o app com a chave dele, então quem baixa da loja
      tem outro SHA-1. Sem isso o login funciona no APK que você instala na mão e falha
      exatamente para quem veio da Play.
- ⬜ **Conta Gmail de teste** com e-mails dentro, entregue à revisão (Fase 5, item 6).

**3. O que falta para o relógio dos 14 dias andar**
- ⬜ **12+ testadores inscritos na trilha de teste fechado** (Fase 2 e Fase 6). É o caminho
      crítico de verdade: o prazo só começa quando os 12 estão dentro, e reinicia se cair
      de 12. Comece a recrutar antes de ter conta, não depois.

**Não existe automação de upload neste repo** — sem service account, sem API do Play, sem
fastlane. O AAB sobe à mão pelo Console. Se um dia isso incomodar, o caminho é uma service
account com a Google Play Android Developer API; aí vira um comando.

---

## Fase 0 — Entender o bloqueador principal

O app usa `https://www.googleapis.com/auth/gmail.modify` (`src/config.ts:19`), classificado
pelo Google como **escopo restrito**. Isso define o que é possível:

| Caminho | O que dá | Custo / prazo |
|---|---|---|
| **Teste fechado** (consent screen em *Testing*) | Até 100 usuários, adicionados por e-mail. Cada um vê o aviso "app não verificado" | Grátis, imediato |
| **Produção aberta** | Usuários ilimitados, sem aviso | Verificação OAuth + **CASA Tier 2**: ~US$ 500–1.000/ano, 4–8 semanas |

Não existe escopo mais leve que permita mover e-mail para a lixeira. Mandar para o `TRASH`
exige `gmail.modify` — então não há como contornar o CASA mantendo a função de limpeza.

**Recomendação:** valide o produto em teste fechado antes de gastar com o CASA.

---

## Fase 1 — Verificação OAuth (Google Cloud Console)

Projeto: `509052485005` (`src/config.ts:17`)

- ⬜ **Tela de consentimento OAuth** → tipo **External**
- ⬜ Preencher: nome do app, e-mail de suporte, logo, domínio autorizado (`mbastida43.github.io`),
      link da política de privacidade, e-mail do desenvolvedor
- ⬜ Adicionar o escopo `gmail.modify` e escrever a **justificativa** — explique que o app
      lê apenas o cabeçalho `From` para montar o ranking e usa `batchModify` para mover ao
      `TRASH`; nunca lê o corpo das mensagens
- ✅ Frase de **Limited Use** já presente na `privacy.html` (verificado): *"Gmail Cleaner
      Buddy's use and transfer of information received from Google APIs to any other app will
      adhere to the Google API Services User Data Policy, including the Limited Use
      requirements."* — é o texto que o Google exige. Nada a fazer aqui.
- ⬜ **Vídeo de demonstração** (YouTube, pode ser não listado) — obrigatório. Precisa mostrar,
      sem cortes: a URL do app → tela de login do Google → **a tela de consentimento com os
      escopos visíveis** → o app usando os dados. É o motivo nº 1 de reprova quando o vídeo
      não mostra a tela de consentimento inteira.
- ⬜ Para produção aberta: contratar o **CASA Tier 2** com um laboratório autorizado

**Enquanto isso:** deixe a tela em *Testing* e cadastre os testadores em
*Test users* (limite de 100).

---

## Fase 2 — Conta no Play Console

- ⬜ Criar conta — **US$ 25**, taxa única
- ⬜ Verificação de identidade (documento). Leva de horas a alguns dias
- ⚠️ **Conta pessoal — confirmado em 2026-08-13.** Logo, a exigência dos
      **12 testadores inscritos num teste fechado por 14 dias seguidos** se aplica: qualquer
      conta aberta hoje é posterior a nov/2023. Só conta de organização escapa, e isso exige
      pessoa jurídica com D-U-N-S.
- ⬜ **Recrutar os testadores — comece por aqui, é o caminho crítico.** Os 14 dias só começam
      a contar quando houver 12 inscritos, e se o número cair de 12 no meio, o relógio
      reinicia. Recrute ~15 para ter folga.
- ⚠️ **Cada testador precisa entrar em DUAS listas, em consoles diferentes**, com o mesmo
      endereço Gmail:
      1. **Play Console → Teste fechado** — é o que faz os 14 dias contarem
      2. **Google Cloud → Tela de permissão OAuth → Test users** (Fase 1) — sem isso a pessoa
         instala, abre e trava no login com `403 access_denied`
      Faltando a 1ª, o prazo não anda; faltando a 2ª, o app não funciona para ela.

---

## Fase 3 — Assets da ficha

Tudo pronto no repo:

- ✅ **Ícone 512×512** — `store/icon-512.png`, e os 20 mipmaps do app, gerados de
      `store/icon-art.svg` por `node scripts/make-icons.mjs`
- ⚠️ **Não troque o ícone pelo "M" do Gmail.** A tentação vai voltar, porque fica bonito. Mas
      é marca registrada com as cores do Google: as diretrizes proíbem terceiros de usar logos
      de produtos Google no ícone, e isso é conferido na revisão da Play (política de
      *impersonation*) **e** na verificação OAuth, que já será criteriosa pelo escopo restrito.
      O envelope com vassoura foi desenhado justamente para dizer a mesma coisa sem usar marca
      de ninguém — a paleta petróleo/âmbar evita o vermelho/amarelo/verde/azul de propósito.
- ✅ **Feature graphic 1024×500** — `store/feature-graphics/feature-<idioma>.png` (7 idiomas)
- ✅ **Screenshots** — `store/screenshots/` (3 capturas de celular, 1179×2556; mínimo do Google é 2)
- ✅ **Textos PT/EN/ES/FR/IT/RU/ZH** — `store/play-listing.md` (os 7 idiomas da interface)
- ✅ **Notas da versão 1.4** — `store/release-notes.md`, nos mesmos 7 idiomas, dentro do
      limite de 500 caracteres. É campo da versão, preenchido no formulário de release
      (Fase 5), não na ficha
- ✅ **Política de privacidade no ar** — `https://mbastida43.github.io/gmailcleanerbuddy/privacy.html`

---

## Fase 4 — O binário

> **Chave trocada em 2026-08-08.** A chave `GCB` original se perdeu — não estava em nenhuma
> máquina. Como o app ainda não tinha sido publicado, gerar outra não custou nada; depois de
> publicado, custaria o app inteiro. O AAB foi reconstruído e assinado com a chave nova.

> **Chave trocada de novo em 2026-08-11 — a terceira.** A `gcb-upload` descrita acima
> também sumiu: não havia nada em `C:\Users\marlo\.android-keys\`, nem em C:, D: ou E:.
> O backup em pendrive não estava acessível. De novo saiu barato, porque o app seguia
> sem publicar — mas **duas chaves perdidas em quatro dias** é o padrão a quebrar antes
> de ir para produção. Depois de publicado, perder a chave de upload custa uma espera de
> 48h pelo reset do Google; perder a de assinatura, sem Play App Signing, custaria o app.

- ✅ AAB assinado: `android/app/build/outputs/bundle/release/app-release.aab` (chave `gcb`, 5,6 MB)
      e APK de mão em `.../apk/release/app-release.apk` (5,9 MB), ambos do build 5 / 1.4.
      Conferido **no artefato**, não só no log do Gradle: `aapt2 dump badging` devolve
      `versionCode='5' versionName='1.4'`, o `apksigner verify --print-certs` devolve o SHA-1
      esperado, e o `app.js` empacotado contém o código novo — build de cache passa despercebido
      justamente por sair verde no Gradle
- ✅ `targetSdk 36` (`android/variables.gradle:4`) — atende a exigência atual
- ✅ `versionCode 5` / `versionName 1.4` — build atual: análise varre a caixa inteira e
      sorteia a amostra por toda ela (antes eram as 1.000 mais recentes), fase "Lendo a caixa
      postal…" no overlay, o tile passa a mostrar o **total real da caixa** e a nota do rodapé
      explica escopo e unidade. O AAB no disco é deste build.
      Histórico: `versionCode 2` foi o que subiu no teste interno. O `3` e o `4` chegaram a ser
      gerados e nunca enviados — os dois foram abandonados em vez de reaproveitados, porque o
      binário mudou de comportamento depois de cada um. Números queimados custam nada; um
      `versionCode` que descreve dois binários diferentes custa depuração meses depois.
      A Play recusa reenvio do mesmo `versionCode`
- ✅ Keystore em `android/gcb-release.keystore`. RSA 2048, validade 10.000 dias, alias `gcb`.
      Fica dentro de `android/` mas **fora do git** (`.gitignore` cobre `*.keystore`).
      **SHA-1: `66:00:EE:DC:91:33:71:C5:C6:66:73:5F:D4:15:AA:46:75:D4:53:27`**
- ✅ `android/keystore.properties` recriado (a senha está nele; coberto pelo `.gitignore`).
      O `storeFile` usa só o nome do arquivo — o caminho é resolvido a partir de `android/`,
      que é onde vive o `settings.gradle` e portanto o `rootProject` do Gradle
- ✅ **Backup feito em 2026-08-13, reorganizado no mesmo dia.** Cada pasta tem um
      `LEIA-ME.txt` explicando que são dois arquivos e para que serve cada um — os nomes
      enganam (`keystore.properties` é a **senha**, não a chave).
      - **Chave** (`gcb-release.keystore`) em quatro destinos: uma nuvem, dois volumes
        locais e um pendrive
      - **Senha** (`keystore.properties`) em dois: a mesma pasta da nuvem e a cópia de
        trabalho em `android/`
      - Restauração testada de verdade: chave e senha abrem no `keytool` e devolvem o
        SHA-1 esperado
      - **Caminhos exatos e hashes de conferência: `store/backup-local.md`**, que fica fora
        do git (este repo é público — um mapa de onde está a chave não entra nele)
- ⚠️ **Chave e senha convivem na pasta da nuvem.** Decisão consciente de 2026-08-13: vale
      mais não depender de um pendrive só do que manter as metades separadas. O custo é que
      quem entrar na conta da nuvem tem o par completo e consegue assinar app no seu nome.
      As duas mitigações que sobram:
      - ⬜ **Verificação em duas etapas ligada na conta Microsoft** — é o que separa uma
        senha vazada do controle da sua chave de assinatura
      - ⬜ **Play App Signing no primeiro upload** (item mais abaixo) — com ele, mesmo o
        pior caso vira reset de chave de upload, não perda do app
- ✅ **Lixeira da nuvem conferida em 2026-08-13: vazia.** A `keystore.properties` chegou a
      ficar na pasta sincronizada, e o serviço retém excluídos por ~30 dias — mas não há
      nada a recuperar lá. A senha saiu da nuvem de fato, não só da pasta local.
- ✅ SHA-1 novo cadastrado no client Android do Google Cloud
      (*Gmail Cleaner Buddy (release)*), e o login nativo foi testado no aparelho: caixa de
      contas, consentimento e ranking carregando
- ⬜ Ativar **Play App Signing** no primeiro upload (recomendado) — o Google passa a guardar a
      chave de assinatura e você mantém só a chave de upload, que **é** recuperável se perdida
- ⚠️ **Depois do primeiro upload, volte ao client Android e acrescente o SHA-1 do Play App
      Signing.** O Google reassina o app com a chave dele, então o SHA-1 da versão publicada
      não é o seu. Sem esse segundo cadastro o login funciona no APK que você instala e falha
      para quem baixa da loja — sintoma que parece bug do app e não é.

**Como buildar nesta máquina:** `JAVA_HOME` e `ANDROID_HOME` não estão definidos no sistema, e
`npm run build:aab` falha porque o script chama `gradlew` sem extensão e o `cmd` não resolve.
Rode direto:

```powershell
$env:JAVA_HOME   = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\marlo\AppData\Local\Android\Sdk"
cd android; .\gradlew.bat bundleRelease   # ou assembleRelease para gerar APK de teste
```

---

## Fase 5 — Preencher o Play Console

Ordem que a Play cobra:

1. ⬜ Criar o app → nome, idioma padrão **pt-BR**, tipo **App**, **Gratuito**
2. ⬜ **Ficha principal** → colar os textos de `play-listing.md` + subir os assets da Fase 3
3. ⬜ Adicionar os idiomas en-US, es-ES, fr-FR e repetir (cada um tem seu feature graphic)
4. ⬜ **Conteúdo do app** → todas as respostas em [`data-safety.md`](data-safety.md)
5. ⬜ **Classificação de conteúdo** → questionário, tudo "Não"
6. ⚠️ **Acesso ao app** → o app exige login com conta Google, então **você precisa fornecer
      credenciais de teste** para a equipe de revisão. Pule isto e a rejeição é certa.
      Crie uma conta Gmail descartável, popule com alguns e-mails para o ranking ter o que
      mostrar, **adicione-a como Test user na tela de consentimento OAuth** (senão o revisor
      trava no aviso de app não verificado) e informe usuário e senha aqui.
7. ⬜ Subir o AAB na trilha desejada (**Teste fechado** primeiro)
8. ⬜ **Notas da versão** → colar os textos de [`release-notes.md`](release-notes.md) (7 idiomas).
      Campo da *versão*, não da ficha: some da vista porque aparece no fim do formulário de
      release, e fica em branco com facilidade
9. ⬜ Países de distribuição
10. ⬜ Enviar para revisão

---

## Fase 6 — Como o app chega até os testadores

### APK e AAB não são a mesma coisa

| | O que é | Serve para |
|---|---|---|
| **APK** | Arquivo instalável | Mandar direto para alguém (WhatsApp, Drive). A pessoa instala na mão |
| **AAB** | Pacote de *upload* | Só subir no Play Console. **Não instala** se você mandar para alguém |

O AAB não é um APK melhor, é outra coisa: você entrega ao Google e **ele** monta um APK sob
medida para o aparelho de cada pessoa, entregue pela Play Store.

### ⚠️ Mandar APK não conta os 14 dias

A exigência dos 12 testadores (Fase 2) só é cumprida por uma trilha do Play Console. Distribuir
APK por conta própria é **invisível** para o Google — o relógio não anda. Duas semanas mandando
arquivo por WhatsApp terminam com a contagem ainda em zero.

E dentro do Console as trilhas têm nomes parecidos, com consequências diferentes:

| Trilha | Testadores | Conta para os 14 dias? |
|---|---|---|
| **Teste interno** | até 100, disponível quase na hora | ❌ **não** |
| **Teste fechado** | é a que a exigência pede | ✅ sim |

Confirme os nomes na tela do seu Console — o Google já renomeou essas trilhas antes.

### O caminho

- ⬜ Criar a **trilha de teste fechado** e, dentro dela, uma lista de e-mails com os 12+
      testadores
- ⬜ Subir `android/app/build/outputs/bundle/release/app-release.aab` nessa trilha, marcando
      **Play App Signing** neste primeiro upload
- ⬜ Copiar o **link de opt-in** que o Console gera
      (`play.google.com/apps/testing/com.mbastida.gmailcleanerbuddy`) e mandar aos testadores
- ⬜ Cadastrar cada um como **Test user** no Google Cloud (a segunda lista — Fase 2). Sem isso
      a pessoa instala, abre e toma `403` no login
- ⬜ Conferir que o SHA-1 do *App signing key* foi para o client Android (Fase 4). Sem ele o
      login falha **só** para quem instalou pela loja
- ⬜ Acompanhar a contagem: 12 inscritos, sem cair, por 14 dias corridos

**O que o testador faz:** abre o link → aceita ser testador → instala pela Play Store como
qualquer app. Sem "fonte desconhecida", sem APK solto.

### O APK ainda serve

Não jogue fora: mande para uma ou duas pessoas de confiança **antes** de montar o Console, para
caçar bug grosseiro enquanto isso. É teste de verdade, só não conta prazo. Ele está em
`UTEIS\GMAIL CLEANER BUDDY` no OneDrive, pasta separada da chave de propósito — junto vai um
`LEIA-ME.txt` com o que avisar a quem instalar.

Estado da pasta em 2026-08-16: `gmail-cleaner-buddy-1.4.apk` e `.aab` (build 5 / 1.4), mais os
arquivos `1.2` antigos, que ficaram lá. **Confira a versão no nome antes de mandar ou de subir** —
os dois pares convivem, e subir o `1.2.aab` no Console publicaria a versão errada.

O `LEIA-ME.txt` dessa pasta **não** é versionado aqui de propósito: este repo é público, e o
arquivo descreve o arranjo do OneDrive, inclusive o nome da pasta vizinha onde está a chave de
assinatura. Mesmo motivo do `store/backup-local.md`. Ao trocar o binário da pasta, edite o
`LEIA-ME.txt` lá — a versão está escrita nele em três lugares.

---

## Fase 7 — Depois do envio

- ⬜ Ler o **Relatório de pré-lançamento** — a Play roda o app em aparelhos reais e reporta
      travamentos que você não viu
- ⬜ Revisão: normalmente 1–7 dias no primeiro envio
- ⬜ Se for produção com escopo restrito, a aprovação da Play **não** substitui a verificação
      OAuth — as duas correm em separado e as duas precisam passar

---

## Riscos conhecidos deste app

| Risco | Gravidade | Mitigação |
|---|---|---|
| Verificação OAuth reprovada por vídeo incompleto | Alta | Mostrar a tela de consentimento inteira, sem corte |
| Rejeição por falta de credenciais de teste | Alta | Fase 5, item 6 |
| Custo/prazo do CASA inviabilizar produção aberta | Alta | Validar em teste fechado primeiro |
| Não juntar 12 testadores por 14 dias seguidos | Alta | Conta pessoal, exigência obrigatória. Recrutar ~15 e começar cedo (Fase 2) |
| Perder 14 dias distribuindo APK, ou usando teste interno no lugar do fechado | Alta | Só a trilha de **teste fechado** conta. Ver Fase 6 |
| Perda do keystore | Crítica | 3 backups da chave (feito) + Play App Signing |
| Perda da senha do keystore | Média | Duas cópias, uma delas na nuvem (não depende de hardware desta mesa) |
| Invasão da conta da nuvem | Alta | Lá estão chave e senha juntas. Verificação em duas etapas + Play App Signing |

Resolvidos: CDNs externas em `www/` (fonte e bandeiras agora empacotadas — ver "Antes de
enviar" em [`data-safety.md`](data-safety.md)) e a frase de Limited Use na privacy policy
(verificada, Fase 1).
