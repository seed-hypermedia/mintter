
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          
        };
        missingImplementations: {
          actions: "assignErrorMessage" | "triggerRefetch";
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "assignAllList": "CONTACTS.LIST.SUCCESS";
"assignContactOffline": "COMMIT.OFFLINE";
"assignContactOnline": "COMMIT.ONLINE";
"assignErrorMessage": "CONTACTS.LIST.ERROR";
"triggerRefetch": "REFETCH";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          
        };
        matchesStates: "error" | "fetching" | "idle";
        tags: never;
      }
  