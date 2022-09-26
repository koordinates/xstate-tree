// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "done.invoke.syncTodo": {
      type: "done.invoke.syncTodo";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "error.platform.syncTodo": {
      type: "error.platform.syncTodo";
      data: unknown;
    };
    "xstate.init": { type: "xstate.init" };
  };
  invokeSrcNameMap: {
    syncTodo: "done.invoke.syncTodo";
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    setEditedText: "EDIT";
    submitTodo: "EDIT_SUBMITTED";
    syncTodo: "SYNC_TODO";
    updateEditedText: "EDIT_CHANGED";
  };
  eventsCausingServices: {
    syncTodo: "xstate.init";
  };
  eventsCausingGuards: {
    isCompleted:
      | "SHOW_ACTIVE_TODOS"
      | "SHOW_COMPLETED_TODOS"
      | "TODO_COMPLETED_CLEARED";
    isNotCompleted: "EDIT" | "SHOW_ACTIVE_TODOS" | "SHOW_COMPLETED_TODOS";
    isThisTodo: "TODO_DELETED" | "TODO_EDITED";
  };
  eventsCausingDelays: {};
  matchesStates:
    | "deleted"
    | "hidden"
    | "visible"
    | "visible.edit"
    | "visible.view"
    | { visible?: "edit" | "view" };
  tags: never;
}
