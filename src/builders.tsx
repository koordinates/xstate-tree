import React from "react";
import {
  type EventObject,
  type StateMachine,
  type AnyStateMachine,
  type ContextFrom,
  type EventFrom,
  type InterpreterFrom,
  type AnyFunction,
  createMachine,
  StateNodeConfig,
} from "xstate";

import { AnyRoute } from "./routing";
import { Slot, singleSlot } from "./slots";
import {
  AnyActions,
  AnySelector,
  CanHandleEvent,
  MatchesFrom,
  OutputFromSelector,
  V1Selectors as LegacySelectors,
  V2BuilderMeta,
  ViewProps,
  XStateTreeMachineMetaV1,
  XstateTreeMachineStateSchemaV1,
  XstateTreeMachineStateSchemaV2,
  AnyXstateTreeMachine,
} from "./types";

/**
 * @public
 *
 * Factory function for selectors. The selectors function is passed three arguments:
 * - `ctx` - the current context of the machines state
 * - `canHandleEvent` - a function that can be used to determine if the machine can handle a
 * given event, by simulating sending the event and seeing if a stat change would happen.
 * Handles guards
 * - `inState` - equivalent to xstates `state.matches`, allows checking if the machine is in a given state
 *
 * The resulting selector function has memoization. It will return the same value until the
 * machine's state changes or the machine's context changes
 * @param machine - The machine to create the selectors for
 * @param selectors - The selector function
 * @returns The selectors - ready to be passed to {@link buildActions}
 * @deprecated use {@link createXStateTreeMachine} instead
 */
export function buildSelectors<
  TMachine extends AnyStateMachine,
  TSelectors,
  TContext = ContextFrom<TMachine>
>(
  __machine: TMachine,
  selectors: (
    ctx: TContext,
    canHandleEvent: CanHandleEvent<TMachine>,
    inState: MatchesFrom<TMachine>,
    __currentState: never
  ) => TSelectors
): LegacySelectors<
  TContext,
  EventFrom<TMachine>,
  TSelectors,
  MatchesFrom<TMachine>
> {
  let lastState: never | undefined = undefined;
  let lastCachedResult: TSelectors | undefined = undefined;
  let lastCtxRef: TContext | undefined = undefined;

  return (
    ctx: TContext,
    canHandleEvent: CanHandleEvent<TMachine>,
    inState: MatchesFrom<TMachine>,
    currentState
  ) => {
    // Handles caching to ensure stable references to selector results
    // Only re-run the selector if
    // * The reference to the context object has changed (the context object should never be mutated)
    // * The last state we ran the selectors in has changed. This is to ensure `canHandleEvent` and `inState` calls aren't stale
    if (
      lastCtxRef === ctx &&
      lastState === currentState &&
      lastCachedResult !== undefined
    ) {
      return lastCachedResult;
    } else {
      const result = selectors(ctx, canHandleEvent, inState, currentState);
      lastCtxRef = ctx;
      lastCachedResult = result;
      lastState = currentState;

      return result;
    }
  };
}

/**
 * @public
 *
 * Factory function for actions. The actions function is passed two arguments:
 * - `send` - the interpreters send function, which can be used to send events to the machine
 * - `selectors` - the output of the selectors function from {@link buildSelectors}
 *
 * The resulting action function will only be called once per invocation of a machine.
 * The selectors are passed in as a proxy to always read the latest selector value
 *
 * @param machine - The machine to create the actions for
 * @param selectors - The selectors function
 * @param actions - The action function
 * @returns The actions function - ready to be passed to {@link buildView}
 * @deprecated use {@link createXStateTreeMachine} instead
 * */
export function buildActions<
  TMachine extends AnyStateMachine,
  TActions,
  TSelectors,
  TSend = InterpreterFrom<TMachine>["send"]
>(
  __machine: TMachine,
  __selectors: TSelectors,
  actions: (send: TSend, selectors: OutputFromSelector<TSelectors>) => TActions
): (send: TSend, selectors: OutputFromSelector<TSelectors>) => TActions {
  return actions;
}

