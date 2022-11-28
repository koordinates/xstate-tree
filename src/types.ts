import { type History } from "history";
import React from "react";
import type {
  AnyFunction,
  AnyStateMachine,
  ContextFrom,
  EventFrom,
  InterpreterFrom,
  StateFrom,
  StateMachine,
} from "xstate";

import { Slot, GetSlotNames } from "./slots";

/**
 * @public
 */
export type XStateTreeMachineMetaV1<
  TMachine extends AnyStateMachine,
  TSelectors,
  TActions extends AnyActions,
  TSlots extends readonly Slot[] = Slot[]
> = {
  slots: TSlots;
  view: React.ComponentType<
    ViewProps<
      OutputFromSelector<TSelectors>,
      ReturnType<TActions>,
      TSlots,
      MatchesFrom<TMachine>
    >
  >;
  selectors: TSelectors;
  actions: TActions;
  xstateTreeMachine?: true;
};

/**
 * @public
 */
export type XstateTreeMachineStateSchemaV1<
  TMachine extends AnyStateMachine,
  TSelectors extends AnySelector,
  TActions extends AnyActions
> = {
  meta: XStateTreeMachineMetaV1<TMachine, TSelectors, TActions> & {
    builderVersion: 1;
  };
};

/**
 * @public
 */
export type ViewProps<
  TSelectors,
  TActions,
  TSlots extends readonly Slot[],
  TMatches extends AnyFunction
> = {
  slots: Record<GetSlotNames<TSlots>, React.ComponentType>;
  actions: TActions;
  selectors: TSelectors;
  /**
   * @deprecated see https://github.com/koordinates/xstate-tree/issues/33 use `inState` in the selector function instead
   */
  inState: TMatches;
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
export type XstateTreeHistory<T = unknown> = History<{
  meta?: T;
  previousUrl?: string;
}>;

/**
 * @public
 */
export type V1Selectors<TContext, TEvent, TSelectors, TMatches> = (
  ctx: TContext,
  canHandleEvent: (e: TEvent) => boolean,
  inState: TMatches,
  __currentState: never
) => TSelectors;

/**
 * @internal
 */
export type MatchesFrom<T extends AnyStateMachine> = StateFrom<T>["matches"];

/**
 * @public
 */
export type OutputFromSelector<T> = T extends V1Selectors<
  any,
  any,
  infer O,
  any
>
  ? O
  : never;

/**
 * @public
 */
export type AnySelector = V1Selectors<any, any, any, any>;

/**
 * @public
 */
export type AnyActions = (send: any, selectors: any) => any;

/**
 * @public
 */
export type AnyXstateTreeMachine = StateMachine<
  any,
  | XstateTreeMachineStateSchemaV1<AnyStateMachine, AnySelector, AnyActions>
  | XstateTreeMachineStateSchemaV2<AnyStateMachine, any, any>,
  any
>;

export type CanHandleEvent<TMachine extends AnyStateMachine> = (
  e: EventFrom<TMachine>
) => boolean;
export type Selectors<TMachine extends AnyStateMachine, TOut> = (args: {
  ctx: ContextFrom<TMachine>;
  canHandleEvent: CanHandleEvent<TMachine>;
  inState: MatchesFrom<TMachine>;
}) => TOut;
export type Actions<
  TMachine extends AnyStateMachine,
  TSelectorsOutput,
  TOut
> = (args: {
  send: InterpreterFrom<TMachine>["send"];
  selectors: TSelectorsOutput;
}) => TOut;
export type View<
  TActionsOutput,
  TSelectorsOutput,
  TSlots extends readonly Slot[]
> = React.ComponentType<{
  slots: Record<GetSlotNames<TSlots>, React.ComponentType>;
  actions: TActionsOutput;
  selectors: TSelectorsOutput;
}>;
export type V2BuilderMeta<
  TMachine extends AnyStateMachine,
  TSelectorsOutput = ContextFrom<TMachine>,
  TActionsOutput = Record<never, string>,
  TSlots extends readonly Slot[] = []
> = {
  selectors?: Selectors<TMachine, TSelectorsOutput>;
  actions?: Actions<TMachine, TSelectorsOutput, TActionsOutput>;
  slots?: TSlots;
  view: View<TActionsOutput, TSelectorsOutput, TSlots>;
};

export type XstateTreeMachineStateSchemaV2<
  TMachine extends AnyStateMachine,
  TSelectorsOutput = ContextFrom<TMachine>,
  TActionsOutput = Record<never, string>,
  TSlots extends readonly Slot[] = []
> = {
  meta: Required<
    V2BuilderMeta<TMachine, TSelectorsOutput, TActionsOutput, TSlots> & {
      builderVersion: 2;
    }
  >;
};
