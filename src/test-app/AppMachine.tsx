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
type State =
  | { value: "todos"; context: Context }
  | { value: "otherScreen"; context: Context };
const ScreenSlot = singleSlot("ScreenGoesHere");
const slots = [ScreenSlot];
const OtherMachine = () =>
  import("./OtherMachine").then(({ OtherMachine }) => OtherMachine);
const AppMachine = createMachine<Context, Events, State>(
  {
    id: "app",
    initial: "waitingForRoute",
    on: {
      GO_HOME: {
        target: ".todos",
        cond: (_ctx, e) => e.meta.indexEvent ?? false,
      },
      GO_SETTINGS: ".otherScreen",
    },
    states: {
      waitingForRoute: {},
      todos: {
        invoke: {
          id: ScreenSlot.getId(),
          src: "TodosMachine",
        },
      },
      otherScreen: {
        invoke: {
          id: ScreenSlot.getId(),
          src: "OtherMachine",
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
