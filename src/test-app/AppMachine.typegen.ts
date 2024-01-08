
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "OtherMachine": "done.invoke.app.otherScreen:invocation[0]";
"TodosMachine": "done.invoke.app.todos:invocation[0]";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "OtherMachine": "GO_SETTINGS";
"TodosMachine": "GO_HOME";
        };
        matchesStates: "otherScreen" | "todos" | "waitingForRoute";
        tags: never;
      }
  