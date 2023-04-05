
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.getPersistedTheme": { type: "done.invoke.getPersistedTheme"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.getPersistedTheme": { type: "error.platform.getPersistedTheme"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "getPersistedTheme": "done.invoke.getPersistedTheme";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "applyToDom": "CHANGE" | "REPORT.THEME.SUCCESS" | "TOGGLE";
"assignTheme": "CHANGE" | "REPORT.THEME.SUCCESS";
"toggleTheme": "TOGGLE";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "getPersistedTheme": "xstate.init";
        };
        matchesStates: "loading" | "ready";
        tags: never;
      }
  