import { act, render, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";

import { buildRoutingMachine, viewToMachine } from "./builders";
import { buildCreateRoute } from "./routing";
import { XstateTreeHistory } from "./types";
import { buildRootComponent } from "./xstateTree";

describe("xstate-tree builders", () => {
  describe("viewToMachine", () => {
    it("takes a React view and wraps it in an xstate-tree machine that renders that view", async () => {
      const ViewMachine = viewToMachine(() => <div>hello world</div>);
      const Root = buildRootComponent(ViewMachine);

      const { getByText } = render(<Root />);

      await waitFor(() => getByText("hello world"));
    });

    it("works for Root components", async () => {
      const ViewMachine = viewToMachine(() => <div>hello world</div>);
      const Root = buildRootComponent(ViewMachine);
      const RootMachine = viewToMachine(Root);
      const RootView = buildRootComponent(RootMachine);

      const { getByText } = render(<RootView />);

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

      const Root = buildRootComponent(routingMachine, {
        history: hist,
        basePath: "/",
        routes: [fooRoute, barRoute],
      });

      const { getByText } = render(<Root />);

      act(() => fooRoute.navigate());
      await waitFor(() => getByText("foo"));

      act(() => barRoute.navigate());
      await waitFor(() => getByText("bar"));
    });
  });
});
