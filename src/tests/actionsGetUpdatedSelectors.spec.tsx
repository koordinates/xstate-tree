import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { assign, setup } from "xstate";

import { createXStateTreeMachine } from "../builders";
import { delay } from "../utils";
import { buildRootComponent } from "../xstateTree";

describe("actions accessing selectors", () => {
  let actionsCallCount = 0;
  type Events = { type: "SET_COUNT"; count: number };
  type Context = { count: number };
  const machine = setup({
    types: { events: {} as Events, context: {} as Context },
  }).createMachine({
    context: {
      count: 0,
    },
    on: {
      SET_COUNT: {
        actions: assign({ count: ({ event }) => event.count }),
      },
    },
    initial: "foo",
    states: {
      foo: {},
    },
  });

  const Root = buildRootComponent({
    machine: createXStateTreeMachine(machine, {
      actions({ selectors, send }) {
        actionsCallCount++;
        return {
          incrementCount() {
            send({ type: "SET_COUNT", count: selectors.count + 1 });
          },
        };
      },
      View: ({ selectors, actions }) => {
        return (
          <button onClick={actions.incrementCount}>{selectors.count}</button>
        );
      },
    }),
  });

  it("gets the most up to date selectors value without re-creating the action functions", async () => {
    const { getByRole, rerender } = render(<Root />);

    await delay(10);
    rerender(<Root />);

    const button = getByRole("button");

    await userEvent.click(button);
    await delay();
    expect(button).toHaveTextContent("1");

    await userEvent.click(button);
    await delay();
    expect(button).toHaveTextContent("2");
    expect(actionsCallCount).toBe(1);
  });
});
