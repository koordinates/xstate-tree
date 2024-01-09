import { render, waitFor } from "@testing-library/react";
import React from "react";
import { createMachine } from "xstate";
import "@testing-library/jest-dom";

import { createXStateTreeMachine } from "./builders";
import { lazy } from "./lazy";
import { singleSlot } from "./slots";
import { buildRootComponent } from "./xstateTree";

describe("lazy", () => {
  it("wraps a promise in an xstate-tree machine", () => {
    const promiseFactory = () => new Promise<any>(() => void 0);
    const lazyMachine = lazy(promiseFactory);

    expect(lazyMachine._xstateTree).toBeDefined();
  });

  it("renders null by default when loading", () => {
    const promiseFactory = () => new Promise<any>(() => void 0);
    const lazyMachine = lazy(promiseFactory);
    const Root = buildRootComponent(lazyMachine);

    const { container, rerender } = render(<Root />);
    rerender(<Root />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the loader component specified in the options object", () => {
    const promiseFactory = () => new Promise<any>(() => void 0);
    const lazyMachine = lazy(promiseFactory, {
      Loader: () => <p>loading</p>,
    });
    const Root = buildRootComponent(lazyMachine);

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

    const Root = buildRootComponent(
      createXStateTreeMachine(rootMachine, {
        slots,
        View({ slots }) {
          return <slots.lazy />;
        },
      })
    );

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

    const Root = buildRootComponent(
      createXStateTreeMachine(rootMachine, {
        slots,
        View({ slots }) {
          return <slots.lazy />;
        },
      })
    );

    const { container } = render(<Root />);

    await waitFor(() => expect(container).toHaveTextContent("quxfloople"));
  });
});
