import React from "react";
import {
  setup,
  type AnyStateMachine,
  AnyStateNodeConfig,
  createMachine,
  type ContextFrom,
} from "xstate";

import { AnyRoute } from "./routing";
import { Slot, singleSlot } from "./slots";
import {
  AnyXstateTreeMachine,
  V2BuilderMeta,
  XstateTreeMachine,
} from "./types";

/**
 * @public
 * Creates an xstate-tree machine from an xstate-machine
 *
 * Accepts an options object defining the selectors/actions/slots and view for the xstate-tree machine
 *
 * Selectors/slots/actions can be omitted from the options object and will default to
 * - actions: an empty object
 * - selectors: the context of the machine
 * - slots: an empty array
 *
 * @param machine - The xstate machine to create the xstate-tree machine from
 * @param options - the xstate-tree options
 */
export function createXStateTreeMachine<
  TMachine extends AnyStateMachine,
  TSelectorsOutput = ContextFrom<TMachine>,
  TActionsOutput = Record<never, string>,
  TSlots extends readonly Slot[] = []
>(
  machine: TMachine,
  options: V2BuilderMeta<TMachine, TSelectorsOutput, TActionsOutput, TSlots>
): XstateTreeMachine<TMachine, TSelectorsOutput, TActionsOutput, TSlots> {
  const selectors = options.selectors ?? (({ ctx }) => ctx);
  const actions = options.actions ?? (() => ({}));

  const machineWithMeta = machine as unknown as XstateTreeMachine<
    TMachine,
    TSelectorsOutput,
    TActionsOutput,
    TSlots
  >;
  machineWithMeta._xstateTree = {
    selectors: selectors as any,
    actions: actions as any,
    View: options.View as any,
    slots: (options.slots ?? []) as any,
  };

  return fixProvideLosingXstateTreeMeta(machineWithMeta);
}

function fixProvideLosingXstateTreeMeta<
  T extends XstateTreeMachine<any, any, any, any>
>(machine: T): T {
  const originalProvide = machine.provide.bind(machine);
  (machine as any).provide = (impl: any) => {
    const result = originalProvide(impl) as T;

    result._xstateTree = machine._xstateTree;
    fixProvideLosingXstateTreeMeta(result);

    return result;
  };

  return machine;
}

/**
 * @public
 *
 * Simple utility builder to aid in integrating existing React views with xstate-tree
 *
 * @param view - the React view you want to invoke in an xstate machine
 * @returns The view wrapped into an xstate-tree machine, ready to be invoked by other xstate machines or used with `buildRootComponent`
 */
export function viewToMachine(
  view: (args?: any) => JSX.Element
): AnyXstateTreeMachine {
  return createXStateTreeMachine(
    createMachine({
      initial: "idle",
      states: { idle: {} },
    }),
    {
      View: view,
    }
  );
}

/**
 * @public
 *
 * Utility to aid in reducing boilerplate of mapping route events to xstate-tree machines
 *
 * Takes a list of routes and a mapping of route events to xstate-tree machines and returns an xstate-tree machine
 * that renders the machines based on the routing events
 *
 * @param _routes - the array of routes you wish to map to machines
 * @param mappings - an object mapping the route events to the machine to invoke
 * @returns an xstate-tree machine that will render the right machines based on the routing events
 */
export function buildRoutingMachine<TRoutes extends AnyRoute[]>(
  _routes: TRoutes,
  mappings: Record<TRoutes[number]["event"], AnyXstateTreeMachine>
): AnyXstateTreeMachine {
  /**
   * States in xstate can't contain dots, since the states are named after the routing events
   * if the routing event contains a dot that will make a state with a dot in it
   * this function sanitizes the event name to remove dots and is used for the state names and targets
   */
  function sanitizeEventName(event: string) {
    return event.replace(/\.([a-zA-Z])/g, (_, letter) => letter.toUpperCase());
  }

  const contentSlot = singleSlot("Content");
  const mappingsToStates = Object.entries<AnyXstateTreeMachine>(
    mappings
  ).reduce((acc, [event, _machine]) => {
    return {
      ...acc,
      [sanitizeEventName(event)]: {
        invoke: {
          src: event,
          id: contentSlot.getId(),
        },
      },
    };
  }, {} as Record<string, AnyStateNodeConfig>);

  const mappingsToEvents = Object.keys(mappings).reduce(
    (acc, event) => ({
      ...acc,
      [event]: {
        target: `.${sanitizeEventName(event)}`,
      },
    }),
    {}
  );
  const machine = setup({
    actors: mappings,
  }).createMachine({
    on: {
      ...mappingsToEvents,
    },
    initial: "idle",
    states: {
      idle: {},
      ...mappingsToStates,
    },
  });

  return createXStateTreeMachine(machine, {
    slots: [contentSlot],
    View: ({ slots }) => {
      return <slots.Content />;
    },
  });
}
