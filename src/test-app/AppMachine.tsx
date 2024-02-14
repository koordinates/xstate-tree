import React from "react";
import { setup } from "xstate";

import {
  buildRootComponent,
  singleSlot,
  lazy,
  createXStateTreeMachine,
} from "../";
import { Link, RoutingEvent, useIsRouteActive } from "../routing";

import { TodosMachine } from "./TodosMachine";
import { homeRoute, settingsRoute, history } from "./routes";

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
  setup({
    types: {
      context: {} as Context,
      events: {} as Events,
    },
    actors: {
      TodosMachine: TodosMachine,
      OtherMachine: lazy(OtherMachine),
    },
  }).createMachine({
    id: "app",
    initial: "waitingForRoute",
    on: {
      GO_HOME: {
        guard: ({ event: e }) => e.meta.indexEvent ?? false,
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
  });

export const BuiltAppMachine = createXStateTreeMachine(AppMachine, {
  slots,
  selectors({ inState }) {
    return {
      showingTodos: inState("todos"),
      showingOtherScreen: inState("otherScreen"),
    };
  },
  View({ slots, selectors }) {
    const isHomeActive = useIsRouteActive(homeRoute);

    return (
      <>
        <p data-testid="is-home-active">{isHomeActive ? "true" : "false"}</p>
        {selectors.showingTodos && (
          <>
            <p data-testid="header">On home</p>
            <Link to={settingsRoute} testId="swap-to-other-machine">
              Swap to settings
            </Link>
          </>
        )}
        {selectors.showingOtherScreen && (
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
  },
});

export const App = buildRootComponent({
  machine: BuiltAppMachine,
  routing: {
    history,
    basePath: "",
    routes: [homeRoute, settingsRoute],
    getPathName: () => "/",
    getQueryString: () => "",
  },
});
