
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.fetchListDeviceStatus": { type: "done.invoke.fetchListDeviceStatus"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.fetchListDeviceStatus": { type: "error.platform.fetchListDeviceStatus"; data: unknown };
"xstate.after(10000)#(machine).ready": { type: "xstate.after(10000)#(machine).ready" };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "fetchListDeviceStatus": "done.invoke.fetchListDeviceStatus";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "assignConnectionStatus": "done.invoke.fetchListDeviceStatus";
"assignData": "done.invoke.fetchListDeviceStatus";
"assignError": "error.platform.fetchListDeviceStatus";
"clearError": "RETRY" | "xstate.after(10000)#(machine).ready" | "xstate.init";
"commitStatus": "done.invoke.fetchListDeviceStatus";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "fetchListDeviceStatus": "RETRY" | "xstate.after(10000)#(machine).ready" | "xstate.init";
        };
        matchesStates: "errored" | "fetching" | "ready";
        tags: never;
      }
  