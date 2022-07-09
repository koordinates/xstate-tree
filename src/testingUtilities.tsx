// ignore file coverage
import { useMachine } from "@xstate/react";
import { set, transform, isEqual, isObject, isNil } from "lodash";
import React, { JSXElementConstructor, useEffect, useState } from "react";
import { TinyEmitter } from "tiny-emitter";
import {
  EventObject,
  StateMachine,
  Typestate,
  State,
  createMachine,
} from "xstate";
import { initEvent } from "xstate/lib/actions";

import { buildXStateTreeMachine } from "./builders";
import { Slot } from "./slots";
import { XstateTreeMachineStateSchema, GlobalEvents, ViewProps } from "./types";
import { PropsOf } from "./utils";
import { emitter, recursivelySend, XstateTreeView } from "./xstateTree";

/**
 * @public
 */
export function slotTestingDummyFactory(name: string) {
  return buildXStateTreeMachine(
    createMachine({
      id: name,
      initial: "idle",
      states: {
        idle: {},
      },
    }),
    {
      actions: () => ({}),
      selectors: () => ({}),
      slots: [],
      view: () => (
        <div>
          <p>{name}</p>
        </div>
      ),
    }
  );
}

/**
 * @public
 */
export const genericSlotsTestingDummy = new Proxy(
  {},
  {
    get(_target, prop) {
      return () => (
        <div>
          <p>
            <>{prop}-slot</>
          </p>
        </div>
      );
    },
  }
) as any;

type InferViewProps<T> = T extends ViewProps<
  infer TSelectors,
  infer TActions,
  never,
  infer TStates
>
  ? {
      selectors: TSelectors;
      actions: TActions;
      inState: (state: TStates) => (state: TStates) => boolean;
    }
  : never;
/**
 * @public
 */
export function buildViewProps<
  C extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>
>(
  _view: C,
  props: Pick<InferViewProps<PropsOf<C>>, "actions" | "selectors">
): InferViewProps<PropsOf<C>> {
  return {
    ...props,
    inState: (testState: any) => (state: any) => state === testState,
  } as InferViewProps<PropsOf<C>>;
}

/**
 * @public
 *
 * Sets up a root component for use in an \@xstate/test model backed by \@testing-library/react for the component
 *
 * The logger argument should just be a simple function which forwards the arguments to console.log,
 * this is needed because Wallaby.js only displays console logs in tests that come from source code, not library code,
 * so any logs from inside this file don't show up in the test explorer
 *
 * The returned object has a `rootComponent` property and a function, `awaitTransition`, that returns a Promise
 * when called that is resolved the next time the underlying machine transitions. This can be used in the \@xstate/test
 * model to ensure after an event action is executed the test in the next state doesn't run until after the machine transitions
 *
 * It also delays for 5ms to ensure any React re-rendering happens in response to the state transition
 */
export function buildTestRootComponent<
  TContext,
  TEvent extends EventObject,
  TTypeState extends Typestate<TContext>,
  TSelectors,
  TActions,
  TSlots extends readonly Slot[]
>(
  machine: StateMachine<
    TContext,
    XstateTreeMachineStateSchema<
      TContext,
      TEvent,
      TTypeState,
      TSelectors,
      TActions,
      TSlots
    >,
    TEvent,
    TTypeState
  >,
  logger: typeof console.log
) {
  if (!machine.meta) {
    throw new Error("Root machine has no meta");
  }
  if (!machine.meta.view) {
    throw new Error("Root machine has no associated view");
  }
  const onChangeEmitter = new TinyEmitter();

  function addTransitionListener(listener: () => void) {
    onChangeEmitter.once("transition", listener);
  }

  return {
    rootComponent: function XstateTreeRootComponent() {
      const [_, __, interpreter] = useMachine(machine, { devTools: true });

      useEffect(() => {
        function handler(event: GlobalEvents) {
          recursivelySend(interpreter, event);
        }
        function changeHandler(ctx: TContext, oldCtx: TContext | undefined) {
          logger(
            "onChange: ",
            JSON.stringify(difference(ctx, oldCtx), null, 2)
          );
          onChangeEmitter.emit("changed", ctx);
        }
        function onEventHandler(e: any) {
          logger("onEvent", e);
        }
        function onTransitionHandler(s: any) {
          logger("State: ", s.value);
          onChangeEmitter.emit("transition");
        }

        interpreter.onChange(changeHandler);
        interpreter.onEvent(onEventHandler);
        interpreter.onTransition(onTransitionHandler);

        emitter.on("event", handler);

        return () => {
          emitter.off("event", handler);
          interpreter.off(changeHandler);
          interpreter.off(onEventHandler);
          interpreter.off(onTransitionHandler);
        };
      }, [interpreter]);

      if (!interpreter.initialized) {
        return null;
      }

      return <XstateTreeView interpreter={interpreter} />;
    },
    addTransitionListener,
    awaitTransition() {
      return new Promise<void>((res) => {
        addTransitionListener(() => {
          setTimeout(res, 50);
        });
      });
    },
  };
}

/**
 * Deep diff between two object, using lodash
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare with
 * @return {Object}        Return a new object who represent the diff
 */
function difference(object: any, base: any) {
  function changes(object: any, base: any) {
    return transform(object, function (result: any, value: any, key: any) {
      if (!isEqual(value, base[key])) {
        result[key] =
          isObject(value) && isObject(base[key])
            ? changes(value, base[key])
            : value;
      }
    });
  }

  if (isNil(base)) {
    return object;
  }

  return changes(object, base);
}

/**
 * @internal
 * Builds a root component for use in Storybook
 *
 * Pass in an initial state and context and the machine will start from that state
 *
 * This does _not_ work for any machines using slots, nothing will be invoked unless
 * it would be invoked by the state you have chosen the machine to start in
 *
 * XState will not run any invoke handlers for parent states or sibling states that
 * would be passed through if the machine was executing normally
 *
 * I have no solutions for this
 */
export function buildStorybookComponent<
  TContext,
  TEvent extends EventObject,
  TTypeState extends Typestate<TContext>,
  TSelectors,
  TActions,
  TSlots extends readonly Slot[]
>(
  machine: StateMachine<
    TContext,
    XstateTreeMachineStateSchema<
      TContext,
      TEvent,
      TTypeState,
      TSelectors,
      TActions,
      TSlots
    >,
    TEvent,
    TTypeState
  >,
  state: TTypeState["value"] = machine.initial as any,
  context: TContext = machine.context ?? ({} as any)
) {
  // `set` converts a state.like.this to a {state: { like: this {} } }
  const objectState = set({}, String(state), undefined);
  const startingState = new State<TContext, any>({
    value: objectState,
    context: context as TContext,
    _event: initEvent,
    _sessionid: null,
    historyValue: undefined,
    history: undefined,
    actions: [],
    activities: undefined,
    meta: undefined,
    events: [],
    configuration: [],
    transitions: [],
    children: {},
  });

  return function XstateTreeStorybookComponent() {
    const [_state, _send, interpreter] = useMachine(machine, {
      devTools: true,
      state: startingState,
    });
    const [_ignored, forceRender] = useState(0);

    useEffect(() => {
      function handler(event: GlobalEvents) {
        recursivelySend(interpreter, event);
      }

      emitter.on("event", handler);
      // Hack to get around the fact I'm not seeing it re-render after the
      // interpreter is initialized
      setTimeout(() => forceRender(1), 250);

      return () => {
        emitter.off("event", handler);
      };
    }, [interpreter]);

    if (!interpreter.initialized) {
      return null;
    }

    return <XstateTreeView interpreter={interpreter} />;
  };
}
