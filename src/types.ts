import { type History } from "history";
import React from "react";
import type {
  ActorRefFrom,
  AnyStateMachine,
  ContextFrom,
  EventFrom,
  IsNever,
  SnapshotFrom,
  StateValue,
} from "xstate";

import { Slot, GetSlotNames } from "./slots";

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

type Values<T> = T[keyof T];
type WithParentPath<
  TCurrent extends string,
  TParentPath extends string
> = `${TParentPath extends "" ? "" : `${TParentPath}.`}${TCurrent}`;

type ToStatePaths<
  TStateValue extends StateValue,
  TParentPath extends string = ""
> = TStateValue extends string
  ? WithParentPath<TStateValue, TParentPath>
  : IsNever<keyof TStateValue> extends true
  ? never
  :
      | WithParentPath<keyof TStateValue & string, TParentPath>
      | Values<{
          [K in keyof TStateValue & string]?: ToStatePaths<
            NonNullable<TStateValue[K]>,
            WithParentPath<K, TParentPath>
          >;
        }>;

/**
 * @internal
 */
export type MatchesFrom<T extends AnyStateMachine> = (
  value: ToStatePaths<SnapshotFrom<T>["value"]>
) => boolean;

/**
 * @internal
 */
export type XstateTreeMachineInjection<
  TMachine extends AnyStateMachine,
  TSelectorsOutput = ContextFrom<TMachine>,
  TActionsOutput = Record<never, string>,
  TSlots extends readonly Slot[] = Slot[]
> = {
  _xstateTree: XstateTreeMachineStateSchemaV2<
    TMachine,
    TSelectorsOutput,
    TActionsOutput,
    TSlots
  >;
};

/**
 * Repairs the return type of the `provide` function on XstateTreeMachines to correctly return
 * an XstateTreeMachine type instead of an xstate StateMachine
 */
type RepairProvideReturnType<
  T extends AnyStateMachine,
  TSelectorsOutput,
  TActionsOutput,
  TSlots extends readonly Slot[]
> = {
  [K in keyof T]: K extends "provide"
    ? (
        ...args: Parameters<T[K]>
      ) => XstateTreeMachine<T, TSelectorsOutput, TActionsOutput, TSlots>
    : T[K];
};

/**
 * @public
 */
export type XstateTreeMachine<
  TMachine extends AnyStateMachine,
  TSelectorsOutput = ContextFrom<TMachine>,
  TActionsOutput = Record<never, string>,
  TSlots extends readonly Slot[] = Slot[]
> = RepairProvideReturnType<
  TMachine,
  TSelectorsOutput,
  TActionsOutput,
  TSlots
> &
  XstateTreeMachineInjection<
    TMachine,
    TSelectorsOutput,
    TActionsOutput,
    TSlots
  >;

/**
 * @public
 */
export type AnyXstateTreeMachine = XstateTreeMachine<
  AnyStateMachine,
  any,
  any,
  any[]
>;
/**
 * @internal
 */
export type CanHandleEvent<TMachine extends AnyStateMachine> = (
  e: EventFrom<TMachine>
) => boolean;

/**
 * @public
 */
export type Selectors<TMachine extends AnyStateMachine, TOut> = (args: {
  ctx: ContextFrom<TMachine>;
  canHandleEvent: CanHandleEvent<TMachine>;
  inState: MatchesFrom<TMachine>;
  meta?: unknown;
}) => TOut;

/**
 * @public
 */
export type Actions<
  TMachine extends AnyStateMachine,
  TSelectorsOutput,
  TOut
> = (args: {
  send: ActorRefFrom<TMachine>["send"];
  selectors: TSelectorsOutput;
}) => TOut;

/**
 * @public
 */
export type View<
  TActionsOutput,
  TSelectorsOutput,
  TSlots extends readonly Slot[]
> = React.ComponentType<{
  slots: Record<GetSlotNames<TSlots>, React.ComponentType>;
  actions: TActionsOutput;
  selectors: TSelectorsOutput;
}>;

/**
 * @public
 */
export type V2BuilderMeta<
  TMachine extends AnyStateMachine,
  TSelectorsOutput = ContextFrom<TMachine>,
  TActionsOutput = Record<never, string>,
  TSlots extends readonly Slot[] = Slot[]
> = {
  selectors?: Selectors<TMachine, TSelectorsOutput>;
  actions?: Actions<TMachine, TSelectorsOutput, TActionsOutput>;
  slots?: TSlots;
  View: View<TActionsOutput, TSelectorsOutput, TSlots>;
};

/**
 * @public
 */
export type XstateTreeMachineStateSchemaV2<
  TMachine extends AnyStateMachine,
  TSelectorsOutput = ContextFrom<TMachine>,
  TActionsOutput = Record<never, string>,
  TSlots extends readonly Slot[] = Slot[]
> = Required<V2BuilderMeta<TMachine, TSelectorsOutput, TActionsOutput, TSlots>>;

/**
 * @public
 *
 * Retrieves the selector return type from the xstate-tree machine
 */
export type SelectorsFrom<TMachine extends AnyXstateTreeMachine> =
  TMachine["_xstateTree"] extends XstateTreeMachineStateSchemaV2<
    any,
    infer TOut,
    any,
    any
  >
    ? TOut
    : never;

/**
 * @public
 *
 * Retrieves the actions return type from the xstate-tree machine
 */
export type ActionsFrom<TMachine extends AnyXstateTreeMachine> =
  TMachine["_xstateTree"] extends XstateTreeMachineStateSchemaV2<
    any,
    any,
    infer TOut,
    any
  >
    ? TOut
    : never;
