
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "": { type: "" };
"done.invoke.validateUrlService": { type: "done.invoke.validateUrlService"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.validateUrlService": { type: "error.platform.validateUrlService"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "validateUrlService": "done.invoke.validateUrlService";
        };
        missingImplementations: {
          actions: "assignValidUrl" | "updateCaption";
          delays: never;
          guards: "hasVideoUrl";
          services: "validateUrlService";
        };
        eventsCausingActions: {
          "assignError": "error.platform.validateUrlService";
"assignValidUrl": "done.invoke.validateUrlService";
"clearError": "VIDEO.SUBMIT";
"enableCaption": "done.invoke.validateUrlService";
"updateCaption": "CAPTION.UPDATE";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          "hasVideoUrl": "";
        };
        eventsCausingServices: {
          "validateUrlService": "VIDEO.SUBMIT";
        };
        matchesStates: "edit" | "edit.new" | "edit.update" | "init" | "submitting" | "video" | { "edit"?: "new" | "update"; };
        tags: never;
      }
  