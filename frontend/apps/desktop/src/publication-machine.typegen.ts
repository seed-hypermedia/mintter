
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.createDraft": { type: "done.invoke.createDraft"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.fetchAuthor": { type: "done.invoke.fetchAuthor"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.fetchPublicationData": { type: "done.invoke.fetchPublicationData"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.createDraft": { type: "error.platform.createDraft"; data: unknown };
"error.platform.fetchAuthor": { type: "error.platform.fetchAuthor"; data: unknown };
"error.platform.fetchPublicationData": { type: "error.platform.fetchPublicationData"; data: unknown };
"xstate.after(1000)#publication-machine.fetching.normal": { type: "xstate.after(1000)#publication-machine.fetching.normal" };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "createDraft": "done.invoke.createDraft";
"fetchAuthor": "done.invoke.fetchAuthor";
"fetchPublicationData": "done.invoke.fetchPublicationData";
        };
        missingImplementations: {
          actions: "onEditSuccess";
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "assignAuthor": "done.invoke.fetchAuthor";
"assignCanUpdate": "PUBLICATION.REPORT.SUCCESS";
"assignError": "PUBLICATION.REPORT.ERROR" | "error.platform.createDraft";
"assignPublication": "PUBLICATION.REPORT.SUCCESS";
"assignTitle": "PUBLICATION.REPORT.SUCCESS";
"clearError": "PUBLICATION.FETCH.DATA";
"clearLinks": "PUBLICATION.FETCH.DATA";
"onEditSuccess": "done.invoke.createDraft";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "createDraft": "PUBLICATION.EDIT";
"fetchAuthor": "PUBLICATION.REPORT.SUCCESS";
"fetchPublicationData": "PUBLICATION.FETCH.DATA" | "xstate.init";
        };
        matchesStates: "errored" | "fetching" | "fetching.extended" | "fetching.normal" | "ready" | "ready.editing" | "ready.idle" | { "fetching"?: "extended" | "normal";
"ready"?: "editing" | "idle"; };
        tags: "pending";
      }
  