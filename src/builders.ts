import type { AnyStateMachine, ContextFrom } from "xstate";

import { Slot } from "./slots";
import { V2BuilderMeta, XstateTreeMachine } from "./types";

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
): XstateTreeMachine<TMachine> {
  const selectors = options.selectors ?? (({ ctx }) => ctx);
  const actions = options.actions ?? (() => ({}));

  const machineWithMeta = machine as unknown as XstateTreeMachine<TMachine>;
  machineWithMeta._xstateTree = {
    selectors: selectors as any,
    actions: actions as any,
    View: options.View as any,
    slots: (options.slots ?? []) as any,
  };

  return machineWithMeta;
}
