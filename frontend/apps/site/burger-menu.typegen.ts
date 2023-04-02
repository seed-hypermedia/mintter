
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.resizeObserver": { type: "done.invoke.resizeObserver"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.resizeObserver": { type: "error.platform.resizeObserver"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "resizeObserver": "done.invoke.resizeObserver";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "removeTabIndexToElements": "MENU.DISABLE" | "MENU.OPEN" | "MENU.TOGGLE";
"setElementRef": "MENU.INIT";
"setFocusableElements": "MENU.INIT";
"setObserver": "MENU.OBSERVER.READY";
"setTabIndexToElements": "MENU.CLOSE" | "MENU.ENABLE" | "MENU.TOGGLE";
"startObserver": "MENU.INIT";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "resizeObserver": "xstate.init";
        };
        matchesStates: "disabled" | "enabled" | "enabled.closed" | "enabled.opened" | "idle" | { "enabled"?: "closed" | "opened"; };
        tags: never;
      }
  