import { identity } from "lodash";
import React from "react";
import { createMachine } from "xstate";

import {
  buildView,
  buildXStateTreeMachine,
  buildRootComponent,
  singleSlot,
  buildActions,
  lazy,
} from "../";
import { Link, RoutingEvent } from "../routing";

import { TodosMachine } from "./TodosMachine";
import { homeRoute, settingsRoute, history } from "./routes";

// eslint-disable-next-line @typescript-eslint/ban-types
type Context = {};
type Events =
  | RoutingEvent<typeof homeRoute>
  | RoutingEvent<typeof settingsRoute>;
const ScreenSlot = singleSlot("ScreenGoesHere");
const slots = [ScreenSlot];
const OtherMachine = () =>
  import("./OtherMachine").then(({ OtherMachine }) => OtherMachine);
const AppMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqDEBxA8gfQAkcBZAUUVFQHtYBLAF1qoDsKQAPRAFgCYAaEAE9EPLgEYAdAE4ZUgBxcAzFxkBWGQDYAvloFpMuPAGVSAFVMBJAHJYjbanUYs2nBLwHCEY1QHZpsnxV1KUV1HV0QZioIODZ9CQB3ZAZaZigAMSoAJwAlKgBXejB7GhTnJA5uP1VFKQAGDVUNRTrWuQ9EOSl-GTlAn00B7Qj4+miaEscmVgrXHh4fDoRRVR6ZBrqZH3U5HT10CSp6AAswLKMAYyywMBnKUqc7yuWFpbEeDTXGppkxMTlhvtUJMyk9XP8lsMdEA */
  createMachine(
    {
      tsTypes: {} as import("./AppMachine.typegen").Typegen0,
      schema: { context: {} as Context, events: {} as Events },
      id: "app",
      initial: "waitingForRoute",
      on: {
        GO_HOME: {
          cond: (_ctx, e) => e.meta.indexEvent ?? false,
          target: ".todos",
        },
        GO_SETTINGS: {
          target: ".otherScreen",
        },
      },
      states: {
        waitingForRoute: {},
        todos: {
          invoke: {
            src: "TodosMachine",
            id: ScreenSlot.getId(),
          },
        },
        otherScreen: {
          invoke: {
            src: "OtherMachine",
            id: ScreenSlot.getId(),
          },
        },
      },
    },
    {
      services: {
        TodosMachine: TodosMachine,
        OtherMachine: lazy(OtherMachine),
      },
    }
  );

const actions = buildActions(AppMachine, identity, () => ({}));

const AppView = buildView(
  AppMachine,
  identity,
  actions,
  slots,
  ({ slots, inState }) => {
    return (
      <>
        {inState("todos") && (
          <>
            <p data-testid="header">On home</p>
            <Link to={settingsRoute} testId="swap-to-other-machine">
              Swap to settings
            </Link>
          </>
        )}
        {inState("otherScreen") && (
          <>
            <p data-testid="header">On settings</p>
            <Link to={homeRoute} testId="swap-to-other-machine">
              Swap to home
            </Link>
          </>
        )}
        <slots.ScreenGoesHere />
      </>
    );
  }
);

export const BuiltAppMachine = buildXStateTreeMachine(AppMachine, {
  actions,
  selectors: identity,
  slots,
  view: AppView,
});

export const App = buildRootComponent(BuiltAppMachine, {
  history,
  basePath: "",
  routes: [homeRoute, settingsRoute],
  getPathName: () => "/",
  getQueryString: () => "",
});
