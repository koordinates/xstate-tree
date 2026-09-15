import { render } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React, { useState } from "react";
import { assign, createMachine } from "xstate";

import {
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
 * A root that mounts after the page has loaded - a lazily loaded section hosting a v4 machine, say
 * - has to reach the screen in its settled state. Three things used to paint intermediate frames
 * first:
 *
 * - The root's interpreter is only started by `useMachine`'s passive effect, so the root rendered
 *   nothing on mount and retried from a timer: a guaranteed blank frame.
 * - Its slotted children learn the active route from the mount-time replay. If that replay, or
 *   the subscription that re-renders the child after it, runs in a passive effect, the child is
 *   painted in its unrouted initial state and corrected a frame later.
 *
 * The root here is mounted by a plain state update - the same default-priority render a resolved
 * lazy load produces - long after the route was broadcast, so the slotted child can only learn it
 * from the replay.
 */
describe("a root that mounts after its route was broadcast", () => {
  async function flushMicrotasks() {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  }

  function makeFixture() {
    const hist: XstateTreeHistory = createMemoryHistory();
    const createRoute = buildCreateRoute(() => hist, "/");

    const detailRoute = createRoute.simpleRoute()({
      url: "/detail/",
      event: "GO_DETAIL",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routedMachine = createMachine<any, any>({
      predictableActionArguments: true,
      context: { sawDetail: false },
      initial: "idle",
      states: { idle: {} },
      on: {
        GO_DETAIL: { actions: assign({ sawDetail: (_ctx) => true }) },
      },
    });
    const RoutedChild = createXStateTreeMachine(routedMachine, {
      View: ({ selectors }) => (
        <p>{selectors.sawDetail ? "saw detail" : "missed detail"}</p>
      ),
    });

    const childSlot = singleSlot("Child");
    const LateRoot = buildRootComponent(
      createXStateTreeMachine(
        createMachine(
          {
            predictableActionArguments: true,
            id: "late-root",
            invoke: { src: "child", id: childSlot.getId() },
          },
          { services: { child: RoutedChild } }
        ),
        {
          slots: [childSlot],
          View: ({ slots }) => <slots.Child />,
        }
      )
    );

    let showLateRoot: (show: boolean) => void = () => undefined;
    function LateRootToggle() {
      const [show, setShow] = useState(false);
      showLateRoot = setShow;

      return show ? (
        <>
          <p>late root host</p>
          <LateRoot />
        </>
      ) : null;
    }

    const RoutingRoot = buildRootComponent(
      createXStateTreeMachine(
        createMachine({
          predictableActionArguments: true,
          id: "routing-root",
          initial: "idle",
          states: { idle: {} },
        }),
        {
          View: () => (
            <>
              <p>routing root</p>
              <LateRootToggle />
            </>
          ),
        }
      ),
      {
        basePath: "/",
        history: hist,
        routes: [detailRoute],
      }
    );

    return { hist, RoutingRoot, showLateRoot: () => showLateRoot(true) };
  }

  async function paintedFramesAfterMountingLateRoot(
    f: ReturnType<typeof makeFixture>
  ): Promise<string[]> {
    f.hist.replace("/detail/");
    const { findByText } = render(<f.RoutingRoot />);
    await findByText("routing root");

    // A lazy load resolving is not wrapped in `act`, and `act` would flush straight through the
    // paints this is looking for.
    const globalWithAct = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const wasActEnvironment = globalWithAct.IS_REACT_ACT_ENVIRONMENT;
    globalWithAct.IS_REACT_ACT_ENVIRONMENT = false;

    try {
      f.showLateRoot();

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

  it("paints its slotted child already routed in the first frame it appears in", async () => {
    const painted = await paintedFramesAfterMountingLateRoot(makeFixture());
    const framesWithLateRoot = painted.filter((frame) =>
      frame.includes("late root host")
    );

    expect(framesWithLateRoot).not.toEqual([]);
    expect(
      framesWithLateRoot.filter((frame) => !frame.includes("saw detail"))
    ).toEqual([]);
  });
});
