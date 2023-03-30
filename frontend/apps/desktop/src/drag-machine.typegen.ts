
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
          "deselectEditor": "DRAG.START";
"performMove": "DROPPED";
"resetPaths": "DROPPED" | "xstate.init";
"setDragOverRef": "DRAG.OVER";
"setDragRef": "DRAG.START";
"setDraggingOff": "DRAGGING.OFF";
"setFromPath": "DRAG.START";
"setNestedGroup": "SET.NESTED.GROUP";
"setToPath": "DRAG.OVER";
"startDrag": "DRAG.START";
"stopDrag": "DROPPED";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          
        };
        matchesStates: "active" | "inactive";
        tags: never;
      }
  