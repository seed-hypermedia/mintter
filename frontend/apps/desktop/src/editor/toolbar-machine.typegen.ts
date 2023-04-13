
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          
        };
        missingImplementations: {
          actions: "assignDefaultSelection" | "removeDOMSelection" | "removeSelectorMark" | "restoreDOMSelection" | "setSelectorMark";
          delays: never;
          guards: "isNotValid";
          services: never;
        };
        eventsCausingActions: {
          "assignDefaultSelection": "TOOLBAR.COMMIT.SELECTION" | "TOOLBAR.DISMISS" | "xstate.init";
"assignSelection": "TOOLBAR.COMMIT.SELECTION" | "TOOLBAR.SELECT";
"cancelSelection": "TOOLBAR.SELECT";
"clearSelection": "TOOLBAR.DISMISS" | "xstate.init";
"commitSelection": "TOOLBAR.SELECT";
"removeDOMSelection": "START.CONVERSATION";
"removeSelectorMark": "TOOLBAR.DISMISS";
"restoreDOMSelection": "TOOLBAR.DISMISS";
"setSelectorMark": "START.CONVERSATION";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          "isNotValid": "TOOLBAR.COMMIT.SELECTION";
        };
        eventsCausingServices: {
          
        };
        matchesStates: "active" | "active.commenting" | "active.idle" | "idle" | { "active"?: "commenting" | "idle"; };
        tags: never;
      }
  