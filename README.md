# xstate-tree

xstate-tree was born as an answer to the question "What would a UI framework that uses [Actors](https://en.wikipedia.org/wiki/Actor_model) as the building block look like?". Inspired by Thomas Weber's [Master Thesis](https://links-lang.org/papers/mscs/Master_Thesis_Thomas_Weber_1450761.pdf) on the topic. [XState](https://xstate.js.org/) was chosen to power the actors with [React](https://reactjs.org) powering the UI derived from the actors.

xstate-tree was designed to enable modeling large applications as a single tree of xstate machines, with each machine being responsible for smaller and smaller sub sections of the UI. This allows modeling the entire UI structure in state machines, but without having to worry about the complexity of managing the state of the entire application in a single large machine.

Each machine has an associated, but loosely coupled, React view associated with it. The loose coupling allows the view to have no knowledge of the state machine for ease of testing and re-use in tools like [Storybook](https://storybook.js.org). Actors views are composed together via "slots", which can be rendered in the view to provide child actors a place to render their views in the parent's view.

While xstate-tree manages your application state, it does not have a mechanism for providing global application state accessible by multiple actors, this must be provided with another library like [Redux](https://redux.js.org/) or [GraphQL](https://graphql.org/). It does provide a routing solution, outlined [here](https://github.com/koordinates/xstate-tree/blob/master/src/routing/README.md).

At Koordinates we use xstate-tree for all new UI development. Our desktop application, built on top of [Kart](https://kartproject.org/) our Geospatial version control system, is built entirely with xstate-tree using GraphQL for global state.

A minimal example of a single machine tree

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { createMachine } from "xstate";
import { assign } from "@xstate/immer";
import { buildSelectors, buildActions, buildView, buildXstateTreeMachine, buildRootComponent } from "@koordinates/xstate-tree";

type Events = { type: "SWITCH_CLICKED" } | { type: "INCREMENT", amount: number };
type Context = { incremented: number };

// If this tree had more than a single machine the slots to render child machines into would be defined here
const slots = [];

// A standard xstate machine, nothing extra is needed for xstate-tree
const machine = createMachine<Context, Events>({
  id: "root",
  initial: "inactive",
  context: {
    incremented: 0,
  },
  states: {
    inactive: {
      on: {
        SWITCH_CLICKED: "active",
      },
    },
    active: {
      on: {
        SWITCH_CLICKED: "idle",
        INCREMENT: { actions: "increment" },
      },
    },
  },
}, {
  actions: {
    increment: assign((context, event) => {
      context.incremented += event.amount;
    }),
  },
});

// Selectors to transform the machines state into a representation useful for the view
const selectors = buildSelectors(machine, (ctx, canHandleEvent) => ({
  canIncrement: canHandleEvent({type: "INCREMENT", count: 1 }),
  showSecret: ctx.incremented > 10,
  count: ctx.incremented,
}));

// Actions to abstract away the details of sending events to the machine
const actions = buildActions(machine, actions, (send, selectors) => ({
  increment(amount: number) {
     send({ type: "INCREMENT", amount: selectors.count > 4 ? amount * 2 : amount });
  },
  switch() {
    send({ type: "SWITCH_CLICKED" });
  },
}));

// A view to bring it all together
// the return value is a plain React view that can be rendered anywhere by passing in the needed props
// the view has no knowledge of the machine it's bound to
const view = buildView(machine, actions, selectors, slots, ({ actions, selectors, inState }) => {
  return (
    <div>
      <button onClick={() => actions.switch()}>{inState("active") ? "Deactivate" : "Activate"}</button>
      <p>Count: {selectors.count}</p>
      <button onClick={() => actions.increment(1)} disabled={!selectors.canIncrement}>Increment</button>
      {selectors.showSecret && <p>The secret password is hunter2</p>}
    </div>
  );
});

// Stapling the machine, selectors, actions, view, and slots together
const RootMachine = buildXstateTreeMachine(machine, {
  selectors,
  actions,
  view,
  slots
});

// Build the React host for the tree
const XstateTreeRoot = buildRootComponent(RootMachine);


// Rendering it with React
const ReactRoot = createRoot(document.getElementById("root"));
ReactRoot.render(<XstateTreeRoot />);
```

## Overview

Each machine that forms the tree representing your UI has an associated set of selector, action, view functions, and "slots"
  - Selector functions are provided with the current context of the machine, a function to determine if it can handle a given event and a function to determine if it is in a given state, and expose the returned result to the view.
  - Action functions are provided with the `send` method bound to the machines interpreter and the result of calling the selector function
  - Slots are how children of the machine are exposed to the view. They can be either single slot for a single actor, or multi slot for when you have a list of actors. 
  - View functions are React views provided with the output of the selector and action functions, a function to determine if the machine is in a given state, and the currently active slots

## API

To assist in making xstate-tree easy to use with TypeScript there are "builder" functions for selectors, actions, views and the final XState tree machine itself. These functions primarily exist to type the arguments passed into the selector/action/view functions.

* `buildSelectors`, first argument is the machine we are creating selectors for, second argument is the selector factory which receives the machines context as the first argument. It also memoizes the selector factory for better rendering performance  
* `buildActions`, first argument is the machine we are creating actions for, the second argument is the result of `buildSelectors` and the third argument is the actions factory which receives an XState `send` function and the result of calling the selectors factory. It also memoizes the selector factory for better rendering performance  
* `buildView`, first argument is the machine we are creating a view for, second argument is the selector factory, third argument is the actions factory, fourth argument is the array of slots and the fifth argument is the view function itself which gets supplied the selectors, actions, slots and `inState` method as props. It wraps the view in a React.memo  
* `buildXStateTreeMachine` takes the results of `buildSelectors`, `buildActions`, `buildView` and the list of slots and returns an xstate-tree compatible machine

Full API docs coming soon, see [#20](https://github.com/koordinates/xstate-tree/issues/20)

### Slots

Slots are how invoked/spawned children of the machine are supplied to the Machines view. The child machines get wrapped into a React component responsible for rendering the machine itself. Since the view is provided with these components it is responsible for determining where in the view output they show up. This leaves the view in complete control of where the child views are placed.

Slotted machines are determined based on the id of the invoked/spawned machine. There are two types of slots, single and multi. Single slots are for invoked machines, where there will only be a single machine per slot. Multi slots are for spawned machines where there are multiple children per slot, rendered as a group; think lists. There is a set of helper functions for creating slots which in turn can be used to get the id for the slot.

`singleSlot` accepts the name of the slot (must not end in `s`) as the first argument and returns an object with a method `getId()` that returns the id of the slot.  
`multiSlot` accepts the name of the slot (must end in `s`) and returns an object with a method `getId(id: string)` that returns the id of the slot

You should always use the `getId` methods when invoking/spawning something into a slot. Each slot the machine has must be represented by a call to `singleSlot` or `multiSlot` and stored into an array of slots. These slots must be passed to the `buildView` and `buildXStateTreeMachine` functions.

### Inter-machine communication

Communicating between multiple independent xstate machines is done via the `broadcast` function.
Any event broadcast via this function is sent to every machine that has the event in its `nextEvents` array, so it won't get sent to machines that have no handler for the event.

To get access to the type information for these events in a machine listening for it, use the `PickEvent` type to extract the events you are interested in

ie `PickEvent<"FOO" | "BAR">` will return `{type: "FOO" } | { type: "BAR" }` which can be added to your machines event union.

To provide the type information on what events are available you add them to the global XstateTreeEvents interface. This is done using `declare global`

```
declare global {
  interface XstateTreeEvents {
    BASIC: string;
    WITH_PAYLOAD: { a: "payload" }
  }
}
```

That adds two events to the system, a no payload event (`{ type: "BASIC" }`) and event with payload (`{ type: "WITH_PAYLOAD"; a: "payload" }`). These events will now be visible in the typings for `broadcast` and `PickEvent`. The property name is the `type` of the event and the type of the property is the payload of the event. If the event has no payload, use `string`.

These events can be added anywhere, either next to a component for component specific events or in a module for events that are for multiple machines. One thing that it is important to keep in mind is that these `declare global` declarations must be loaded by the `.d.ts` files when importing the component, otherwise the events will be missing. Which means

1. If they are in their own file, say for a module level declaration, that file will need to be imported somewhere. Somewhere that using a component will trigger the import
2. If they are tied to a component they need to be in the index.ts file that imports the view/selectors/actions etc and calls `buildXstateTreeMachine`. If they are in the file containing those functions the index.d.ts file will not end up importing them.


### [Storybook](https://storybook.js.org)

It is relatively simple to display xstate-tree views directly in Storybook. Since the views are plain React components that accept selectors/actions/slots/inState as props you can just import the view and render it in a Story

There are a few utilities in xstate-tree to make this easier

#### `buildViewProps`
This is a builder function that accepts a view to provide typings and then an object containing
actions/selector fields. With the typings it provides these fields are type safe and you can autocomplete them.

It returns the props object and extends it with an `inState` factory function, so you can destructure it for use in Stories. The `inState` function accepts a state string as an argument, and returns a function that returns true if the state supplied matches that. So you can easily render the view in a specific machine state in the Story
```
const { actions, selectors, inState } = buildViewProps(view, { actions: {], selectors: {} });
```

#### `genericSlotsTestingDummy`

This is a simple Proxy object that renders a <div> containing the name of the slot whenever rendering
a slot is attempted in the view. This will suffice as an argument for the slots prop in most views
when rendering them in a Story

#### `slotTestingDummyFactory`

This is not relevant if using the render-view-component approach. But useful if you
are planning on rendering the view using the xstate-tree machine itself, or testing the machine 
via the view.

It's a simple function that takes a name argument and returns a basic xstate-tree machine that you
can replace slot services with. It just renders a div containing the name supplied
