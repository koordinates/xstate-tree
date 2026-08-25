import { render } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { setup } from "xstate";
import { z } from "zod";

import {
  buildCreateRoute,
  buildRootComponent,
  createXStateTreeMachine,
  XstateTreeHistory,
} from "../";
import { singleSlot } from "../slots";
import { delay } from "../utils";

/**
 * A slotted child that only mounts in response to a routing event receives that
 * event from `getViewForInterpreter`'s mount-time replay, which runs in a passive
 * effect. Passive effects run child-first, so a child that navigates in response
 * to its route runs *before* the root's own route-resolution effect for the route
 * that mounted it.
 *
 * That used to leave the root resolving the previous route against the events of
 * the new one, which threw out of a passive effect and unmounted the entire app.
 */
describe("navigating while the root is still resolving the previous route", () => {
  function makeFixture() {
    const hist: XstateTreeHistory = createMemoryHistory();
    const createRoute = buildCreateRoute(() => hist, "/");

    const listRoute = createRoute.simpleRoute()({
      url: "/list/",
      event: "GO_LIST",
    });
    const detailRoute = createRoute.simpleRoute()({
      url: "/detail/:id/",
      event: "GO_DETAIL",
      paramsSchema: z.object({ id: z.string() }),
    });

    // Mirrors a detail machine that normalises the URL back to the list route as
    // it opens, ie. a deep link that opens a dialog over the list.
    const detailMachine = setup({
      types: { context: {} as Record<string, never> },
    }).createMachine({
      context: {},
      initial: "open",
      states: { open: {} },
      on: {
        GO_DETAIL: {
          actions: () => listRoute.navigate({ meta: { replace: true } }),
        },
      },
    });
    const DetailTreeMachine = createXStateTreeMachine(detailMachine, {
      View: () => <p>detail</p>,
    });

    const detailSlot = singleSlot("Detail");
    const rootMachine = setup({
      types: { context: {} as Record<string, never> },
      actors: { detail: DetailTreeMachine },
    }).createMachine({
      context: {},
      initial: "list",
      states: {
        list: {},
        detail: {
          invoke: { src: "detail", id: detailSlot.getId() },
        },
      },
      on: {
        GO_DETAIL: { target: ".detail" },
      },
    });
    const RootTreeMachine = createXStateTreeMachine(rootMachine, {
      slots: [detailSlot],
      View: ({ slots }) => (
        <div>
          <p>list</p>
          <slots.Detail />
        </div>
      ),
    });

    return {
      hist,
      Root: buildRootComponent({
        machine: RootTreeMachine,
        routing: {
          basePath: "/",
          history: hist,
          routes: [listRoute, detailRoute],
        },
      }),
    };
  }

  it("does not tear the app down when a slotted child navigates from its mount-time route replay", async () => {
    const f = makeFixture();
    f.hist.replace("/detail/1/");

    const { queryByText } = render(<f.Root />);
    await delay(50);

    expect(queryByText("list")).not.toBeNull();
    expect(queryByText("detail")).not.toBeNull();
    expect(f.hist.location.pathname).toBe("/list/");
  });
});
