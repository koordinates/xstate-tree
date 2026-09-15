import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { createMachine } from "xstate";
import "@testing-library/jest-dom";

import { createXStateTreeMachine } from "./builders";
import { lazy } from "./lazy";
import { singleSlot } from "./slots";
import { buildRootComponent } from "./xstateTree";

describe("lazy", () => {
  describe("when the promise resolves before a frame has been painted", () => {
    let pendingFrames: FrameRequestCallback[];

    beforeEach(() => {
      pendingFrames = [];
      jest
        .spyOn(window, "requestAnimationFrame")
        .mockImplementation((callback) => {
          pendingFrames.push(callback);
          return pendingFrames.length;
        });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    function renderAlreadyLoaded() {
      const loadedMachine = createXStateTreeMachine(
        createMachine({ id: "already-loaded" }),
        { View: () => <p>loaded</p> }
      );
      const lazyMachine = lazy(() => Promise.resolve(loadedMachine), {
        Loader: () => <p>loading</p>,
      });
      const Root = buildRootComponent({ machine: lazyMachine });

      render(<Root />);
    }

    it("keeps rendering the Loader until the next frame has painted", async () => {
      renderAlreadyLoaded();

      // Every microtask the resolved promise needs, but no frame.
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          await Promise.resolve();
        }
      });
      expect(screen.getByText("loading")).toBeInTheDocument();

      act(() => {
        pendingFrames.forEach((frame) => frame(performance.now()));
      });

      await waitFor(() =>
        expect(screen.getByText("loaded")).toBeInTheDocument()
      );
    });

    it("renders the loaded machine even if no frame is ever painted", async () => {
      renderAlreadyLoaded();

      await waitFor(() =>
        expect(screen.getByText("loaded")).toBeInTheDocument()
      );
      expect(pendingFrames).not.toEqual([]);
    });
  });

  it("wraps a promise in an xstate-tree machine", () => {
    const promiseFactory = () => new Promise<any>(() => void 0);
    const lazyMachine = lazy(promiseFactory);

    expect(lazyMachine._xstateTree).toBeDefined();
  });

  it("renders null by default when loading", () => {
    const promiseFactory = () => new Promise<any>(() => void 0);
    const lazyMachine = lazy(promiseFactory);
    const Root = buildRootComponent({ machine: lazyMachine });

    const { container, rerender } = render(<Root />);
    rerender(<Root />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the loader component specified in the options object", () => {
    const promiseFactory = () => new Promise<any>(() => void 0);
    const lazyMachine = lazy(promiseFactory, {
      Loader: () => <p>loading</p>,
    });
    const Root = buildRootComponent({ machine: lazyMachine });

    const { container, rerender } = render(<Root />);
    rerender(<Root />);

    expect(container.firstChild).toHaveTextContent("loading");
  });

  it("invokes the xstate-tree machine returned by the promise", async () => {
    const machine = createMachine({
      id: "lazy-test",
      initial: "idle",
      states: {
        idle: {},
      },
    });
    const lazyMachine = createXStateTreeMachine(machine, {
      View() {
        return <p>loaded</p>;
      },
    });
    const lazyMachinePromise = lazy(() => {
      return new Promise<any>((res) => {
        setTimeout(() => {
          res(lazyMachine);
        });
      });
    });

    const lazyMachineSlot = singleSlot("lazy");
    const rootMachine = createMachine({
      initial: "idle",
      id: "lazy-root",
      states: {
        idle: {
          invoke: {
            id: lazyMachineSlot.getId(),
            src: lazyMachinePromise,
          },
        },
      },
    });
    const slots = [lazyMachineSlot];

    const Root = buildRootComponent({
      machine: createXStateTreeMachine(rootMachine, {
        slots,
        View({ slots }) {
          return <slots.lazy />;
        },
      }),
    });

    const { container } = render(<Root />);

    await waitFor(() => expect(container).toHaveTextContent("loaded"));
  });

  it("invokes the xstate-tree machine returned by the promise with the context specified in withContext", async () => {
    const machine = createMachine({
      types: {
        context: {} as { foo: string; baz: string },
        input: {} as { foo: string },
      },
      id: "lazy-test",
      initial: "idle",
      context: ({ input }) => ({
        foo: input.foo,
        baz: "floople",
      }),
      states: {
        idle: {},
      },
    });
    const lazyMachine = createXStateTreeMachine(machine, {
      View: ({ selectors }) => {
        return (
          <p>
            {selectors.foo}
            {selectors.baz}
          </p>
        );
      },
    });
    const lazyMachinePromise = lazy(
      () => {
        return new Promise<typeof lazyMachine>((res) => {
          setTimeout(() => {
            res(lazyMachine);
          });
        });
      },
      {
        input: { foo: "qux" },
      }
    );

    const lazyMachineSlot = singleSlot("lazy");
    const rootMachine = createMachine({
      initial: "idle",
      id: "lazy-root",
      states: {
        idle: {
          invoke: {
            id: lazyMachineSlot.getId(),
            src: lazyMachinePromise,
          },
        },
      },
    });
    const slots = [lazyMachineSlot];

    const Root = buildRootComponent({
      machine: createXStateTreeMachine(rootMachine, {
        slots,
        View({ slots }) {
          return <slots.lazy />;
        },
      }),
    });

    const { container } = render(<Root />);

    await waitFor(() => expect(container).toHaveTextContent("quxfloople"));
  });
});
