import { render } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { assign, setup } from "xstate";

import {
  AnyXstateTreeMachine,
  buildCreateRoute,
  buildRootComponent,
  createXStateTreeMachine,
  XstateTreeHistory,
} from "../";
import { singleSlot } from "../slots";

// React yields to the browser to paint wherever it calls the scheduler's `requestPaint`, which it
// does after every commit. The mock scheduler can run work up to exactly that point, so the DOM
// after each `unstable_flushUntilNextPaint()` is what the browser would have put on screen.
//
// ts-jest hoists this above the imports; `import/first` forbids writing it there.
// eslint-disable-next-line @rushstack/hoist-jest-mock
jest.mock("scheduler", () => require("scheduler/unstable_mock"));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Scheduler = require("scheduler") as {
  unstable_flushUntilNextPaint(): void;
  unstable_getFirstCallbackNode(): unknown;
};

/**
 * A child that mounts in response to a navigation learns its route from the mount-time replay.
 * That replay, and the subscription that re-renders the child once it has handled the route, have
 * to land before the browser paints. An update scheduled from a passive effect of a non-discrete
 * render is rendered after the paint, so doing either of them there puts the child on screen in
 * its unrouted initial state - an empty or wrong frame - and only corrects it a frame later. Nest
 * a few such children (lazy section -> host -> nested root) and a navigation paints several blank
 * frames in a row.
 */
describe("a child that mounts in response to a navigation", () => {
  async function flushMicrotasks() {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  }

  function makeFixture(detail: AnyXstateTreeMachine) {
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

    // The host only invokes the detail machine once GO_DETAIL has been broadcast, so the detail
    // machine misses the broadcast and depends on the replay.
    const detailSlot = singleSlot("Detail");
    const hostMachine = setup({
      types: { context: {} as Record<string, never> },
      actors: { detail },
    }).createMachine({
      context: {},
      initial: "home",
      states: {
        home: {},
        detail: { invoke: { src: "detail", id: detailSlot.getId() } },
      },
      on: { GO_DETAIL: { target: ".detail" } },
    });

    const Root = buildRootComponent({
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
    });

    return { hist, Root, detailRoute };
  }

  function routedMachine() {
    return setup({
      types: { context: {} as { sawDetail: boolean } },
    }).createMachine({
      context: { sawDetail: false },
      initial: "idle",
      states: { idle: {} },
      on: {
        GO_DETAIL: { actions: assign({ sawDetail: () => true }) },
      },
    });
  }

  function RoutedView({ selectors }: { selectors: { sawDetail: boolean } }) {
    return <p>{selectors.sawDetail ? "saw detail" : "missed detail"}</p>;
  }

  async function paintedFramesAfterNavigatingToDetail(
    f: ReturnType<typeof makeFixture>
  ): Promise<string[]> {
    f.hist.replace("/home/");
    const { findByText } = render(<f.Root />);
    await findByText("host");

    // A real navigation is not wrapped in `act`, and `act` would flush straight through the paints
    // this is looking for.
    const globalWithAct = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const wasActEnvironment = globalWithAct.IS_REACT_ACT_ENVIRONMENT;
    globalWithAct.IS_REACT_ACT_ENVIRONMENT = false;

    try {
      f.detailRoute.navigate();

      const painted: string[] = [];
      for (let i = 0; i < 20; i++) {
        // Browsers drain microtasks before they paint, and React schedules sync-lane work on one.
        await flushMicrotasks();
        if (Scheduler.unstable_getFirstCallbackNode() === null) {
          break;
        }

        Scheduler.unstable_flushUntilNextPaint();
        await flushMicrotasks();
        painted.push(document.body.textContent ?? "");
      }

      return painted;
    } finally {
      globalWithAct.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment;
    }
  }

  it("never paints a slotted child in its unrouted state", async () => {
    const f = makeFixture(
      createXStateTreeMachine(routedMachine(), {
        selectors: ({ ctx }) => ctx,
        View: RoutedView,
      })
    );

    const painted = await paintedFramesAfterNavigatingToDetail(f);

    expect(painted[painted.length - 1]).toContain("saw detail");
    expect(painted.filter((frame) => frame.includes("missed detail"))).toEqual(
      []
    );
  });

  it("never paints a nested root in its unrouted state", async () => {
    const NestedRoot = buildRootComponent({
      machine: createXStateTreeMachine(routedMachine(), {
        selectors: ({ ctx }) => ctx,
        View: RoutedView,
      }),
    });
    const f = makeFixture(
      createXStateTreeMachine(
        setup({}).createMachine({ id: "nested-root-holder" }),
        {
          View: () => <NestedRoot />,
        }
      )
    );

    const painted = await paintedFramesAfterNavigatingToDetail(f);

    expect(painted[painted.length - 1]).toContain("saw detail");
    expect(painted.filter((frame) => frame.includes("missed detail"))).toEqual(
      []
    );
  });
});
