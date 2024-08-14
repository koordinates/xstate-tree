import { render } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { setup, createActor, assign } from "xstate";

import { createXStateTreeMachine, viewToMachine } from "./builders";
import { TestRoutingContext } from "./routing";
import { singleSlot } from "./slots";
import { delay } from "./utils";
import {
  broadcast,
  buildRootComponent,
  getMultiSlotViewForChildren,
} from "./xstateTree";

describe("xstate-tree", () => {
  describe("a machine with a guarded event that triggers external side effects in an action", () => {
    it("does not execute the side effects of events passed to canHandleEvent", async () => {
      const sideEffect = jest.fn();
      const machine = setup({}).createMachine({
        initial: "a",
        states: {
          a: {
            on: {
              SWAP: {
                guard: () => true,
                // Don't do this. There is a reason why assign actions should be pure.
                // but it triggers the issue
                actions: assign(() => {
                  sideEffect();
                }),
                target: "b",
              },
            },
          },
          b: {},
        },
      });

      const xstateTreeMachine = createXStateTreeMachine(machine, {
        selectors({ canHandleEvent }) {
          return {
            canSwap: canHandleEvent({ type: "SWAP" }),
          };
        },
        View({ selectors }) {
          return <p>Can swap: {selectors.canSwap}</p>;
        },
      });
      const Root = buildRootComponent({ machine: xstateTreeMachine });
      render(<Root />);
      await delay(10);

      expect(sideEffect).not.toHaveBeenCalled();
    });
  });

  it("passes the supplied input through to the machine", async () => {
    const machine = setup({
      types: {
        context: {} as { foo: string },
        input: {} as { bar: string },
      },
    }).createMachine({
      initial: "a",
      context: ({ input }) => ({ foo: input.bar }),
      states: {
        a: {},
      },
    });

    const XstateTreeMachine = createXStateTreeMachine(machine, {
      // Had a type error when adding in actions to this machine which has now been resolved
      // keeping it for sanity check
      actions() {
        return {
          foo() {},
        };
      },
      View: ({ selectors }) => {
        return <p>{selectors.foo}</p>;
      },
    });
    const Root = buildRootComponent({
      machine: XstateTreeMachine,
      input: { bar: "foo" },
    });

    const { getByText } = render(<Root />);

    getByText("foo");
  });

  describe("machines that don't have any visible change after initializing", () => {
    it("still renders the machines view", async () => {
      const renderCallback = jest.fn();
      const machine = setup({}).createMachine({
        initial: "a",
        states: {
          a: {},
        },
      });

      const XstateTreeMachine = createXStateTreeMachine(machine, {
        View: () => {
          renderCallback();

          return null;
        },
      });
      const Root = buildRootComponent({ machine: XstateTreeMachine });

      render(<Root />);
      await delay(50);
      expect(renderCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("selectors & action references do not change, state does change", () => {
    it("re-renders the view for the machine", async () => {
      const renderCallback = jest.fn();
      const machine = setup({}).createMachine({
        context: { foo: 1 },
        initial: "a",
        states: {
          a: {
            on: {
              SWAP: "b",
            },
          },
          b: {},
        },
      });

      const XstateTreeMachine = createXStateTreeMachine(machine, {
        View: () => {
          renderCallback();

          return null;
        },
      });
      const Root = buildRootComponent({ machine: XstateTreeMachine });

      const { rerender } = render(<Root />);
      await delay(10);
      rerender(<Root />);
      expect(renderCallback).toHaveBeenCalledTimes(2);

      broadcast({ type: "SWAP" } as any as never);
      await delay(10);
      rerender(<Root />);
      expect(renderCallback).toHaveBeenCalledTimes(5);
    });
  });

  describe("broadcasting event with handler raising error", () => {
    it("does not bubble the error up", () => {
      const machine = setup({}).createMachine({
        context: { foo: 1 },
        initial: "a",
        states: {
          a: {
            on: {
              SWAP: {
                actions: () => {
                  throw new Error();
                },
              },
            },
          },
          b: {},
        },
      });

      const XstateTreeMachine = createXStateTreeMachine(machine, {
        View: () => null,
      });
      const Root = buildRootComponent({ machine: XstateTreeMachine });

      render(<Root />);

      expect(() =>
        broadcast({ type: "SWAP" } as any as never)
      ).not.toThrowError();
    });
  });

  it("sends the event to machines after the machine that errored handling it", () => {
    const childMachineHandler = jest.fn();
    const slots = [singleSlot("child")];
    const childMachine = setup({}).createMachine({
      context: { foo: 2 },
      initial: "a",
      states: {
        a: {
          on: {
            SWAP: {
              actions: () => {
                childMachineHandler();
              },
            },
          },
        },
        b: {},
      },
    });
    const machine = setup({
      actors: {
        childMachine,
      },
    }).createMachine({
      context: { foo: 1 },
      initial: "a",
      invoke: {
        id: slots[0].getId(),
        src: "childMachine",
      },
      states: {
        a: {
          on: {
            SWAP: {
              actions: () => {
                throw new Error();
              },
            },
          },
        },
        b: {},
      },
    });

    const XstateTreeMachine = createXStateTreeMachine(machine, {
      View: () => null,
    });
    const Root = buildRootComponent({ machine: XstateTreeMachine });

    render(<Root />);

    try {
      broadcast({ type: "SWAP" } as any as never);
    } catch {}
    expect(childMachineHandler).toHaveBeenCalled();
  });

  it("passes the current states meta into the v2 selector functions", async () => {
    const machine = setup({}).createMachine({
      id: "test-selectors-meta",
      initial: "idle",
      states: {
        idle: {
          meta: {
            foo: "bar",
          },
        },
      },
    });

    const XstateTreeMachine = createXStateTreeMachine(machine, {
      selectors({ meta }) {
        return { foo: (meta as any)?.foo };
      },
      View: ({ selectors }) => {
        return <p>{selectors.foo}</p>;
      },
    });
    const Root = buildRootComponent({ machine: XstateTreeMachine });

    const { findByText } = render(<Root />);

    expect(await findByText("bar")).toBeTruthy();
  });

  it("allows rendering nested roots", () => {
    const childRoot = viewToMachine(() => <p>Child</p>);
    const ChildRoot = buildRootComponent({ machine: childRoot });
    const rootMachine = viewToMachine(() => {
      return (
        <>
          <p>Root</p>
          <ChildRoot />
        </>
      );
    });
    const Root = buildRootComponent({ machine: rootMachine });

    const { getByText } = render(<Root />);
    getByText("Root");
    getByText("Child");
  });

  describe("getMultiSlotViewForChildren", () => {
    it("memoizes correctly", () => {
      const machine = setup({}).createMachine({
        id: "test",
        initial: "idle",
        states: {
          idle: {},
        },
      });

      const interpreter1 = createActor(machine).start();
      const interpreter2 = createActor(machine).start();

      try {
        const view1 = getMultiSlotViewForChildren(interpreter1, "ignored");
        const view2 = getMultiSlotViewForChildren(interpreter2, "ignored");

        expect(view1).not.toBe(view2);
        expect(view1).toBe(
          getMultiSlotViewForChildren(interpreter1, "ignored")
        );
        expect(view2).toBe(
          getMultiSlotViewForChildren(interpreter2, "ignored")
        );
      } finally {
        interpreter1.stop();
        interpreter2.stop();
      }
    });
  });

  describe("passing children to components", () => {
    it("allows passing them to the Root machines", async () => {
      const machine = setup({}).createMachine({
        id: "test",
        initial: "idle",
        states: {
          idle: {},
        },
      });

      const RootMachine = createXStateTreeMachine(machine, {
        View({ children }) {
          return <>{children}</>;
        },
      });
      const Root = buildRootComponent({
        machine: RootMachine,
        routing: {
          basePath: "/",
          history: createMemoryHistory<any>(),
          routes: [],
        },
      });

      const { findByText } = render(
        <Root>
          <p>Child</p>
        </Root>
      );

      await findByText("Child");
    });

    it("allows passing them to Slots", async () => {
      const childMachine = setup({}).createMachine({
        id: "child",
      });
      const ChildTreeMachine = createXStateTreeMachine(childMachine, {
        View({ children }) {
          console.log(children);
          return <p>{children}</p>;
        },
      });
      const childSlot = singleSlot("Child");
      const machine = setup({
        actors: {
          child: ChildTreeMachine,
        },
      }).createMachine({
        id: "parent",
        invoke: {
          src: "child",
          id: childSlot.getId(),
        },
      });
      const ParentTreeMachine = createXStateTreeMachine(machine, {
        slots: [childSlot],
        View({ slots }) {
          return <slots.Child>Child</slots.Child>;
        },
      });
      const Root = buildRootComponent({ machine: ParentTreeMachine });

      const { findByText } = render(<Root />);

      await findByText("Child");
    });
  });

  describe("rendering a root inside of a root", () => {
    it("throws an error during rendering if both are routing roots", async () => {
      const machine = setup({}).createMachine({
        id: "test",
        initial: "idle",
        states: {
          idle: {},
        },
      });

      const RootMachine = createXStateTreeMachine(machine, {
        View() {
          return <p>I am root</p>;
        },
      });
      const Root = buildRootComponent({
        machine: RootMachine,
        routing: {
          basePath: "/",
          history: createMemoryHistory<any>(),
          routes: [],
        },
      });

      const Root2Machine = createXStateTreeMachine(machine, {
        View() {
          return <Root />;
        },
      });
      const Root2 = buildRootComponent({
        machine: Root2Machine,
        routing: {
          basePath: "/",
          history: createMemoryHistory<any>(),
          routes: [],
        },
      });

      try {
        const { rerender } = render(<Root2 />);
        rerender(<Root2 />);
      } catch (e: any) {
        expect(e.message).toMatchInlineSnapshot(
          `"Routing root rendered inside routing context, this implies a bug"`
        );
        return;
      }

      throw new Error("Should have thrown");
    });

    it("does not throw an error if it's inside a test routing context", async () => {
      const machine = setup({}).createMachine({
        id: "test",
        initial: "idle",
        states: {
          idle: {},
        },
      });

      const RootMachine = createXStateTreeMachine(machine, {
        View() {
          return <p>I am root</p>;
        },
      });
      const Root = buildRootComponent({
        machine: RootMachine,
        routing: {
          basePath: "/",
          history: createMemoryHistory<any>(),
          routes: [],
        },
      });

      const { rerender } = render(
        <TestRoutingContext activeRouteEvents={[]}>
          <Root />
        </TestRoutingContext>
      );
      rerender(
        <TestRoutingContext activeRouteEvents={[]}>
          <Root />
        </TestRoutingContext>
      );
    });

    it("does not throw an error if either or one are a routing root", async () => {
      const RootMachine = viewToMachine(() => <p>I am root</p>);
      const Root = buildRootComponent({ machine: RootMachine });

      const Root2Machine = viewToMachine(() => <Root />);
      const Root2 = buildRootComponent({ machine: Root2Machine });

      const { rerender } = render(<Root2 />);
      rerender(<Root2 />);
    });
  });
});
