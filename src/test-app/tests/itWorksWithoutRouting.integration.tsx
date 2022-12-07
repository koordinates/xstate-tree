import { render } from "@testing-library/react";
import React from "react";
import { createMachine } from "xstate";

import {
  buildRootComponent,
  singleSlot,
  createXStateTreeMachine,
} from "../../";

const childMachine = createMachine({
  initial: "idle",
  states: {
    idle: {},
  },
});

const child = createXStateTreeMachine(childMachine, {
  View: () => <p data-testid="child">child</p>,
});

const childSlot = singleSlot("Child");
const rootMachine = createMachine<any, any, any>({
  initial: "idle",
  invoke: {
    src: () => child,
    id: childSlot.getId(),
  },
  states: {
    idle: {},
  },
});

const root = createXStateTreeMachine(rootMachine, {
  slots: [childSlot],
  View({ slots }) {
    return (
      <>
        <p data-testid="root">root</p>
        <slots.Child />
      </>
    );
  },
});

const RootView = buildRootComponent(root);

describe("Environment without routing", () => {
  it("still works without error", () => {
    const { getByTestId } = render(<RootView />);

    expect(getByTestId("child")).toHaveTextContent("child");
    expect(getByTestId("root")).toHaveTextContent("root");
  });
});
