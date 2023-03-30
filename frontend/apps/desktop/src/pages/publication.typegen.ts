
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "assignActivePanel": "PANEL.OPEN" | "PANEL.TOGGLE";
"hidePanel": "PANEL.TOGGLE";
"resetActivePanel": "PANEL.TOGGLE";
"showPanel": "PANEL.OPEN" | "PANEL.TOGGLE";
"updateHandlePosition": "PANEL.RESIZE";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          "shouldClosePanel": "PANEL.TOGGLE";
        };
        eventsCausingServices: {
          
        };
        matchesStates: undefined;
        tags: never;
      }
  