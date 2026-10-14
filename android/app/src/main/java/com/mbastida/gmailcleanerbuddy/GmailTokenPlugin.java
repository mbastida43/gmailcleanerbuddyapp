package com.mbastida.gmailcleanerbuddy;

import android.accounts.Account;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import java.util.Collections;

// Token novo do Gmail SEM tela, para a primeira análise (que passa de 1 hora)
// não pedir para entrar de novo. O refresh() do plugin de login passa pelo
// Credential Manager, que abre o seletor de contas quando há mais de uma
// conta autorizada no aparelho (ou logo depois de um Sair). Aqui vai direto
// na Authorization API, presa à conta que já está na análise: o Play Services
// devolve o token sozinho porque o escopo já foi concedido.
@CapacitorPlugin(name = "GmailToken")
public class GmailTokenPlugin extends Plugin {

    @PluginMethod
    public void renew(PluginCall call) {
        String email = call.getString("email");
        String scope = call.getString("scope");
        if (email == null || email.isEmpty() || scope == null) {
            call.reject("missing_account");
            return;
        }
        AuthorizationRequest request = AuthorizationRequest.builder()
            .setRequestedScopes(Collections.singletonList(new Scope(scope)))
            .setAccount(new Account(email, "com.google"))
            .build();
        Identity.getAuthorizationClient(getActivity())
            .authorize(request)
            .addOnSuccessListener(result -> {
                // Pede tela (consentimento revogado etc.): aí não é silencioso.
                if (result.hasResolution() || result.getAccessToken() == null) {
                    call.reject("needs_user");
                    return;
                }
                call.resolve(new JSObject().put("accessToken", result.getAccessToken()));
            })
            .addOnFailureListener(e -> call.reject(String.valueOf(e.getMessage())));
    }
}
