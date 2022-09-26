// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "": { type: "" };
    "done.invoke.syncTodos": {
      type: "done.invoke.syncTodos";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "error.platform.syncTodos": {
      type: "error.platform.syncTodos";
      data: unknown;
    };
    "xstate.init": { type: "xstate.init" };
  };
  invokeSrcNameMap: {
    syncTodos: "done.invoke.syncTodos";
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    setFilter: "SHOW_ACTIVE_TODOS" | "SHOW_ALL_TODOS" | "SHOW_COMPLETED_TODOS";
    syncTodos: "SYNC_TODOS";
  };
  eventsCausingServices: {
    syncTodos: "xstate.init";
  };
  eventsCausingGuards: {
    hasTodos: "";
  };
  eventsCausingDelays: {};
  matchesStates: "conductor" | "hasTodos" | "noTodos";
  tags: never;
}
