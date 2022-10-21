import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { assign, createMachine } from "xstate";

import {
  buildActions,
  buildSelectors,
  buildView,
  buildXStateTreeMachine,
} from "../builders";
import { delay } from "../utils";
import { buildRootComponent } from "../xstateTree";

describe("actions accessing selectors", () => {
  let actionsCallCount = 0;
  type Events = { type: "SET_COUNT"; count: number };
  type Context = { count: number };
  const machine = createMachine<Context, Events>({
    context: {
      count: 0,
    },
    on: {
      SET_COUNT: {
        actions: assign({ count: (_, event) => event.count }),
      },
    },
    initial: "foo",
    states: {
      foo: {},
    },
  });

  const selectors = buildSelectors(machine, (ctx) => ({ count: ctx.count }));
  const actions = buildActions(machine, selectors, (send, selectors) => {
    actionsCallCount++;
    return {
      incrementCount() {
        send({ type: "SET_COUNT", count: selectors.count + 1 });
      },
    };
  });

  const view = buildView(
    machine,
    selectors,
    actions,
    [],
    ({ selectors, actions }) => {
      return (
        <button onClick={actions.incrementCount}>{selectors.count}</button>
      );
    }
  );

  const Root = buildRootComponent(
    buildXStateTreeMachine(machine, {
      actions,
      selectors,
      slots: [],
      view,
    })
  );

  it("gets the most up to date selectors value without re-creating the action functions", async () => {
    const { getByRole, rerender } = render(<Root />);

    await delay(10);
    rerender(<Root />);

    const button = getByRole("button");

    userEvent.click(button);
    await delay();
    expect(button).toHaveTextContent("1");

    userEvent.click(button);
    await delay();
    expect(button).toHaveTextContent("2");
    expect(actionsCallCount).toBe(1);
  });
});
