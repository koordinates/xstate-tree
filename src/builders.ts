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
 */
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
