# 📱 Gmail Cleaner Buddy — App Android (Capacitor)

Versão Android nativa do [Gmail Cleaner Buddy](https://github.com/mbastida43/gmailcleanerbuddy):
analisa os remetentes que mais lotam sua caixa do Gmail e move os emails
deles para a lixeira — direto do celular.

## 🏗️ Arquitetura (o que mudou em relação ao app web)

| | App web | Este app Android |
|---|---|---|
| Servidor Node/Express | ✅ obrigatório | ❌ **não existe** — o celular fala direto com a API do Gmail |
| Login | Redirect OAuth no navegador | **Caixa nativa do Android** (Credential Manager + Authorization API do Google Play Services, via plugin `@capgo/capacitor-social-login`) |
| Segredo OAuth | `client_secret` no `.env` do servidor | **Nenhum segredo no APK** — apps instalados usam o fluxo para apps nativos, sem client_secret |
| Lógica de análise/limpeza | `src/server.ts` | portada para `src/gmail.ts` (mesma semântica: amostra de 500, contagem exata dos top 25, limpeza via `batchModify`) |

O token de acesso vive **somente em memória** (~1h) — nada é persistido no
aparelho.

## 📋 Pré-requisitos

- **Node.js 18+**
- **Android Studio** (traz o Android SDK e o JDK juntos) — necessário
  apenas para compilar o APK: https://developer.android.com/studio
- Conta Google e o projeto no **Google Cloud Console** (o mesmo do app web)

## 🚀 Passo 1 — Instalar dependências

```bash
npm install
```

## 🔑 Passo 2 — Google Cloud Console (uma vez só)

O login nativo exige **dois** clients OAuth no mesmo projeto:

1. **Client "Aplicativo da Web"** — já existe (é o mesmo do app web) e o ID
   já está preenchido em `src/config.ts`. Se usar outro projeto, atualize com:
   ```bash
   npm run configure -- SEU_CLIENT_ID.apps.googleusercontent.com
   ```

2. **Client "Android"** — é ele que autoriza SEU aparelho/assinatura:
   - **APIs e serviços → Credenciais → + Criar credenciais → ID do cliente OAuth**
   - Tipo de aplicativo: **Android**
   - Nome do pacote: `com.mbastida.gmailcleanerbuddy`
   - **Impressão digital SHA-1**: obtenha com o app compilável (após instalar
     o Android Studio):
     ```bash
     cd android
     gradlew signingReport
     ```
     Copie o `SHA1` da variante `debug` (e depois o do seu keystore de
     produção, quando criar — pode cadastrar os dois no mesmo client).
   - Criar. (Client Android não tem secret nem redirect URI — a validação é
     pelo par pacote+assinatura.)

3. **Test users**: como o app está em modo "Testing", cada conta que for
   logar precisa estar em **Tela de permissão OAuth → Test users**.

## ▶️ Passo 3 — Compilar e rodar

```bash
npm run sync            # typecheck + bundle web + sincroniza com o Android
npm run android:studio  # abre o projeto no Android Studio (Run ▶ no emulador/celular)
```

### Gerar o APK pela linha de comando

```bash
npm run build:apk:debug   # APK de desenvolvimento (assinado com a chave debug)
npm run build:apk         # APK de produção (release, precisa de assinatura — abaixo)
```

Onde os APKs são gerados:

| Comando | Arquivo |
|---|---|
| `build:apk:debug` | `android/app/build/outputs/apk/debug/app-debug.apk` |
| `build:apk` | `android/app/build/outputs/apk/release/app-release-unsigned.apk` |

### Assinar o APK de produção

O release sai **sem assinatura** (o Android só instala APKs assinados).
Crie seu keystore uma única vez e assine:

```bash
keytool -genkeypair -v -keystore gcb-release.keystore -alias gcb -keyalg RSA -keysize 2048 -validity 10000
"%ANDROID_HOME%\build-tools\<versão>\apksigner" sign --ks gcb-release.keystore --out app-release.apk android\app\build\outputs\apk\release\app-release-unsigned.apk
```

> ⚠️ Guarde o keystore com carinho (e fora do git — já está no
> `.gitignore`): perder o keystore = não poder atualizar o app.
> Lembre de cadastrar o SHA-1 dele no client Android (Passo 2).

## 🧰 Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm run build:web` | Gera o bundle `www/app.js` (esbuild) |
| `npm run sync` | typecheck + bundle + `cap sync android` |
| `npm run configure -- <id>` | Grava o Web Client ID em `src/config.ts` |
| `npm run android:studio` | Abre o projeto nativo no Android Studio |
| `npm run build:apk:debug` | APK debug instalável |
| `npm run build:apk` | APK release (assinar depois) |

## 📁 Estrutura

```
src/
  config.ts   ← Web Client ID + escopo OAuth
  auth.ts     ← login nativo (caixa do Android), token em memória, revogação
  gmail.ts    ← Gmail REST API: análise, contagem exata, limpeza batchModify
  app.ts      ← UI (i18n PT/EN/ES/FR, Top 10, toasts) — mesma do app web
www/          ← index.html, style.css e o bundle app.js (gerado)
android/      ← projeto nativo (gerado pelo Capacitor, versionado)
scripts/      ← set-client-id.mjs (npm run configure)
```

## ⚠️ Gotchas conhecidos

- **Login exige Google Play Services** no aparelho (celulares sem Google,
  como Huawei antigos, não suportam a caixa nativa).
- **`Erro 403: access_denied` / caixa fecha sozinha** → a conta não está em
  **Test users** no Google Cloud (Passo 2.3), ou o SHA-1 cadastrado não bate
  com a assinatura do APK instalado (debug vs release têm SHA-1 diferentes!).
- **Token dura ~1h** — depois disso o app volta para a tela de login (por
  design: nenhuma credencial fica salva no aparelho).
- Editou código em `src/`? Rode `npm run sync` antes de compilar de novo,
  senão o APK sai com o bundle antigo.
- O escopo `gmail.modify` é **restrito**: o Google mostra a tela de
  consentimento ("app não verificado" em modo Testing) dentro do fluxo
  nativo — normal, é só confirmar.
