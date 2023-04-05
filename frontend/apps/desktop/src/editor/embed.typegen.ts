
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.getEmbedBlock": { type: "done.invoke.getEmbedBlock"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.getEmbedPublication": { type: "done.invoke.getEmbedPublication"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.getEmbedBlock": { type: "error.platform.getEmbedBlock"; data: unknown };
"error.platform.getEmbedPublication": { type: "error.platform.getEmbedPublication"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "getEmbedBlock": "done.invoke.getEmbedBlock";
"getEmbedPublication": "done.invoke.getEmbedPublication";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "assignBlock": "done.invoke.getEmbedBlock";
"assignError": "error.platform.getEmbedBlock" | "error.platform.getEmbedPublication";
"assignPublication": "done.invoke.getEmbedPublication";
"clearBlock": "REFETCH";
"clearError": "REFETCH";
"clearPublication": "REFETCH";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "getEmbedBlock": "done.invoke.getEmbedPublication";
"getEmbedPublication": "REFETCH" | "xstate.init";
        };
        matchesStates: "errored" | "fetchingPublication" | "findBlock" | "idle";
        tags: never;
      }
  