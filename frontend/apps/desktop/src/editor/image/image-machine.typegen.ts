
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "": { type: "" };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          
        };
        missingImplementations: {
          actions: "assignCaptionVisibility" | "assignValidUrl" | "updateCaption";
          delays: never;
          guards: "hasImageUrl";
          services: never;
        };
        eventsCausingActions: {
          "assignCaptionVisibility": "" | "IMAGE.CANCEL" | "IMAGE.SUBMIT";
"assignValidUrl": "IMAGE.SUBMIT";
"enableCaption": "IMAGE.SUBMIT";
"updateCaption": "CAPTION.UPDATE";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          "hasImageUrl": "";
        };
        eventsCausingServices: {
          
        };
        matchesStates: "checking" | "edit" | "edit.new" | "edit.update" | "image" | { "edit"?: "new" | "update"; };
        tags: never;
      }
  