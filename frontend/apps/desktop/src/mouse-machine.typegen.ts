
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.boundsListener": { type: "done.invoke.boundsListener"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.windowBlurService": { type: "done.invoke.windowBlurService"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.windowListener": { type: "done.invoke.windowListener"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.windowResizeService": { type: "done.invoke.windowResizeService"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.boundsListener": { type: "error.platform.boundsListener"; data: unknown };
"error.platform.windowBlurService": { type: "error.platform.windowBlurService"; data: unknown };
"error.platform.windowListener": { type: "error.platform.windowListener"; data: unknown };
"error.platform.windowResizeService": { type: "error.platform.windowResizeService"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "boundsListener": "done.invoke.boundsListener";
"windowBlurService": "done.invoke.windowBlurService";
"windowListener": "done.invoke.windowListener";
"windowResizeService": "done.invoke.windowResizeService";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "addVisibleBlock": "BLOCK.ADD";
"assignCurrentBound": "DISABLE.BLOCKTOOLS.CLOSE" | "DISABLE.DRAG.END" | "MOUSE.MOVE" | "xstate.init";
"assignHighlightRef": "HIGHLIGHT.ENTER" | "HIGHLIGHT.FROM.WINDOWS";
"assignObserver": "INIT.OBSERVER";
"blockObserve": "BLOCK.OBSERVE";
"clearBlockBounds": "DISABLE.CHANGE" | "DISABLE.SCROLL" | "DISABLE.WINDOW.BLUR" | "DISABLE.WINDOW.RESIZE";
"clearCurrentBound": "DISABLE.CHANGE" | "DISABLE.SCROLL" | "DISABLE.WINDOW.BLUR" | "DISABLE.WINDOW.RESIZE";
"clearHighlightRef": "HIGHLIGHT.LEAVE";
"emitAll": "HIGHLIGHT.ENTER" | "HIGHLIGHT.LEAVE";
"getBlockBounds": "DISABLE.BLOCKTOOLS.CLOSE" | "DISABLE.DRAG.END" | "MOUSE.MOVE" | "xstate.init";
"removeVisibleBlock": "BLOCK.REMOVE";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          "hoverNewBlockId": "MOUSE.MOVE";
        };
        eventsCausingServices: {
          "boundsListener": "xstate.init";
"windowBlurService": "xstate.init";
"windowListener": "xstate.init";
"windowResizeService": "xstate.init";
        };
        matchesStates: "active" | "active.ready" | "active.stopped" | "inactive" | { "active"?: "ready" | "stopped"; };
        tags: never;
      }
  