// ============================================================
// Configuração OAuth do app Android (login nativo).
//
// GOOGLE_WEB_CLIENT_ID: o client "Aplicativo da Web" do Google Cloud —
// o plugin nativo usa esse ID para emitir o token. Já vem preenchido com
// o client do projeto Gmail Cleaner Buddy; troque se usar outro projeto:
//   npm run configure -- SEU_CLIENT_ID.apps.googleusercontent.com
//
// ALÉM disso é preciso existir no MESMO projeto do Google Cloud um client
// do tipo "Android" com o package com.mbastida.gmailcleanerbuddy e o
// SHA-1 do seu keystore (veja o README, passo 2) — é ele que autoriza o
// aparelho a mostrar a caixa nativa de login. Sem secret no APK: apps
// instalados nunca embutem client_secret.
// ============================================================

export const GOOGLE_WEB_CLIENT_ID =
  '509052485005-qipj5vobrpj93togcea604fs6aeta2ef.apps.googleusercontent.com';

export const OAUTH_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
