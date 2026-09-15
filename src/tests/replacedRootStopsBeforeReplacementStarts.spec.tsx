import { render } from "@testing-library/react";
import React from "react";
import { fromCallback, setup } from "xstate";

import { buildRootComponent, createXStateTreeMachine } from "../";

/**
 * Roots start their actor during the layout phase so they never paint unsettled. React runs the
 * passive cleanups of a removed tree only after the replacement tree's layout effects, so a root
 * that only stopped from its passive cleanup would still be running when its replacement
 * started. Anything two instances of a machine share (module-level caches, shared query
 * observers) then sees both alive at once, which never happened while roots started from a
 * passive effect.
 */
describe("a root replaced by a new instance of itself", () => {
  function makeFixture() {
    const lifecycle: string[] = [];
    let instances = 0;

    const machine = setup({
      actors: {
        tracked: fromCallback(() => {
          const instance = ++instances;
          lifecycle.push(`start ${instance}`);

          return () => {
            lifecycle.push(`stop ${instance}`);
          };
        }),
      },
    }).createMachine({
      invoke: { src: "tracked" },
    });

    const Root = buildRootComponent({
      machine: createXStateTreeMachine(machine, {
        View: () => <p>root</p>,
      }),
    });

    return { lifecycle, Root };
  }

  it("stops the replaced instance before the replacement starts", () => {
    const { lifecycle, Root } = makeFixture();

    const { rerender } = render(<Root key="first" />);
    rerender(<Root key="second" />);

    expect(lifecycle).toEqual(["start 1", "stop 1", "start 2"]);
  });

  it("keeps running when its effects are reconnected without unmounting", () => {
    const { lifecycle, Root } = makeFixture();

    render(
      <React.StrictMode>
        <Root />
      </React.StrictMode>
    );

    expect(lifecycle[lifecycle.length - 1]).toMatch(/^start /);
    expect(lifecycle.filter((entry) => entry.startsWith("start")).length).toBe(
      lifecycle.filter((entry) => entry.startsWith("stop")).length + 1
    );
  });
});
