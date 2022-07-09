import { type History } from "history";
import React from "react";
import type { EventObject, Typestate, Interpreter } from "xstate";

import { Slot, GetSlotNames } from "./slots";

/**
 * @public
 */
export type XStateTreeMachineMeta<
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
> = {
  slots: TSlots;
  view: React.ComponentType<
    ViewProps<TSelectors, TActions, TSlots, TTypestate["value"]>
  >;
  selectors: (
    ctx: TContext,
    canHandleEvent: (e: TEvent) => boolean,
    inState: (state: TTypestate["value"]) => boolean,
    // This isn't supposed to be used, just needed as a cache buster
    _state: TTypestate["value"]
  ) => TSelectors;
  actions: (send: TInterpreter["send"], selectors: TSelectors) => TActions;
  xstateTreeMachine?: true;
};

/**
 * @public
 */
export type XstateTreeMachineStateSchema<
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext>,
  TSelectors = unknown,
  TActions = unknown,
  TSlots extends readonly Slot[] = Slot[],
  TInterpreter extends Interpreter<
    TContext,
    any,
    TEvent,
    TTypestate
  > = Interpreter<TContext, any, TEvent, TTypestate>
> = {
  meta: XStateTreeMachineMeta<
    TContext,
    TEvent,
    TTypestate,
    TSelectors,
    TActions,
    TInterpreter,
    TSlots
  >;
};

/**
 * @public
 */
export type ViewProps<
  TSelectors,
  TActions,
  TSlots extends readonly Slot[],
  TState
> = {
  slots: Record<GetSlotNames<TSlots>, React.ComponentType>;
  actions: TActions;
  selectors: TSelectors;
  inState: (state: TState) => boolean;
};

declare global {
  /**
   *
   * This is a global container interface for all global event types
   * Different files can extend this interface with their own types by adding a `declare global`
   *
   * Events are defined as follows, as properties on the interface
   *
   * NO_PAYLOAD: string => { type: "NO_PAYLOAD" }
   * A_PAYLOAD: { a: "payload" } => { type: "A_PAYLOAD", a: "payload" }
   */
  interface XstateTreeEvents {}
}
/**
 * @public
 * Extracts the properties defined on the XstateTreeEvents interface and converts them
 * into proper event objects.
 *
 * Properties extending `string` have no payloads, any other type is the payload for the event
 * The property name is extracted as the `type` of the event
 */
export type GlobalEvents = {
  [I in keyof XstateTreeEvents]: XstateTreeEvents[I] extends string
    ? { type: I }
    : XstateTreeEvents[I] & { type: I };
}[keyof XstateTreeEvents];

/**
 * @public
 *
 * Extracts the event objects for the specified event types from the GlobalEvents union
 */
export type PickEvent<
  T extends Extract<GlobalEvents, { type: string }>["type"]
> = Extract<GlobalEvents, { type: T }>;

/**
 * @public
 */
export type XstateTreeHistory = History<{
  meta?: unknown;
  previousUrl?: string;
}>;
