import { render } from "@testing-library/react";
import React from "react";
import { createMachine } from "xstate";

import {
  buildRootComponent,
  buildSelectors,
  buildActions,
  buildView,
  buildXStateTreeMachine,
  singleSlot,
} from "../../";

const childMachine = createMachine({
  initial: "idle",
  states: {
    idle: {},
  },
});

const childSelectors = buildSelectors(childMachine, (ctx) => ctx);
const childActions = buildActions(childMachine, childSelectors, () => ({}));
const childView = buildView(
  childMachine,
  childSelectors,
  childActions,
  [],
  () => {
    return <p data-testid="child">child</p>;
  }
);

const child = buildXStateTreeMachine(childMachine, {
  actions: childActions,
  selectors: childSelectors,
  slots: [],
  view: childView,
});

const childSlot = singleSlot("Child");
const slots = [childSlot];
const rootMachine = createMachine({
  initial: "idle",
  invoke: {
    src: () => child,
    id: childSlot.getId(),
  },
  states: {
    idle: {},
  },
});
const selectors = buildSelectors(rootMachine, (ctx) => ctx);
const actions = buildActions(rootMachine, selectors, () => ({}));
const view = buildView(rootMachine, selectors, actions, slots, ({ slots }) => {
  return (
    <>
      <p data-testid="root">root</p>
      <slots.Child />
    </>
  );
});

const root = buildXStateTreeMachine(rootMachine, {
  selectors,
  actions,
  slots,
  view,
});

const RootView = buildRootComponent(root);

describe("Environment without routing", () => {
  it("still works without error", () => {
    const { getByTestId } = render(<RootView />);

    expect(getByTestId("child")).toHaveTextContent("child");
    expect(getByTestId("root")).toHaveTextContent("root");
  });
});
