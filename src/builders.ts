import React from "react";
import type { EventObject, Typestate, StateMachine, Interpreter } from "xstate";

import { Slot } from "./slots";
import {
  ViewProps,
  XStateTreeMachineMeta,
  XstateTreeMachineStateSchema,
} from "./types";

type Selectors<TContext, TEvent extends EventObject, TSelectors, TStates> = (
  ctx: TContext,
  canHandleEvent: (e: TEvent) => boolean,
  inState: (state: TStates) => boolean,
  __currentState: TStates
) => TSelectors;

/**
 * @public
 */
export function buildSelectors<
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext>,
  TSelectors
>(
  __machine: StateMachine<TContext, any, TEvent, TTypestate, any, any, any>,
  selectors: Selectors<TContext, TEvent, TSelectors, TTypestate["value"]>
): (
  ctx: TContext,
  canHandleEvent: (e: TEvent) => boolean,
  inState: (state: TTypestate["value"]) => boolean,
  currentState: TTypestate["value"]
) => TSelectors {
  let lastState: TTypestate["value"] | undefined = undefined;
  let lastCachedResult: TSelectors | undefined = undefined;
  let lastCtxRef: TContext | undefined = undefined;
  return (ctx, canHandleEvent, inState, currentState) => {
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
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext>,
  TActions,
  TSelectors,
  TSend = (send: TEvent) => void
>(
  __machine: StateMachine<TContext, any, TEvent, TTypestate, any, any, any>,
  __selectors: Selectors<TContext, TEvent, TSelectors, TTypestate["value"]>,
  actions: (send: TSend, selectors: TSelectors) => TActions
): (send: TSend, selectors: TSelectors) => TActions {
  let lastSelectorResult: TSelectors | undefined = undefined;
  let lastCachedResult: TActions | undefined = undefined;
  let lastSendReference: any | undefined = undefined;
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
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext>,
  TActions,
  TSelectors,
  TSlots extends readonly Slot[] = [],
  TViewProps = ViewProps<TSelectors, TActions, TSlots, TTypestate["value"]>,
  TSend = (send: TEvent) => void
>(
  __machine: StateMachine<TContext, any, TEvent, TTypestate, any, any, any>,
  __selectors: Selectors<TContext, TEvent, TSelectors, TTypestate["value"]>,
  __actions: (send: TSend, selectors: TSelectors) => TActions,
  __slots: TSlots,
  view: React.ComponentType<TViewProps>
): React.ComponentType<TViewProps> {
  return React.memo(view) as unknown as React.ComponentType<TViewProps>;
}

/**
 * @public
 */
export function buildXStateTreeMachine<
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext>,
  TSelectors = unknown,
  TActions = unknown,
  TInterpreter extends Interpreter<
    TContext,
    any,
    TEvent,
    TTypestate
  > = Interpreter<TContext, any, TEvent, TTypestate>,
  TSlots extends readonly Slot[] = Slot[]
>(
  machine: StateMachine<TContext, any, TEvent, TTypestate, any, any, any>,
  meta: XStateTreeMachineMeta<
    TContext,
    TEvent,
    TTypestate,
    TSelectors,
    TActions,
    TInterpreter,
    TSlots
  >
): StateMachine<
  TContext,
  XstateTreeMachineStateSchema<
    TContext,
    TEvent,
    TTypestate,
    TSelectors,
    TActions,
    TSlots,
    TInterpreter
  >,
  TEvent,
  TTypestate,
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
