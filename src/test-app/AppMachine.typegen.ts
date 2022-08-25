// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "xstate.init": { type: "xstate.init" };
  };
  invokeSrcNameMap: {
    OtherMachine: "done.invoke.app.otherScreen:invocation[0]";
    TodosMachine: "done.invoke.app.todos:invocation[0]";
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {};
  eventsCausingServices: {
    OtherMachine: "GO_SETTINGS";
    TodosMachine: "GO_HOME";
  };
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates: "otherScreen" | "todos" | "waitingForRoute";
  tags: never;
}
