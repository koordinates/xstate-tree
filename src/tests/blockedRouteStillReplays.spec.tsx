import { render, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { setup, assign } from "xstate";
import { z } from "zod";

import {
  buildCreateRoute,
  buildRootComponent,
  createXStateTreeMachine,
  useIsRouteActive,
  XstateTreeHistory,
} from "../";
import { RoutingEvent } from "../routing";
import { singleSlot } from "../slots";

/**
 * `shouldBlockActiveRouteUpdate` exists so a host can keep a background page's navigation
 * highlighted while an overlay owns the URL. That freeze must apply to route-ACTIVE UI only:
 * a machine mounting into the overlay still needs the route it is being opened on.
 */
describe("a navigation blocked by shouldBlockActiveRouteUpdate", () => {
  function makeFixture() {
    const hist: XstateTreeHistory = createMemoryHistory();
    const createRoute = buildCreateRoute(() => hist, "/");

    const listRoute = createRoute.simpleRoute()({
      url: "/list/",
      event: "GO_LIST",
    });
    const sheetRoute = createRoute.simpleRoute()({
      url: "/sheet/:id/",
      event: "GO_SHEET",
      paramsSchema: z.object({ id: z.string() }),
      meta: {} as { openStandalone?: boolean },
    });

    // Mounts only once GO_SHEET arrives, so it can only learn its id from the replay.
    const sheetMachine = setup({
      types: { context: {} as { id?: string } },
    }).createMachine({
      context: {},
      initial: "idle",
      states: { idle: {} },
      on: {
        GO_SHEET: {
          actions: assign({ id: ({ event }) => (event as any).params.id }),
        },
      },
    });
    const sheetSlot = singleSlot("Sheet");

    const hostMachine = setup({
      types: { context: {} as Record<string, never> },
      actors: {
        sheet: createXStateTreeMachine(sheetMachine, {
          selectors: ({ ctx }) => ctx,
          View: ({ selectors }) => <p>sheet:{selectors.id ?? "no-id"}</p>,
        }),
      },
    }).createMachine({
      context: {},
      initial: "list",
      states: {
        list: {},
        sheet: { invoke: { src: "sheet", id: sheetSlot.getId() } },
      },
      on: { GO_SHEET: { target: ".sheet" } },
    });

    const Root = buildRootComponent({
      machine: createXStateTreeMachine(hostMachine, {
        slots: [sheetSlot],
        View: ({ slots }) => {
          const listActive = useIsRouteActive(listRoute);

          return (
            <>
              <p>list-active:{listActive ? "yes" : "no"}</p>
              <slots.Sheet />
            </>
          );
        },
      }),
      routing: {
        basePath: "/",
        history: hist,
        routes: [listRoute, sheetRoute],
        shouldBlockActiveRouteUpdate: (event: RoutingEvent<any>) =>
          (event.meta as { openStandalone?: boolean } | undefined)
            ?.openStandalone === true,
      },
    });

    return { hist, Root, listRoute, sheetRoute };
  }

  it("still replays the real route to a child mounting into the blocked navigation", async () => {
    const f = makeFixture();
    f.hist.replace("/list/");

    const { findByText, queryByText } = render(<f.Root />);
    await findByText("list-active:yes");

    f.sheetRoute.navigate({
      params: { id: "42" },
      meta: { openStandalone: true },
    });

    // The sheet learns its id, even though the navigation was blocked...
    await waitFor(() => {
      expect(queryByText("sheet:42")).not.toBeNull();
    });

    // ...and the block still does its job: the list stays highlighted behind it.
    expect(queryByText("list-active:yes")).not.toBeNull();
  });
});
