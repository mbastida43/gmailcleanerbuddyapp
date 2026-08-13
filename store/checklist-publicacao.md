# Checklist de publicação — Play Store

Passo a passo na ordem que funciona. As fases 1 e 2 rodam **em paralelo** e são as
demoradas — comece por elas.

Legenda: ✅ pronto no repo · ⬜ depende de você · ⚠️ atenção

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
- ⚠️ **Se for conta pessoal criada depois de nov/2023:** exige **12 testadores rodando um
      teste fechado por 14 dias seguidos** antes de liberar produção. Comece a recrutar os
      12 agora — na prática essa costuma ser a etapa mais lenta de todas.
      Conta de organização não tem essa exigência.

---

## Fase 3 — Assets da ficha

Tudo pronto no repo:

- ✅ **Ícone 512×512** — `store/icon-512.png`
- ✅ **Feature graphic 1024×500** — `store/feature-graphics/feature-<idioma>.png` (7 idiomas)
- ✅ **Screenshots** — `store/screenshots/` (3 capturas de celular, 1179×2556; mínimo do Google é 2)
- ✅ **Textos PT/EN/ES/FR/IT/RU/ZH** — `store/play-listing.md` (os 7 idiomas da interface)
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

- ✅ AAB assinado: `android/app/build/outputs/bundle/release/app-release.aab` (chave `gcb`)
- ✅ `targetSdk 36` (`android/variables.gradle:4`) — atende a exigência atual
- ✅ `versionCode 3` / `versionName 1.2` — build atual, já com a contagem real de leitura e
      o rótulo "Top 10 Ofensores". O AAB no disco é deste build (`versionCode 2` foi o que
      subiu no teste interno; a Play recusa reenvio do mesmo `versionCode`)
- ✅ Keystore em `android/gcb-release.keystore`. RSA 2048, validade 10.000 dias, alias `gcb`.
      Fica dentro de `android/` mas **fora do git** (`.gitignore` cobre `*.keystore`).
      **SHA-1: `66:00:EE:DC:91:33:71:C5:C6:66:73:5F:D4:15:AA:46:75:D4:53:27`**
- ✅ `android/keystore.properties` recriado (a senha está nele; coberto pelo `.gitignore`).
      O `storeFile` usa só o nome do arquivo — o caminho é resolvido a partir de `android/`,
      que é onde vive o `settings.gradle` e portanto o `rootProject` do Gradle
- ✅ **Backup feito em 2026-08-13, chave e senha separadas.** Cada pasta tem um `LEIA-ME.txt`
      dizendo onde está a outra metade.
      - **Chave** (`gcb-release.keystore`) em três destinos: uma nuvem e dois volumes locais
      - **Senha** (`keystore.properties`) **só** num pendrive e na cópia de trabalho em
        `android/` — nunca em pasta sincronizada
      - Restauração testada de verdade: chave tirada do backup na nuvem + senha tirada do
        pendrive abrem no `keytool` e devolvem o SHA-1 esperado
      - **Caminhos exatos e hashes de conferência: `store/backup-local.md`**, que fica fora
        do git (este repo é público — um mapa de onde está a chave não entra nele)
- ⬜ **Guardar a senha do keystore num gerenciador de senhas.** Hoje ela existe em dois
      lugares só, o pendrive e a cópia de trabalho — as duas em hardware da mesma mesa.
      Perder os dois transforma os três backups da chave em arquivos que não abrem, e
      pendrive foi exatamente a mídia que sumiu com as duas chaves anteriores. O gerenciador
      não é arquivo e não some com hardware, então quebra a dependência sem devolver a senha
      para uma pasta sincronizada.
      Basta guardar o campo `storePassword` de `android/keystore.properties`, anotando
      alias `gcb` e o SHA-1 da chave. **Faça antes do primeiro upload.**
- ⬜ **Esvaziar a lixeira da nuvem.** A `keystore.properties` chegou a ficar na pasta
      sincronizada e foi apagada de lá, mas o serviço retém excluídos por ~30 dias — até
      limpar, a senha continua recuperável e a separação de chave e senha ainda não vale
      de fato.
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
8. ⬜ Países de distribuição
9. ⬜ Enviar para revisão

---

## Fase 6 — Depois do envio

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
| Perda do keystore | Crítica | 3 backups da chave (feito) + Play App Signing |
| Perda da senha do keystore | Crítica | Só existe no pendrive e em `android/`. Pendência aberta na Fase 4: copiar para um gerenciador de senhas |

Resolvidos: CDNs externas em `www/` (fonte e bandeiras agora empacotadas — ver "Antes de
enviar" em [`data-safety.md`](data-safety.md)) e a frase de Limited Use na privacy policy
(verificada, Fase 1).
