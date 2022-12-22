
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "": { type: "" };
"done.invoke.getBlock": { type: "done.invoke.getBlock"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.getPublication": { type: "done.invoke.getPublication"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.getBlock": { type: "error.platform.getBlock"; data: unknown };
"error.platform.getPublication": { type: "error.platform.getPublication"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "getBlock": "done.invoke.getBlock";
"getPublication": "done.invoke.getPublication";
        };
        missingImplementations: {
          actions: "setLink";
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "assignBlock": "done.invoke.getBlock";
"assignError": "error.platform.getBlock" | "error.platform.getPublication";
"assignPublication": "done.invoke.getPublication";
"clearBlock": "REFETCH";
"clearError": "REFETCH";
"clearPublication": "REFETCH";
"setLink": "xstate.init";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "getBlock": "done.invoke.getPublication";
"getPublication": "" | "REFETCH" | "xstate.init";
        };
        matchesStates: "errored" | "fetchingPublication" | "findBlock" | "gettingParams" | "idle";
        tags: never;
      }
  