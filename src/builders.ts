import React from "react";
import type {
  EventObject,
  StateMachine,
  AnyStateMachine,
  ContextFrom,
  EventFrom,
  InterpreterFrom,
  AnyFunction,
} from "xstate";

import { Slot } from "./slots";
import {
  AnyActions,
  AnySelector,
  MatchesFrom,
  OutputFromSelector,
  Selectors,
  ViewProps,
  XStateTreeMachineMeta,
  XstateTreeMachineStateSchema,
} from "./types";

type CanHandleEvent<TMachine extends AnyStateMachine> = (
  e: EventFrom<TMachine>
) => boolean;
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
): Selectors<TContext, EventFrom<TMachine>, TSelectors, MatchesFrom<TMachine>> {
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
 * The resulting action function has memoization. It will return the same value until the
 * selectors reference changes or the send reference changes
 *
 * @param machine - The machine to create the actions for
 * @param selectors - The selectors function
 * @param actions - The action function
 * @returns The actions function - ready to be passed to {@link buildView}
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
  let lastSelectorResult: OutputFromSelector<TSelectors> | undefined =
    undefined;
  let lastCachedResult: TActions | undefined = undefined;
  let lastSendReference: TSend | undefined = undefined;

  return (send, selectors) => {
    if (
      lastSelectorResult === selectors &&
      lastCachedResult !== undefined &&
      lastSendReference === send
    ) {
      return lastCachedResult;
    }

    lastCachedResult = actions(send, selectors);
    lastSelectorResult = selectors;
    lastSendReference = send;

    return lastCachedResult;
  };
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
 */
export function buildXStateTreeMachine<
  TMachine extends AnyStateMachine,
  TSelectors extends AnySelector,
  TActions extends AnyActions
>(
  machine: TMachine,
  meta: XStateTreeMachineMeta<TMachine, TSelectors, TActions>
): StateMachine<
  ContextFrom<TMachine>,
  XstateTreeMachineStateSchema<TMachine, TSelectors, TActions>,
  EventFrom<TMachine>,
  any,
  any,
  any,
  any
> {
  const copiedMeta = { ...meta };
  copiedMeta.xstateTreeMachine = true;
  machine.config.meta = { ...machine.config.meta, ...copiedMeta };
  machine.meta = { ...machine.meta, ...copiedMeta };

  return machine;
}
