import { render } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { setup, assign } from "xstate";
import { z } from "zod";

import {
  buildRootComponent,
  buildCreateRoute,
  XstateTreeHistory,
  createXStateTreeMachine,
} from "../";
import { delay } from "../utils";

describe("async route redirects", () => {
  const hist: XstateTreeHistory = createMemoryHistory();
  const createRoute = buildCreateRoute(() => hist, "/");

  const parentRoute = createRoute.simpleRoute()({
    url: "/:notFoo/",
    event: "GO_TO_PARENT",
    paramsSchema: z.object({ notFoo: z.string() }),
    redirect: async ({ params }) => {
      await delay(100);

      if (params.notFoo === "foo") {
        return { params: { notFoo: "notFoo" } };
      }

      return;
    },
  });
  const redirectRoute = createRoute.simpleRoute(parentRoute)({
    url: "/foo/:bar/",
    event: "GO_TO_REDIRECT",
    paramsSchema: z.object({ bar: z.string() }),
    redirect: async ({ params }) => {
      if (params.bar === "redirect") {
        return {
          params: {
            bar: "redirected",
          },
        };
      }

      return;
    },
  });
  const childRoute = createRoute.simpleRoute(redirectRoute)({
    url: "/child/",
    event: "GO_TO_CHILD",
  });

  const machine = setup({
    types: { context: {} as { bar?: string } },
  }).createMachine({
    context: {},
    initial: "idle",
    on: {
      GO_TO_REDIRECT: {
        actions: assign({
          bar: ({ event: e }) => {
            return e.params.bar;
          },
        }),
      },
    },
    states: {
      idle: {},
    },
  });

  const Root = buildRootComponent({
    machine: createXStateTreeMachine(machine, {
      View: ({ selectors }) => <p>{selectors.bar}</p>,
    }),
    routing: {
      basePath: "/",
      history: hist,
      routes: [parentRoute, redirectRoute, childRoute],
    },
  });

  it("handles a top/middle/bottom route hierarchy where top and middle perform a redirect", async () => {
    const { queryByText } = render(<Root />);

    childRoute.navigate({ params: { bar: "redirect", notFoo: "foo" } });

    await delay(200);
    expect(queryByText("redirected")).toBeDefined();
    expect(hist.location.pathname).toBe("/notFoo/foo/redirected/child/");
  });

  it("does a history.replace when redirecting", async () => {
    render(<Root />);

    childRoute.navigate({ params: { bar: "redirect", notFoo: "foo" } });

    await delay(140);
    // not sure why it's 3, but when using history.push it's 5
    expect(hist.length).toBe(3);
  });

  it("respects the abort controller and aborts the redirect on route navigation", async () => {
    const { queryByText } = render(<Root />);

    childRoute.navigate({ params: { bar: "redirect", notFoo: "foo" } });
    await delay();
    childRoute.navigate({
      params: { bar: "icancelledtheredirect", notFoo: "foo" },
    });

    await delay(140);
    expect(queryByText("icancelledtheredirect")).toBeDefined();
    expect(hist.location.pathname).toBe(
      "/notFoo/foo/icancelledtheredirect/child/"
    );
  });
});
