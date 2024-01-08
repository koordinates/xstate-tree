import React from "react";
import { setup } from "xstate";

import { createXStateTreeMachine, PickEvent } from "../";
import { RoutingEvent } from "../routing";

import { settingsRoute } from "./routes";

declare global {
  interface XstateTreeEvents {
    DO_THE_THING: { type: "DO_THE_THING" };
    GO_TO_DO_THE_THING_STATE: { type: "GO_TO_DO_THE_THING_STATE" };
  }
}
type Events =
  | PickEvent<"DO_THE_THING" | "GO_TO_DO_THE_THING_STATE">
  | RoutingEvent<typeof settingsRoute>;
const machine = setup({
  types: {
    events: {} as Events,
  },
}).createMachine({
  id: "other",
  initial: "awaitingRoute",
  states: {
    awaitingRoute: {
      on: {
        GO_SETTINGS: "idle",
      },
    },
    idle: {
      on: {
        GO_TO_DO_THE_THING_STATE: "doTheThing",
      },
    },
    doTheThing: {
      on: {
        DO_THE_THING: "idle",
      },
    },
  },
});

export const OtherMachine = createXStateTreeMachine(machine, {
  selectors({ canHandleEvent }) {
    return {
      canDoTheThing: canHandleEvent({ type: "DO_THE_THING" }),
    };
  },
  View({ selectors }) {
    return (
      <>
        <p data-testid="can-do-the-thing">
          {selectors.canDoTheThing ? "true" : "false"}
        </p>
        <p data-testid="other-text">Other</p>
      </>
    );
  },
});
