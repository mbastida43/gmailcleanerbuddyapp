# Justificativa do `gmail.modify` — verificação OAuth

Texto para **Google Cloud → Tela de permissão OAuth → escopo `gmail.modify`** (Fase 1 do
[checklist](checklist-publicacao.md)). Em inglês, com cerca de 1.100 caracteres. Se o formulário
limitar o tamanho, encurte primeiro o parágrafo "Modifying".

> ⚠️ **Antes de enviar:** confirme que a tela de consentimento aponta para
> `https://mbastida43.github.io/gmailcleanerbuddyapp/privacy.html`, a política que cita o cache
> local.

```text
Gmail Cleaner Buddy helps users free up mailbox space by showing which senders have sent them the most email and moving those senders' messages to Trash on request.

Reading: the app lists message IDs and reads only the From header and size estimate of each message (format=metadata) to rank senders. It never reads message subjects or bodies.

Modifying: when the user chooses to clean a sender, or all listed senders, and confirms, the app moves those messages to Trash using messages.batchModify, with messages.trash as a fallback. Messages stay recoverable for 30 days; the app never permanently deletes email.

Why a narrower scope is not enough: gmail.readonly and gmail.metadata cannot move messages to Trash, and gmail.metadata does not support the search query used to find a sender's messages. gmail.modify is the narrowest scope that allows this core feature; we do not request full https://mail.google.com/ access.

The app runs entirely on the user's device and calls Google APIs directly. There is no developer server, and Gmail data is never sent to the developer or to third parties. The account address and each message's ID, sender and size are cached only on the device and deleted on sign-out.
```

Se o código mudar, revise este texto: `src/gmail.ts` (`analyze`, `clean`, `saveCache`) e
`src/app.ts` (`clearCache` no Sair).
