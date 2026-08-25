import { render } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { setup, assign } from "xstate";

import {
  buildCreateRoute,
  buildRootComponent,
  createXStateTreeMachine,
  XstateTreeHistory,
} from "../";
import { delay } from "../utils";

/**
 * A root subscribes to the global emitter in an effect, and a routing root
 * broadcasts the initial route from one too. Effects run in tree order, so a
 * root that renders *after* the routing root only receives the initial route if
 * it has managed to subscribe before the routing root's broadcast.
 */
describe("a root mounting alongside a routing root", () => {
  function makeFixture() {
    const hist: XstateTreeHistory = createMemoryHistory();
    const createRoute = buildCreateRoute(() => hist, "/");

    const fooRoute = createRoute.simpleRoute()({
      url: "/foo/",
      event: "GO_FOO",
    });

    const routingMachine = setup({
      types: { context: {} as Record<string, never> },
    }).createMachine({
      context: {},
      initial: "idle",
      states: { idle: {} },
    });
    const RoutingRoot = buildRootComponent({
      machine: createXStateTreeMachine(routingMachine, {
        View: () => <p>routing root</p>,
      }),
      routing: { basePath: "/", history: hist, routes: [fooRoute] },
    });

    // A bare, routing-less root - the shape an embed mounted beside the app
    // shell has.
    const listenerMachine = setup({
      types: { context: {} as { sawFoo: boolean } },
    }).createMachine({
      context: { sawFoo: false },
      initial: "idle",
      states: { idle: {} },
      on: {
        GO_FOO: { actions: assign({ sawFoo: () => true }) },
      },
    });
    const ListenerRoot = buildRootComponent({
      machine: createXStateTreeMachine(listenerMachine, {
        selectors: ({ ctx }) => ctx,
        View: ({ selectors }) => (
          <p>{selectors.sawFoo ? "saw foo" : "missed foo"}</p>
        ),
      }),
    });

    return { hist, RoutingRoot, ListenerRoot };
  }

  it("delivers the initial routing event to a root rendered after the routing root", async () => {
    const f = makeFixture();
    f.hist.replace("/foo/");

    const { queryByText } = render(
      <>
        <f.RoutingRoot />
        <f.ListenerRoot />
      </>
    );
    await delay(50);

    expect(queryByText("saw foo")).not.toBeNull();
  });

  it("delivers the initial routing event to a root rendered before the routing root", async () => {
    const f = makeFixture();
    f.hist.replace("/foo/");

    const { queryByText } = render(
      <>
        <f.ListenerRoot />
        <f.RoutingRoot />
      </>
    );
    await delay(50);

    expect(queryByText("saw foo")).not.toBeNull();
  });
});
