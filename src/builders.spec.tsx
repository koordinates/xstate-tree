import { act, render, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { setup } from "xstate";

import {
  buildRoutingMachine,
  createXStateTreeMachine,
  viewToMachine,
} from "./builders";
import { buildCreateRoute } from "./routing";
import { XstateTreeHistory } from "./types";
import { buildRootComponent } from "./xstateTree";

describe("xstate-tree builders", () => {
  describe("createXStateTreeMachine", () => {
    it("passes through the selectors/actions/slots/view types correctly through to the _xstateTree property", () => {
      const machine = setup({
        types: {
          context: {} as { foo: string; bar: string },
        },
      }).createMachine({
        context: {
          foo: "foo",
          bar: "bar",
        },
        initial: "idle",
        states: {
          idle: {},
        },
      });

      const xstateTreeMachine = createXStateTreeMachine(machine, {
        selectors({ ctx }) {
          return {
            foobar: ctx.foo + ctx.bar,
          };
        },
        View({ selectors }) {
          return <div>{selectors.foobar}</div>;
        },
      });

      const View = xstateTreeMachine._xstateTree.View;

      <View
        actions={{}}
        slots={{}}
        selectors={{
          foobar: "foobar",
          // @ts-expect-error - should not be able to access context properties
          foo: "expect-error",
        }}
      />;
    });
  });

  describe("viewToMachine", () => {
    it("takes a React view and wraps it in an xstate-tree machine that renders that view", async () => {
      const ViewMachine = viewToMachine(() => <div>hello world</div>);
      const Root = buildRootComponent({ machine: ViewMachine });

      const { getByText } = render(<Root />);

      await waitFor(() => getByText("hello world"));
    });
  });

  describe("buildRoutingMachine", () => {
    const hist: XstateTreeHistory = createMemoryHistory();
    const createRoute = buildCreateRoute(() => hist, "/");

    const fooRoute = createRoute.simpleRoute()({
      url: "/foo/",
      event: "GO_TO_FOO",
    });
    const barRoute = createRoute.simpleRoute()({
      url: "/bar/",
      event: "GO_TO_BAR",
    });

    it("takes a mapping of routes to machines and returns a machine that invokes those machines when those routes events are broadcast", async () => {
      const FooMachine = viewToMachine(() => <div>foo</div>);
      const BarMachine = viewToMachine(() => <div>bar</div>);

      const routingMachine = buildRoutingMachine([fooRoute, barRoute], {
        GO_TO_FOO: FooMachine,
        GO_TO_BAR: BarMachine,
      });

      const Root = buildRootComponent({
        machine: routingMachine,
        routing: {
          history: hist,
          basePath: "/",
          routes: [fooRoute, barRoute],
        },
      });

      const { getByText } = render(<Root />);

      act(() => fooRoute.navigate());
      await waitFor(() => getByText("foo"));

      act(() => barRoute.navigate());
      await waitFor(() => getByText("bar"));
    });
  });
});
