
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.syncTodo": { type: "done.invoke.syncTodo"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.syncTodo": { type: "error.platform.syncTodo"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "syncTodo": "done.invoke.syncTodo";
        };
        missingImplementations: {
          actions: "setEditedText" | "submitTodo" | "syncTodo" | "updateEditedText";
          delays: never;
          guards: never;
          services: "syncTodo";
        };
        eventsCausingActions: {
          "setEditedText": "EDIT";
"submitTodo": "EDIT_SUBMITTED";
"syncTodo": "SYNC_TODO";
"updateEditedText": "EDIT_CHANGED";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "syncTodo": "xstate.init";
        };
        matchesStates: "deleted" | "hidden" | "visible" | "visible.edit" | "visible.view" | { "visible"?: "edit" | "view"; };
        tags: never;
      }
  