/**
 * @public
 *
 * Factory function for views. The view is passed four props:
 * - `slots` - the slots object, which can be used to render the children of the view invoked by the machine
 * - `actions` - the output of the actions function from {@link buildActions}
 * - `selectors` - the output of the selectors function from {@link buildSelectors}
 * - `inState` - equivalent to xstates `state.matches`, allows checking if the machine is in a given state
 *
 * The resulting view is wrapped in React.memo, it will re-render when the actions or selectors reference changes
 *
 * @param machine - The machine to create the view for
 * @param selectors - The selectors function from {@link buildSelectors}
 * @param actions - The actions function from {@link buildActions}
 * @param slots - The array of slots that can be rendered by the view
 * @param view - The view function
 * @returns The React view
 * @deprecated use {@link createXStateTreeMachine} instead
 */
export function buildView<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
  TActions,
  TSelectors extends AnySelector,
  TSlots extends readonly Slot[] = [],
  TMatches extends AnyFunction = MatchesFrom<TMachine>,
  TViewProps = ViewProps<
    OutputFromSelector<TSelectors>,
    TActions,
    TSlots,
    TMatches
  >,
  TSend = (send: TEvent) => void
>(
  __machine: TMachine,
  __selectors: TSelectors,
  __actions: (
    send: TSend,
    selectors: OutputFromSelector<TSelectors>
  ) => TActions,
  __slots: TSlots,
  view: React.ComponentType<TViewProps>
): React.ComponentType<TViewProps> {
  return React.memo(view) as unknown as React.ComponentType<TViewProps>;
}

/**
 * @public
 *
 * staples xstate machine and xstate-tree metadata together into an xstate-tree machine
 *
 * @param machine - The machine to staple the selectors/actions/slots/view to
 * @param metadata - The xstate-tree metadata to staple to the machine
 * @returns The xstate-tree machine, ready to be invoked by other xstate-machines or used with `buildRootComponent`
 * @deprecated use {@link createXStateTreeMachine} instead
 */
export function buildXStateTreeMachine<
  TMachine extends AnyStateMachine,
  TSelectors extends AnySelector,
  TActions extends AnyActions
>(
  machine: TMachine,
  meta: XStateTreeMachineMetaV1<TMachine, TSelectors, TActions>
): StateMachine<
  ContextFrom<TMachine>,
  XstateTreeMachineStateSchemaV1<TMachine, TSelectors, TActions>,
  EventFrom<TMachine>,
  any,
  any,
  any,
  any
> {
  const copiedMeta = { ...meta };
  copiedMeta.xstateTreeMachine = true;
  machine.config.meta = {
    ...machine.config.meta,
    ...copiedMeta,
    builderVersion: 1,
  };
  machine.meta = { ...machine.meta, ...copiedMeta, builderVersion: 1 };

  return machine;
}

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
): StateMachine<
  ContextFrom<TMachine>,
  XstateTreeMachineStateSchemaV2<
    TMachine,
    TSelectorsOutput,
    TActionsOutput,
    TSlots
  >,
  EventFrom<TMachine>,
  any,
  any,
  any,
  any
> {
  const selectors = options.selectors ?? (({ ctx }) => ctx);
  const actions = options.actions ?? (() => ({}));

  const xstateTreeMeta = {
    selectors,
    actions,
    View: options.View,
    slots: options.slots ?? [],
  };
  machine.meta = {
    ...machine.meta,
    ...xstateTreeMeta,
    builderVersion: 2,
  };
  machine.config.meta = {
    ...machine.config.meta,
    ...xstateTreeMeta,
    builderVersion: 2,
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
  view: (args?: any) => JSX.Element | null
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
          src: (_ctx, e) => {
            return mappings[e.type as TRoutes[number]["event"]];
          },
          id: contentSlot.getId(),
        },
      },
    };
  }, {} as Record<string, StateNodeConfig<any, any, any>>);

  const mappingsToEvents = Object.keys(mappings).reduce(
    (acc, event) => ({
      ...acc,
      [event]: {
        target: `.${sanitizeEventName(event)}`,
      },
    }),
    {}
  );
  const machine = createMachine({
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
