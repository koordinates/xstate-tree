
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.syncTodos": { type: "done.invoke.syncTodos"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.syncTodos": { type: "error.platform.syncTodos"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "syncTodos": "done.invoke.syncTodos";
        };
        missingImplementations: {
          actions: "setFilter" | "syncTodos";
          delays: never;
          guards: never;
          services: "syncTodos";
        };
        eventsCausingActions: {
          "setFilter": "SHOW_ACTIVE_TODOS" | "SHOW_ALL_TODOS" | "SHOW_COMPLETED_TODOS";
"syncTodos": "SYNC_TODOS";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "syncTodos": "xstate.init";
        };
        matchesStates: "conductor" | "hasTodos" | "noTodos";
        tags: never;
      }
  