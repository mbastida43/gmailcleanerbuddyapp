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
- ✅ **Feature graphic 1024×500** — `store/feature-graphics/feature-<idioma>.png` (4 idiomas)
- ✅ **Screenshots** — `store/screenshots/` (3 capturas; mínimo do Google é 2)
- ✅ **Textos PT/EN/ES/FR** — `store/play-listing.md`
- ✅ **Política de privacidade no ar** — `https://mbastida43.github.io/gmailcleanerbuddy/privacy.html`

---

## Fase 4 — O binário

- ✅ AAB assinado: `final_app/gmailcleanerbuddy.aab` (chave `GCB`)
- ✅ `targetSdk 36` (`android/variables.gradle:4`) — atende a exigência atual
- ✅ `versionCode 1` — correto para o primeiro envio
- ⚠️ **`android/keystore.properties` não existe nesta máquina.** Sem ele, `npm run build:aab`
      gera um AAB **sem assinatura**, que a Play recusa. Antes de rebuildar, recrie o arquivo:

  ```properties
  storeFile=caminho/para/seu.keystore
  storePassword=...
  keyAlias=...
  keyPassword=...
  ```

- 🔴 **Faça backup do keystore agora, em dois lugares.** Se perder essa chave, você **nunca
      mais** consegue atualizar o app — o Google não tem como recuperar, e a única saída é
      publicar outro app com outro `applicationId`, perdendo instalações e avaliações.
      (A menos que ative o Play App Signing, abaixo.)
- ⬜ Ativar **Play App Signing** no primeiro upload (recomendado) — o Google passa a guardar a
      chave de assinatura e você mantém só a chave de upload, que **é** recuperável se perdida

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
| Perda do keystore | Crítica | Backup duplo + Play App Signing |
| CDNs externas em `www/index.html` | Média | Ver "Antes de enviar" em [`data-safety.md`](data-safety.md) |
| Falta a frase de Limited Use na privacy policy | Média | Verificar antes de enviar a Fase 1 |
