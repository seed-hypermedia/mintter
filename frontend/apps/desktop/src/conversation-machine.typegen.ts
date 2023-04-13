
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.fetchAuthor": { type: "done.invoke.fetchAuthor"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.fetchSource": { type: "done.invoke.fetchSource"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.fetchAuthor": { type: "error.platform.fetchAuthor"; data: unknown };
"error.platform.fetchSource": { type: "error.platform.fetchSource"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "fetchAuthor": "done.invoke.fetchAuthor";
"fetchSource": "done.invoke.fetchSource";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "assignAuthor": "done.invoke.fetchAuthor";
"assignError": "error.platform.fetchAuthor";
"assignPublication": "done.invoke.fetchSource";
"assignSource": "done.invoke.fetchSource";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "fetchAuthor": "done.invoke.fetchSource";
"fetchSource": "xstate.init";
        };
        matchesStates: "fetching" | "idle";
        tags: never;
      }
  