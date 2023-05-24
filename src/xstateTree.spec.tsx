import { render } from "@testing-library/react";
import { assign } from "@xstate/immer";
import React from "react";
import { createMachine, interpret } from "xstate";

import {
  buildXStateTreeMachine,
  buildView,
  buildSelectors,
  buildActions,
  createXStateTreeMachine,
} from "./builders";
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
      const machine = createMachine({
        initial: "a",
        states: {
          a: {
            on: {
              SWAP: {
                cond: () => true,
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
      const Root = buildRootComponent(xstateTreeMachine);
      render(<Root />);
      await delay(10);

      expect(sideEffect).not.toHaveBeenCalled();
    });
  });

  describe("machines that don't have any visible change after initializing", () => {
    it("still renders the machines view", async () => {
      const renderCallback = jest.fn();
      const machine = createMachine({
        initial: "a",
        states: {
          a: {},
        },
      });

      const selectors = buildSelectors(machine, (ctx) => ctx);
      const actions = buildActions(machine, selectors, () => ({}));
      const view = buildView(machine, selectors, actions, [], () => {
        renderCallback();

        return null;
      });

      const XstateTreeMachine = buildXStateTreeMachine(machine, {
        actions,
        selectors,
        slots: [],
        view,
      });
      const Root = buildRootComponent(XstateTreeMachine);

      render(<Root />);
      await delay(50);
      expect(renderCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("selectors & action references do not change, state does change", () => {
    it("re-renders the view for the machine", async () => {
      const renderCallback = jest.fn();
      const machine = createMachine({
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

      const selectors = buildSelectors(machine, (ctx) => ctx);
      const actions = buildActions(machine, selectors, () => ({}));
      const view = buildView(machine, selectors, actions, [], () => {
        renderCallback();

        return null;
      });

      const XstateTreeMachine = buildXStateTreeMachine(machine, {
        actions,
        selectors,
        slots: [],
        view,
      });
      const Root = buildRootComponent(XstateTreeMachine);

      const { rerender } = render(<Root />);
      await delay(10);
      rerender(<Root />);
      expect(renderCallback).toHaveBeenCalledTimes(1);

      broadcast({ type: "SWAP" } as any as never);
      await delay(10);
      rerender(<Root />);
      expect(renderCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe("broadcasting event with handler raising error", () => {
    it("does not bubble the error up", () => {
      const machine = createMachine({
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

      const selectors = buildSelectors(machine, (ctx) => ctx);
      const actions = buildActions(machine, selectors, () => ({}));
      const view = buildView(machine, selectors, actions, [], () => {
        return null;
      });

      const XstateTreeMachine = buildXStateTreeMachine(machine, {
        actions,
        selectors,
        slots: [],
        view,
      });
      const Root = buildRootComponent(XstateTreeMachine);

      render(<Root />);

      expect(() =>
        broadcast({ type: "SWAP" } as any as never)
      ).not.toThrowError();
    });
  });

  it("sends the event to machines after the machine that errored handling it", () => {
    const childMachineHandler = jest.fn();
    const slots = [singleSlot("child")];
    const childMachine = createMachine({
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
    const machine = createMachine({
      context: { foo: 1 },
      initial: "a",
      invoke: {
        id: slots[0].getId(),
        src: () => {
          return childMachine;
        },
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

    const selectors = buildSelectors(machine, (ctx) => ctx);
    const actions = buildActions(machine, selectors, () => ({}));
    const view = buildView(machine, selectors, actions, [], () => {
      return null;
    });

    const XstateTreeMachine = buildXStateTreeMachine(machine, {
      actions,
      selectors,
      slots: [],
      view,
    });
    const Root = buildRootComponent(XstateTreeMachine);

    render(<Root />);

    try {
      broadcast({ type: "SWAP" } as any as never);
    } catch {}
    expect(childMachineHandler).toHaveBeenCalled();
  });

  describe("getMultiSlotViewForChildren", () => {
    it("memoizes correctly", () => {
      const machine = createMachine({
        id: "test",
        initial: "idle",
        states: {
          idle: {},
        },
      });

      const interpreter1 = interpret(machine).start();
      const interpreter2 = interpret(machine).start();

      const view1 = getMultiSlotViewForChildren(interpreter1, "ignored");
      const view2 = getMultiSlotViewForChildren(interpreter2, "ignored");

      expect(view1).not.toBe(view2);
      expect(view1).toBe(getMultiSlotViewForChildren(interpreter1, "ignored"));
      expect(view2).toBe(getMultiSlotViewForChildren(interpreter2, "ignored"));
    });
  });
});
