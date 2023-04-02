
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.staticParagraph-machine.getting level:invocation[0]": { type: "done.invoke.staticParagraph-machine.getting level:invocation[0]"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.staticParagraph-machine.getting parent:invocation[0]": { type: "done.invoke.staticParagraph-machine.getting parent:invocation[0]"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.staticParagraph-machine.getting level:invocation[0]": { type: "error.platform.staticParagraph-machine.getting level:invocation[0]"; data: unknown };
"error.platform.staticParagraph-machine.getting parent:invocation[0]": { type: "error.platform.staticParagraph-machine.getting parent:invocation[0]"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "getLevel": "done.invoke.staticParagraph-machine.getting level:invocation[0]";
"getParent": "done.invoke.staticParagraph-machine.getting parent:invocation[0]";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "assignError": "error.platform.staticParagraph-machine.getting level:invocation[0]" | "error.platform.staticParagraph-machine.getting parent:invocation[0]";
"assignLevel": "done.invoke.staticParagraph-machine.getting level:invocation[0]";
"assignParent": "done.invoke.staticParagraph-machine.getting parent:invocation[0]";
"assignRef": "REF";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "getLevel": "done.invoke.staticParagraph-machine.getting parent:invocation[0]";
"getParent": "REF";
        };
        matchesStates: "error" | "getting level" | "getting parent" | "idle" | "ready";
        tags: never;
      }
  