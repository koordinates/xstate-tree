import { render, act } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";
import { setup } from "xstate";

import {
  buildRootComponent,
  singleSlot,
  createXStateTreeMachine,
} from "../../";
import { delay } from "../../utils";

describe("slot getId with suffix", () => {
  it("renders a child actor invoked with a slot suffix", async () => {
    const ChildSlot = singleSlot("Child");

    const ChildMachine = setup({}).createMachine({
      id: "child",
      initial: "idle",
      states: { idle: {} },
    });

    const BuiltChildMachine = createXStateTreeMachine(ChildMachine, {
      View() {
        return <p data-testid="child-view">Child rendered</p>;
      },
    });

    const ParentMachine = setup({
      types: {
        events: {} as { type: "SWAP" },
      },
      actors: {
        ChildMachine: BuiltChildMachine,
      },
    }).createMachine({
      id: "parent",
      initial: "first",
      states: {
        first: {
          invoke: {
            src: "ChildMachine",
            id: ChildSlot.getId("v1"),
          },
          on: { SWAP: "second" },
        },
        second: {
          invoke: {
            src: "ChildMachine",
            id: ChildSlot.getId("v2"),
          },
        },
      },
    });

    const BuiltParentMachine = createXStateTreeMachine(ParentMachine, {
      slots: [ChildSlot],
      actions({ send }) {
        return {
          swap: () => send({ type: "SWAP" }),
        };
      },
      View({ slots, actions }) {
        return (
          <>
            <button data-testid="swap" onClick={actions.swap}>
              Swap
            </button>
            <slots.Child />
          </>
        );
      },
    });

    const App = buildRootComponent({
      machine: BuiltParentMachine,
      routing: undefined,
    });

    const { getByTestId, queryByTestId } = render(<App />);

    await delay(50);
    expect(queryByTestId("child-view")).toBeInTheDocument();

    await act(async () => {
      getByTestId("swap").click();
    });

    await delay(50);
    expect(queryByTestId("child-view")).toBeInTheDocument();
  });
});
