
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.fetchAccount": { type: "done.invoke.fetchAccount"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.fetchInfo": { type: "done.invoke.fetchInfo"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.fetchPeerData": { type: "done.invoke.fetchPeerData"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.updateProfile": { type: "done.invoke.updateProfile"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.fetchAccount": { type: "error.platform.fetchAccount"; data: unknown };
"error.platform.fetchInfo": { type: "error.platform.fetchInfo"; data: unknown };
"error.platform.fetchPeerData": { type: "error.platform.fetchPeerData"; data: unknown };
"error.platform.updateProfile": { type: "error.platform.updateProfile"; data: unknown };
"xstate.after(1000)#authStateMachine.loggedIn.onSuccess": { type: "xstate.after(1000)#authStateMachine.loggedIn.onSuccess" };
"xstate.after(RETRY_DELAY)#authStateMachine.retry": { type: "xstate.after(RETRY_DELAY)#authStateMachine.retry" };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "fetchAccount": "done.invoke.fetchAccount";
"fetchInfo": "done.invoke.fetchInfo";
"fetchPeerData": "done.invoke.fetchPeerData";
"updateProfile": "done.invoke.updateProfile";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "assignAccount": "done.invoke.fetchAccount" | "done.invoke.updateProfile";
"assignAccountError": "error.platform.fetchAccount";
"assignAccountInfo": "done.invoke.fetchInfo";
"assignErrorFromUpdate": "error.platform.updateProfile";
"assignPeerData": "done.invoke.fetchPeerData";
"assignPeerDataError": "error.platform.fetchPeerData";
"assignRetryError": "error.platform.fetchInfo";
"clearError": "RETRY" | "done.invoke.fetchInfo";
"clearRetries": "RETRY" | "done.invoke.fetchInfo" | "error.platform.fetchInfo";
"copyindAddressToClipboard": "ACCOUNT.COPY.ADDRESS";
"incrementRetry": "error.platform.fetchInfo";
"removeAccountInfo": "error.platform.fetchInfo";
        };
        eventsCausingDelays: {
          "RETRY_DELAY": "error.platform.fetchInfo";
        };
        eventsCausingGuards: {
          "shouldRetry": "error.platform.fetchInfo";
        };
        eventsCausingServices: {
          "fetchAccount": "done.invoke.fetchInfo";
"fetchInfo": "RETRY" | "xstate.after(RETRY_DELAY)#authStateMachine.retry" | "xstate.init";
"fetchPeerData": "done.invoke.fetchInfo";
"updateProfile": "ACCOUNT.UPDATE.PROFILE";
        };
        matchesStates: "checkingAccount" | "errored" | "loggedIn" | "loggedIn.idle" | "loggedIn.onSuccess" | "loggedIn.updating" | "loggedOut" | "retry" | { "loggedIn"?: "idle" | "onSuccess" | "updating"; };
        tags: "pending";
      }
  