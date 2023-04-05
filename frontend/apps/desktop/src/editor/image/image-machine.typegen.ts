
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
          actions: "assignCaptionVisibility" | "assignError" | "assignValidUrl" | "updateCaption";
          delays: never;
          guards: "hasImageUrl";
          services: "validateUrlService";
        };
        eventsCausingActions: {
          "assignCaptionVisibility": "" | "IMAGE.CANCEL" | "done.invoke.validateUrlService";
"assignError": "error.platform.validateUrlService";
"assignValidUrl": "done.invoke.validateUrlService";
"clearError": "IMAGE.SUBMIT";
"enableCaption": "done.invoke.validateUrlService";
"updateCaption": "CAPTION.UPDATE";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          "hasImageUrl": "";
        };
        eventsCausingServices: {
          "validateUrlService": "IMAGE.SUBMIT";
        };
        matchesStates: "checking" | "edit" | "edit.new" | "edit.update" | "image" | "submitting" | { "edit"?: "new" | "update"; };
        tags: never;
      }
  