import { render, waitFor } from "@testing-library/react";
import React from "react";
import { createMachine } from "xstate";
import "@testing-library/jest-dom";

import {
  buildActions,
  buildSelectors,
  buildView,
  buildXStateTreeMachine,
} from "./builders";
import { lazy } from "./lazy";
import { singleSlot } from "./slots";
import { buildRootComponent } from "./xstateTree";

describe("lazy", () => {
  it("wraps a promise in an xstate-tree machine", () => {
    const promiseFactory = () => new Promise<any>(() => void 0);
    const lazyMachine = lazy(promiseFactory);

    expect(lazyMachine.meta.xstateTreeMachine).toBe(true);
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
    const lazySelectors = buildSelectors(machine, (ctx) => ctx);
    const lazyActions = buildActions(machine, lazySelectors, () => ({}));
    const lazyView = buildView(machine, lazySelectors, lazyActions, [], () => {
      return <p>loaded</p>;
    });
    const lazyMachine = buildXStateTreeMachine(machine, {
      actions: lazyActions,
      selectors: lazySelectors,
      slots: [],
      view: lazyView,
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
      states: {
        idle: {
          invoke: {
            id: lazyMachineSlot.getId(),
            src: () => {
              console.log("root");
              return lazyMachinePromise;
            },
          },
        },
      },
    });
    const slots = [lazyMachineSlot];
    const selectors = buildSelectors(rootMachine, (ctx) => ctx);
    const actions = buildActions(rootMachine, selectors, () => ({}));
    const view = buildView(
      rootMachine,
      selectors,
      actions,
      slots,
      ({ slots }) => {
        return <slots.lazy />;
      }
    );

    const Root = buildRootComponent(
      buildXStateTreeMachine(rootMachine, {
        actions,
        selectors,
        slots,
        view,
      })
    );

    const { container } = render(<Root />);

    await waitFor(() => expect(container).toHaveTextContent("loaded"));
  });

  it("invokes the xstate-tree machine returned by the promise with the context specified in withContext", async () => {
    const machine = createMachine<{ foo: string; baz: string }>({
      id: "lazy-test",
      initial: "idle",
      context: {
        foo: "bar",
        baz: "floople",
      },
      states: {
        idle: {},
      },
    });
    const lazySelectors = buildSelectors(machine, (ctx) => ctx);
    const lazyActions = buildActions(machine, lazySelectors, () => ({}));
    const lazyView = buildView(
      machine,
      lazySelectors,
      lazyActions,
      [],
      ({ selectors }) => {
        return (
          <p>
            {selectors.foo}
            {selectors.baz}
          </p>
        );
      }
    );
    const lazyMachine = buildXStateTreeMachine(machine, {
      actions: lazyActions,
      selectors: lazySelectors,
      slots: [],
      view: lazyView,
    });
    const lazyMachinePromise = lazy(
      () => {
        return new Promise<typeof machine>((res) => {
          setTimeout(() => {
            res(lazyMachine);
          });
        });
      },
      {
        withContext: () => ({
          foo: "qux",
        }),
      }
    );

    const lazyMachineSlot = singleSlot("lazy");
    const rootMachine = createMachine({
      initial: "idle",
      states: {
        idle: {
          invoke: {
            id: lazyMachineSlot.getId(),
            src: () => {
              return lazyMachinePromise;
            },
          },
        },
      },
    });
    const slots = [lazyMachineSlot];
    const selectors = buildSelectors(rootMachine, (ctx) => ctx);
    const actions = buildActions(rootMachine, selectors, () => ({}));
    const view = buildView(
      rootMachine,
      selectors,
      actions,
      slots,
      ({ slots }) => {
        return <slots.lazy />;
      }
    );

    const Root = buildRootComponent(
      buildXStateTreeMachine(rootMachine, {
        actions,
        selectors,
        slots,
        view,
      })
    );

    const { container } = render(<Root />);

    await waitFor(() => expect(container).toHaveTextContent("quxfloople"));
  });
});
