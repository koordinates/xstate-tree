import { render, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { setup, assign } from "xstate";

import {
  buildCreateRoute,
  buildRootComponent,
  createXStateTreeMachine,
  XstateTreeHistory,
} from "../";
import { singleSlot } from "../slots";

/**
 * A root nested inside another root's routing context gets its routes the same way a slotted
 * child does: replayed when it mounts.
 *
 * `buildRootComponent` renders its own machine through `XstateTreeView`, which never calls
 * `getViewForInterpreter` — so without a replay of its own, a nested root that mounts in
 * RESPONSE to a navigation never hears the route that opened it. The broadcast can't cover it
 * either: that fired before the root existed.
 */
describe("a bare root nested inside a routing context", () => {
  function makeFixture() {
    const hist: XstateTreeHistory = createMemoryHistory();
    const createRoute = buildCreateRoute(() => hist, "/");

    const homeRoute = createRoute.simpleRoute()({
      url: "/home/",
      event: "GO_HOME",
    });
    const detailRoute = createRoute.simpleRoute()({
      url: "/detail/",
      event: "GO_DETAIL",
    });

    // The nested root. Note it is NOT given `routing` — it reads the outer root's context.
    const nestedMachine = setup({
      types: { context: {} as { sawDetail: boolean } },
    }).createMachine({
      context: { sawDetail: false },
      initial: "idle",
      states: { idle: {} },
      on: {
        GO_DETAIL: { actions: assign({ sawDetail: () => true }) },
      },
    });
    const NestedRoot = buildRootComponent({
      machine: createXStateTreeMachine(nestedMachine, {
        selectors: ({ ctx }) => ctx,
        View: ({ selectors }) => (
          <p>{selectors.sawDetail ? "saw detail" : "missed detail"}</p>
        ),
      }),
    });

    // The outer routing root renders the nested root only once GO_DETAIL arrives, so the nested
    // root mounts strictly after the route that should reach it.
    const detailSlot = singleSlot("Detail");
    const hostMachine = setup({
      types: { context: {} as Record<string, never> },
      actors: {
        detail: createXStateTreeMachine(
          setup({}).createMachine({ id: "detail-holder" }),
          { View: () => <NestedRoot /> }
        ),
      },
    }).createMachine({
      context: {},
      initial: "home",
      states: {
        home: {},
        detail: { invoke: { src: "detail", id: detailSlot.getId() } },
      },
      on: { GO_DETAIL: { target: ".detail" } },
    });

    return {
      hist,
      Root: buildRootComponent({
        machine: createXStateTreeMachine(hostMachine, {
          slots: [detailSlot],
          View: ({ slots }) => (
            <>
              <p>host</p>
              <slots.Detail />
            </>
          ),
        }),
        routing: {
          basePath: "/",
          history: hist,
          routes: [homeRoute, detailRoute],
        },
      }),
      detailRoute,
    };
  }

  it("replays the active route to a nested root that mounts in response to a navigation", async () => {
    const f = makeFixture();
    f.hist.replace("/home/");

    const { queryByText, findByText } = render(<f.Root />);
    // The nested root only mounts on the detail route, so wait on the host instead.
    await findByText("host");
    expect(queryByText("missed detail")).toBeNull();

    f.detailRoute.navigate();

    await waitFor(() => {
      expect(queryByText("saw detail")).not.toBeNull();
    });
  });

  it("replays the boot route to a nested root that is present from the start", async () => {
    const f = makeFixture();
    f.hist.replace("/detail/");

    const { queryByText } = render(<f.Root />);

    await waitFor(() => {
      expect(queryByText("saw detail")).not.toBeNull();
    });
  });
});
